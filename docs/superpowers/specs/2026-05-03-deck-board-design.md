# 덱 공유 게시판 — 설계

작성일: 2026-05-03
대상 프로젝트: Holo (Hololive TCG 덱 빌더, Vite + React + TS + Zustand)

## 1. 목표

기존 덱 빌더에 익명 비밀번호 기반 덱 공유 게시판을 추가한다. 사용자는 자기 덱을 게시판에 업로드하고, 다른 사용자가 올린 덱을 게시판에서 보고 자기 빌더로 불러올 수 있다.

비목표:
- 댓글, 좋아요, 신고
- 게시글 수정 (삭제만 지원)
- 회원가입/로그인 (익명 + 비번)
- 게시글 단일 상세 페이지 (목록 내 아코디언으로 모든 내용 노출)

## 2. 핵심 결정 사항

| 항목 | 결정 |
|---|---|
| 백엔드 | Supabase (Postgres + 자동 REST + RPC) |
| 라우팅 | `react-router-dom` 도입, `/`(빌더) / `/board`(게시판) |
| 비밀번호 용도 | 게시글 삭제 전용 (수정 없음) |
| 비밀번호 처리 | 클라이언트 bcryptjs 해시 → DB 저장, 삭제 시 pgcrypto `crypt()` 비교 |
| 목록 UI | 아코디언 (헤더만 노출 → 클릭 시 그 자리에서 펼침) |
| 펼친 본문 | 오시 큰 이미지(왼쪽) + 메인덱 카드 그리드(중복 묶음 + 매수 뱃지) |
| 카드 데이터 | 클라이언트 `CARDS` 사용, DB는 cardId+count만 저장 |
| 정렬 | 최신순 고정 (`created_at desc`) |
| 페이지네이션 | 페이지 번호 방식, 페이지당 20개 |
| 불러오기 | 새 덱으로 추가 (현재 덱 보존) |

## 3. 아키텍처 개요

```
[Browser]
  ├─ React Router
  │    /        → BuilderPage   (현재 App 본문)
  │    /board   → BoardPage
  ├─ Zustand store (decks, activeDeckId)
  ├─ Supabase JS client (anon key)
  └─ bcryptjs (클라이언트 해시)

[Supabase]
  ├─ Postgres
  │    └─ deck_posts 테이블
  ├─ pgcrypto extension (crypt 함수)
  └─ RPC: delete_deck_post(post_id, password) → boolean
```

## 4. 데이터 스키마

### 4.1 테이블

```sql
create extension if not exists pgcrypto;

create table deck_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text not null default '익명',
  password_hash   text not null,
  oshi_card_id    text not null,
  main_deck       jsonb not null,                    -- [{cardId: string, count: int}, ...]
  cheers          jsonb not null default '{}'::jsonb, -- {white: int, ...}
  created_at      timestamptz not null default now()
);

create index deck_posts_created_at_idx on deck_posts (created_at desc);
```

### 4.2 main_deck JSON 형식 예시
```json
[
  { "cardId": "hBP04-027", "count": 4 },
  { "cardId": "hBP08-002", "count": 2 },
  ...
]
```
순서는 클라이언트 `Deck.mainDeck` 배열의 등록 순서를 그대로 유지한다.

### 4.3 RLS 정책

```sql
alter table deck_posts enable row level security;

-- 누구나 SELECT 가능 (단, 클라이언트는 password_hash 컬럼을 select하지 않는다)
create policy "deck_posts_select_all"
  on deck_posts for select
  to anon, authenticated
  using (true);

-- 누구나 INSERT 가능
create policy "deck_posts_insert_all"
  on deck_posts for insert
  to anon, authenticated
  with check (true);

-- 직접 DELETE/UPDATE 차단 → RPC 경유만 허용
-- (정책을 만들지 않으면 RLS 활성화 상태에서 차단됨)
```

추가 안전책: anon role에 대해 `password_hash` 컬럼 SELECT 권한 회수.
```sql
revoke select (password_hash) on deck_posts from anon, authenticated;
```

### 4.4 RPC: 삭제

```sql
create or replace function delete_deck_post(post_id uuid, password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from deck_posts where id = post_id;
  if stored_hash is null then
    return false;
  end if;

  -- bcryptjs 해시는 pgcrypto crypt()와 호환 (같은 bcrypt 표준)
  if crypt(password, stored_hash) = stored_hash then
    delete from deck_posts where id = post_id;
    return true;
  end if;

  return false;
end;
$$;

grant execute on function delete_deck_post(uuid, text) to anon, authenticated;
```

