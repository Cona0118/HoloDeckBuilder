# 덱 공유 게시판 추천(좋아요) 기능 설계

작성일: 2026-05-26
범위: 덱 공유 게시판(`/board`)에 추천(👍) 기능 추가. 페이징(20개/페이지)은 이미 구현되어 있어 변경 없음.

## 목표

- 게시글 상세(펼친 영역)에서 추천/취소 가능한 토글 버튼 제공.
- 목록 행에 추천수를 작게 노출.
- 정렬 토글로 `최신순` ⇄ `추천순` 전환.
- 로그인 없는 구조이므로 클라이언트 localStorage로 중복 추천을 차단.

## Non-goals

- 페이징 동작/스타일 변경.
- IP/계정 단위 엄격한 unique 추천 보장(브라우저 단위로만 차단).
- 댓글 또는 다른 게시판 기능.
- 기존 게시글 마이그레이션 외 추가 데이터 백필.

## 데이터 모델

### Supabase 테이블 변경

`deck_posts`에 컬럼 추가:

```sql
alter table public.deck_posts
  add column recommend_count integer not null default 0;
```

기존 row는 default 0으로 자동 채워짐.

### RPC 2개

원자적 증감과 RLS 우회를 위해 SECURITY DEFINER RPC 사용.

```sql
create or replace function public.increment_deck_post_recommends(post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.deck_posts
    set recommend_count = recommend_count + 1
    where id = post_id
    returning recommend_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function public.decrement_deck_post_recommends(post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.deck_posts
    set recommend_count = greatest(0, recommend_count - 1)
    where id = post_id
    returning recommend_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_deck_post_recommends(uuid) to anon, authenticated;
grant execute on function public.decrement_deck_post_recommends(uuid) to anon, authenticated;
```

## 클라이언트 식별

`src/utils/recommendStorage.ts` (신규):

- 키: `holo:recommended-posts`
- 값: 추천한 게시글 ID 배열(JSON 문자열)
- API:
  - `getRecommendedSet(): Set<string>` — 파싱 실패 시 빈 Set 반환
  - `hasRecommended(postId: string): boolean`
  - `addRecommended(postId: string): void`
  - `removeRecommended(postId: string): void`

쓰기 시 SSR-safe 가드(`typeof window !== 'undefined'`) 불필요 — 클라 전용 Vite 앱이지만 안전을 위해 try/catch만 둠.

## 타입 변경 (`src/types/deckPost.ts`)

```ts
export interface DeckPost {
  // ... 기존 필드
  recommendCount: number;
}
```

`DeckSnapshot`, `CreatePostInput`은 변경 없음(서버에서 default 0).

## API 변경 (`src/api/deckPosts.ts`)

### `DbDeckPost` 인터페이스
- `recommend_count: number | null` 추가.

### `SELECT_COLUMNS`
- `recommend_count` 컬럼 추가.

### `toDeckPost`
- `recommendCount: row.recommend_count ?? 0` 매핑.

### `ListPostsFilter`
- `sort?: 'recent' | 'popular'` 추가(기본값 `recent`).

### `listDeckPosts`
- `sort === 'popular'` 일 때:
  - `.order('recommend_count', { ascending: false })`
  - `.order('created_at', { ascending: false })` (동일 추천수 내 최신 우선)
- 그 외에는 기존 `created_at desc` 유지.

### 신규 함수

```ts
export async function recommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'increment_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export async function unrecommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'decrement_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
```

## UI 변경

### `src/pages/BoardPage.tsx`

- URL 파라미터 `sort` 추가. 값 `popular` 일 때만 추천순. 그 외에는 최신순 기본.
- `filter` useMemo에 `sort` 포함.
- 정렬 변경 시 `page` 파라미터 삭제(첫 페이지로 리셋).
- 헤더 영역(입상덱 토글 옆)에 정렬 토글 버튼:
  - 라벨: 현재 `최신순`이면 "🕒 최신순" / `추천순`이면 "👍 추천순"
  - 클릭 시 토글 + URL 갱신.