## 5. 클라이언트 변경

### 5.1 신규 의존성
- `@supabase/supabase-js`
- `react-router-dom`
- `bcryptjs` + `@types/bcryptjs`

### 5.2 신규 파일
```
src/
  lib/
    supabase.ts                 # createClient 인스턴스 (env 기반)
  api/
    deckPosts.ts                # listPosts(page) / createPost(...) / deletePost(id, pw)
  utils/
    deckSnapshot.ts             # Deck → DeckSnapshot, snapshot → Deck
    password.ts                 # hashPassword(pw) / (참고) compare는 서버 RPC가 담당
  pages/
    BuilderPage.tsx             # 현재 App.tsx 본문 이동
    BoardPage.tsx               # 게시판
  components/
    SharePostDialog.tsx         # 업로드 다이얼로그
    DeletePostDialog.tsx        # 삭제 시 비번 입력
    PostListItem.tsx            # 아코디언 헤더 + 펼친 본문
    PostDeckView.tsx            # 오시 + 덱 그리드 (매수 표시)
    Pagination.tsx              # 페이지 번호 네비
    AppHeader.tsx               # 빌더/게시판 토글 (선택)
  router.tsx                    # createBrowserRouter 설정
```

### 5.3 변경 파일
- `src/main.tsx` — `RouterProvider`로 감싸기
- `src/App.tsx` — 풀 레이아웃을 `BuilderPage`로 이동 (Outlet 미사용, 페이지 단위 분리)
- `src/components/DeckPanel.tsx` — 하단에 "덱 공유하기" 버튼 추가, 클릭 시 `SharePostDialog` 오픈
- `src/store/deckStore.ts` — `createDeckFromSnapshot(name, snapshot)` 액션 추가
  - 새 덱 생성 후 oshi/cheers/메인덱 채우고 active로 설정
  - 누락 cardId 개수를 반환 (toast용)

### 5.4 타입 정의 (요약)

```ts
// src/types/deckPost.ts
export interface DeckSnapshot {
  oshiCardId: string;
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
}

export interface DeckPost {
  id: string;
  title: string;
  author: string;
  oshiCardId: string;
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
  createdAt: string;       // ISO
}

export interface CreatePostInput {
  title: string;
  author: string;          // 빈값/공백이면 '익명'으로 변환
  password: string;        // 평문 (해시는 호출 측에서)
  snapshot: DeckSnapshot;
}
```

## 6. 사용자 플로우

### 6.1 업로드
1. 빌더에서 덱 패널 하단 **"덱 공유하기"** 버튼 클릭
   - 덱 에러 (`getDeckErrors().length > 0`) 시 비활성화 + 툴팁
2. `SharePostDialog` 모달 오픈
   - 입력: 제목 (1~50자), 작성자 (기본 "익명", 1~20자), 비밀번호 (4자 이상)
   - "공유하기" 버튼은 위 검증 통과 시 활성화
3. 클라이언트:
   - `bcrypt.hash(password, 10)` → password_hash
   - `Deck` → `DeckSnapshot` 변환
   - `supabase.from('deck_posts').insert(...)` 호출
4. 성공 시 다이얼로그 닫고 토스트("게시판에 업로드되었습니다.")
5. 실패 시 다이얼로그 안에 에러 메시지 표시 (재시도 가능)

### 6.2 게시판 보기 (`/board`)
- URL 쿼리 파라미터로 페이지 관리: `/board?page=2`
- 페이지 진입 시 `select count` (또는 `head: true, count: 'exact'`) + 해당 페이지 데이터 fetch
- 리스트 (페이지당 20개, 최신순):
  - **헤더 (한 줄)**:
    - 좌: 오시 카드 작은 썸네일 (CARDS lookup, 누락 시 placeholder)
    - 중: 제목 (굵게) / 작성자 / 작성일 (YYYY-MM-DD HH:mm)
    - 우: 펼침 화살표 + "삭제" 버튼
  - **펼친 본문 (클릭 시 같은 자리에서 확장)**:
    - 좌: 오시 카드 큰 이미지
    - 우: 메인덱 그리드 (자동 줄바꿈, 동일 cardId 묶음, 우상단에 매수 뱃지 `×N`)
    - 하단: 엘 덱(치어) 색상별 매수 (있을 때만)
    - 우측 끝/하단: **"내 덱으로 불러오기"** 버튼
- 하단: 페이지 번호 네비 (이전/다음 + 번호)
- 빈 상태: "아직 공유된 덱이 없습니다."

### 6.3 내 덱으로 불러오기
1. 펼친 게시글의 "내 덱으로 불러오기" 클릭
2. 확인 다이얼로그: "「{제목}」을(를) 새 덱으로 추가합니다." [취소 / 추가]
3. snapshot의 cardId를 `CARDS`에서 lookup
   - 매칭된 카드만으로 새 Deck 구성
   - 누락 카드 수가 0보다 크면 `missing` 카운트 보유
4. `createDeckFromSnapshot(deckName, snapshot)` 호출 → activeDeckId 설정
5. `navigate('/')`로 빌더로 이동
6. 토스트: 누락이 없으면 "덱이 추가되었습니다.", 있으면 "덱이 추가되었습니다. (X장 카드를 불러오지 못했습니다)"

### 6.4 삭제
1. 헤더의 "삭제" 버튼 클릭 → `DeletePostDialog` 오픈
2. 비밀번호 입력 → "삭제" 클릭
3. `supabase.rpc('delete_deck_post', { post_id, password })` 호출
4. 반환 `true` → 다이얼로그 닫고 목록 다시 fetch + 토스트("삭제되었습니다.")
5. 반환 `false` → 다이얼로그 안에 "비밀번호가 일치하지 않습니다." 메시지

## 7. 보안

- 비번은 클라이언트에서 bcryptjs로 해시 후 INSERT (네트워크 평문 전송은 HTTPS 의존, 서버 측 저장은 해시).
- `password_hash` 컬럼은 anon에 SELECT 권한 회수 → 클라이언트가 hash 조회 불가.
- DELETE는 RLS로 직접 차단, RPC `delete_deck_post`만 허용.
- RPC는 `security definer` + `pgcrypto.crypt()`로 비번 비교 → 일치 시에만 삭제.
- Anon key는 빌드에 포함되며 공개되어도 RLS로 보호되는 작업만 노출됨.

남은 위험:
- 스팸/봇 업로드: 1차 릴리즈에서는 미대응. 필요시 추후 Cloudflare Turnstile 등 추가.
- 부적절한 게시물 신고 기능 없음 → 운영자가 Supabase 콘솔에서 직접 삭제 가정.

## 8. 누락 카드 / 데이터 불일치 처리

업로드 시점의 cardId가 클라이언트의 `CARDS`에 없는 경우:
- **게시판 표시**: placeholder 카드 ("카드 없음" 텍스트 + 매수 뱃지)
- **불러오기**: 해당 카드 스킵, 토스트로 "X장 카드를 불러오지 못했습니다." 안내
- **오시가 누락**: 헤더에 placeholder 썸네일, 펼침 본문에 안내 문구. 불러오기 시 oshi 없이 추가 (deck error로 잡힘).

## 9. 모바일 레이아웃

- **헤더**: 작은 썸네일(고정 폭) + (제목/작성자/날짜 stacked, 줄바꿈)
- **펼친 본문**: column 레이아웃 — 오시 위, 덱 그리드 아래 (자동 줄바꿈, 4~5열)
- **다이얼로그**: 화면 폭 90% 이내, 키보드 노출 시 스크롤 보장

## 10. 환경변수 / 셋업

`.env.local` (gitignored):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

사용자가 한 번 직접 수행해야 하는 셋업 (README 또는 별도 SETUP 문서로 가이드):
1. https://supabase.com 에서 새 프로젝트 생성
2. SQL Editor에서 본 문서 §4의 SQL 실행 (4.1 테이블 → 4.3 RLS 정책/권한 회수 → 4.4 RPC 함수)
3. Project Settings → API에서 URL과 anon key 복사
4. 프로젝트 루트에 `.env.local` 작성

## 11. 테스트 / 검증 전략

수동 검증 시나리오 (1차 릴리즈 기준):
- 정상 덱 업로드 → 게시판에서 내 글 노출
- 펼치기/접기 동작
- 동일 덱을 새 덱으로 불러오기 (덱 비었을 때 / 차있을 때)
- 비번 일치 → 삭제 성공, 불일치 → 에러
- 페이지 1, 2, 마지막 페이지 이동
- 빈 게시판 상태
- 누락 카드 시뮬레이션 (cards.ts에서 임의 카드 삭제)
- 모바일 (`<md`) 레이아웃 확인

## 12. 범위 외 (향후 고려)

- 댓글/좋아요/신고
- 검색·필터 (오시별, 색별, 작성자별)
- 게시글 수정
- OG 이미지 자동 생성 (소셜 공유용)
- 즐겨찾기 / 북마크
- 운영자 페이지