- 다른 동작(필터, 페이징, 삭제, 불러오기)은 그대로.

### `src/components/PostListItem.tsx`

- 헤더 행(접힌 상태)에 추천수 칩 표시 — 작성자/날짜 컬럼 좌측에 작게 `👍 12`.
  - 0인 경우 칩 자체를 숨김(레이아웃 노이즈 감소).
- 펼친 영역의 액션 바(현재 "내 덱으로 불러오기" 버튼 영역)에 추천 토글 버튼 추가:
  - 미추천: `👍 추천` (회색 보더)
  - 추천: `👍 추천됨 · 취소` (강조 색)
  - 카운트는 버튼 옆에 같이 노출: `👍 추천 (12)`
- 컴포넌트 내부 state: `recommendCount`, `recommended` (초기값 props.post.recommendCount, recommendStorage 조회 결과).
- 클릭 핸들러: 낙관적 업데이트 → RPC 호출 → 실패 시 롤백 + 사용자에게 `alert` 또는 console 경고.
- 클릭 도중 중복 호출 방지를 위한 `pending` boolean state.

### 정렬 토글의 시각 위치

```
[제목 검색 🔍] [🏆 입상덱만] [🕒 최신순 ⇄ 👍 추천순] ......  [← 빌더]
```

## 데이터 흐름

```
사용자 → PostListItem 추천 버튼 클릭
  ↓ (낙관적: count +1, recommended = true)
recommendDeckPost(postId)
  ↓ supabase.rpc('increment_deck_post_recommends')
서버 → recommend_count UPDATE → 새 값 반환
  ↓
응답 카운트로 state 갱신 (서버 권위 값)
localStorage 'holo:recommended-posts'에 postId 추가
```

실패 경로: 낙관적 변경 롤백 + 사용자 알림. localStorage는 RPC 성공 후에만 갱신.

## 에러 처리

- RPC 실패: 낙관적 변경 롤백, `alert` 또는 토스트(현재 프로젝트 패턴에 맞춰 alert).
- localStorage 접근 실패(Safari 프라이빗 등): try/catch로 무시, 추천은 가능하나 새로고침 후 toggle 상태 잃을 수 있음.
- 정렬 파라미터 검증: `sort` 값이 `popular` 외엔 모두 `recent` 처리.

## 테스트 계획

수동 테스트(이 프로젝트는 자동 테스트가 없는 것으로 보임):

1. 빈 게시글에서 마이그레이션 후 `recommendCount === 0`으로 로드되는지.
2. 추천 버튼 클릭 → 카운트 +1, 새로고침 후 상태 유지(localStorage), 카운트도 유지.
3. 다시 클릭 → 카운트 -1, 미추천 상태로 복귀.
4. 시크릿 모드에서 같은 글 다시 추천 가능(예상 동작).
5. 정렬 토글: 추천순 정렬 시 카운트 내림차순, 동률은 최신순.
6. 정렬 + 오시 필터 + 입상덱 동시 적용.
7. 페이지 2로 이동 후 정렬 변경 시 페이지 1로 리셋.
8. RPC 실패 시뮬레이션(네트워크 끔) → 롤백.

## 마이그레이션 절차

1. Supabase 대시보드에서 위 SQL 실행 순서:
   - 컬럼 추가
   - RPC 2개 정의
   - GRANT
2. 클라이언트 배포 → 신규 컬럼/RPC 사용.

빌드는 컬럼이 없어도 select에서 null 허용 처리로 호환되지만, 정렬 RPC가 없으면 추천 자체가 에러를 던지므로 **DB 마이그레이션 → 배포** 순서를 지킨다.

## YAGNI로 의도적으로 빼는 것

- 게시글 ID별 추천 이력 테이블, IP 해시 unique constraint.
- 실시간 카운트 동기화(supabase realtime).
- 인기 게시글 강조 배지("HOT" 등).
- 추천 취소 시 토스트 알림 같은 폴리시.

위 항목은 첫 릴리즈 후 필요 시점에 별도 스펙으로 다룸.
