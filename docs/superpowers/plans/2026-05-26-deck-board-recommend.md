# 덱 공유 게시판 추천 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 덱 공유 게시판(`/board`)에 추천(👍) 기능과 정렬 토글(최신순/추천순) 추가.

**Architecture:** Supabase `deck_posts`에 `recommend_count` 컬럼과 RPC 2개를 추가. 클라이언트는 localStorage로 중복 추천을 차단. UI는 BoardPage에 정렬 토글, PostListItem 접힌 행에 카운트 칩과 펼친 액션 바에 추천 토글 버튼.

**Tech Stack:** Vite + React + TypeScript, Tailwind v4, Zustand, Supabase JS client, react-router-dom v6.

**Spec:** [docs/superpowers/specs/2026-05-26-deck-board-recommend-design.md](../specs/2026-05-26-deck-board-recommend-design.md)

**Verification:** 이 프로젝트는 자동 테스트가 없으므로 각 작업 후 `npm run build`(타입+빌드 통과) 및 작업별 수동 스모크 테스트로 확인한다.

---

## File Plan

| File | Action | Responsibility |
|---|---|---|
| Supabase (DB) | 마이그레이션 SQL 실행 | `recommend_count` 컬럼 + 증감 RPC 정의 |
| `src/types/deckPost.ts` | 수정 | `DeckPost.recommendCount` 추가 |
| `src/utils/recommendStorage.ts` | 신규 | localStorage 헬퍼(`has/add/remove`) |
| `src/api/deckPosts.ts` | 수정 | select 컬럼, 정렬, RPC 래퍼 |
| `src/pages/BoardPage.tsx` | 수정 | 정렬 토글 URL 파라미터 + 버튼 |
| `src/components/PostListItem.tsx` | 수정 | 접힌 행 카운트 칩 + 펼친 추천 버튼 |

---

### Task 1: Supabase 마이그레이션

**Files:**
- DB (Supabase 콘솔 SQL 에디터에서 실행)

- [ ] **Step 1: 컬럼 추가**

다음 SQL을 Supabase SQL 에디터에서 실행:

```sql
alter table public.deck_posts
  add column recommend_count integer not null default 0;
```

기존 row는 0으로 자동 채워진다.

- [ ] **Step 2: 증가 RPC 정의**

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
```

- [ ] **Step 3: 감소 RPC 정의**

```sql
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
```

- [ ] **Step 4: 권한 부여**

```sql
grant execute on function public.increment_deck_post_recommends(uuid) to anon, authenticated;
grant execute on function public.decrement_deck_post_recommends(uuid) to anon, authenticated;
```

- [ ] **Step 5: 수동 스모크 확인**

Supabase SQL 에디터에서:

```sql
-- 임의 post id로 호출하여 1, 2 반환되는지 확인
select public.increment_deck_post_recommends(
  (select id from public.deck_posts limit 1)
);
select public.increment_deck_post_recommends(
  (select id from public.deck_posts limit 1)
);
-- 감소
select public.decrement_deck_post_recommends(
  (select id from public.deck_posts limit 1)
);
-- 다시 0으로 되돌림
select public.decrement_deck_post_recommends(
  (select id from public.deck_posts limit 1)
);
-- recommend_count = 0 인지 확인
select id, recommend_count from public.deck_posts limit 5;
```

- [ ] **Step 6: 커밋 없음**

DB 변경은 코드 변경이 아니므로 커밋하지 않는다. 다음 태스크에서 클라이언트 변경과 함께 커밋.

---

### Task 2: 타입 확장

**Files:**
- Modify: `src/types/deckPost.ts`

- [ ] **Step 1: `DeckPost`에 `recommendCount` 필드 추가**

`src/types/deckPost.ts`의 `DeckPost` 인터페이스 끝, `createdAt` 위 또는 아래에 추가:

```ts
export interface DeckPost {
  id: string;
  title: string;
  author: string;
  oshiCardId: string;
  oshiImageUrl?: string;
  mainDeck: Array<{ cardId: string; count: number; imageUrl?: string }>;
  cheers: Partial<Record<CardColor, number>>;
  isAward: boolean;
  tournamentName: string | null;
  recommendCount: number;
  createdAt: string;
}
```

`DeckSnapshot`, `CreatePostInput`은 변경하지 않는다(서버에서 default 0으로 처리).

- [ ] **Step 2: `npm run build`로 타입 검증**

Run: `npm run build`
Expected: 이 시점에서 `src/api/deckPosts.ts`의 `toDeckPost`가 `recommendCount`를 반환하지 않아 타입 에러 발생. 다음 태스크에서 해결.

- [ ] **Step 3: 단독 커밋 없음**

다음 태스크와 함께 커밋한다(API와 타입은 한 단위).

---

### Task 3: localStorage 헬퍼

**Files:**
- Create: `src/utils/recommendStorage.ts`

- [ ] **Step 1: 파일 작성**

```ts
const STORAGE_KEY = 'holo:recommended-posts';

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Safari 프라이빗 모드 등: 무시
  }
}

export function getRecommendedSet(): Set<string> {
  return readSet();
}

export function hasRecommended(postId: string): boolean {
  return readSet().has(postId);
}

export function addRecommended(postId: string): void {
  const set = readSet();
  set.add(postId);
  writeSet(set);
}

export function removeRecommended(postId: string): void {
  const set = readSet();
  set.delete(postId);
  writeSet(set);
}
```

- [ ] **Step 2: 브라우저 콘솔 스모크 테스트(선택)**

dev 서버가 떠 있으면 콘솔에서:

```js
localStorage.setItem('holo:recommended-posts', JSON.stringify(['abc']));
// 헬퍼를 import한 화면에서 has가 true 반환되는지 확인
```

스킵해도 무방. 빌드가 통과하는지가 1차.

- [ ] **Step 3: 커밋 없음 (다음 태스크와 묶음)**

---

### Task 4: API – select 컬럼, 매핑, 정렬

**Files:**
- Modify: `src/api/deckPosts.ts`

- [ ] **Step 1: `DbDeckPost`에 컬럼 추가**

`src/api/deckPosts.ts`의 `DbDeckPost` 인터페이스를 다음과 같이 수정:

```ts
interface DbDeckPost {
  id: string;
  title: string;
  author: string;
  oshi_card_id: string;
  oshi_image_url: string | null;
  main_deck: Array<{ cardId: string; count: number; imageUrl?: string }>;
  cheers: Record<string, number>;
  is_award: boolean | null;
  tournament_name: string | null;
  recommend_count: number | null;
  created_at: string;
}
```

- [ ] **Step 2: `SELECT_COLUMNS`에 컬럼 추가**

기존:

```ts
const SELECT_COLUMNS =
  'id, title, author, oshi_card_id, oshi_image_url, main_deck, cheers, is_award, tournament_name, created_at';
```

→

```ts
const SELECT_COLUMNS =
  'id, title, author, oshi_card_id, oshi_image_url, main_deck, cheers, is_award, tournament_name, recommend_count, created_at';
```

- [ ] **Step 3: `toDeckPost`에 매핑 추가**

```ts
function toDeckPost(row: DbDeckPost): DeckPost {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    oshiCardId: row.oshi_card_id,
    oshiImageUrl: row.oshi_image_url ?? undefined,
    mainDeck: row.main_deck ?? [],
    cheers: (row.cheers ?? {}) as DeckPost['cheers'],
    isAward: row.is_award ?? false,
    tournamentName: row.tournament_name ?? null,
    recommendCount: row.recommend_count ?? 0,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 4: `ListPostsFilter`에 `sort` 필드 추가**

```ts
export interface ListPostsFilter {
  oshiCardId?: string;
  containsCardId?: string;
  awardOnly?: boolean;
  sort?: 'recent' | 'popular';
}
```

- [ ] **Step 5: `listDeckPosts`의 정렬 분기 적용**

기존 `query` 빌더에서 `.order('created_at', { ascending: false }).range(from, to)` 부분을 정렬 분기로 교체:

```ts
const sort = filter?.sort === 'popular' ? 'popular' : 'recent';

let ordered = query;
if (sort === 'popular') {
  ordered = ordered.order('recommend_count', { ascending: false });
}
ordered = ordered.order('created_at', { ascending: false });

const { data, count, error } = await ordered.range(from, to);
```

이 변경은 다음 위치에 들어간다: 기존 `awardOnly` if 블록 바로 다음, 기존 `const { data, count, error } = await query.order(...).range(...)` 호출을 위 코드로 통째로 교체.

- [ ] **Step 6: 빌드 검증**

Run: `npm run build`
Expected: 타입 에러 없이 통과. (PostListItem 등은 아직 `recommendCount`를 참조하지 않으므로 OK.)

- [ ] **Step 7: 커밋 없음 (Task 5와 함께)**

---

### Task 5: API – 추천/취소 RPC 래퍼

**Files:**
- Modify: `src/api/deckPosts.ts`

- [ ] **Step 1: 두 함수 추가**

파일 끝의 `export { PAGE_SIZE };` 바로 위(혹은 `deleteDeckPost` 다음)에 추가:

```ts
/** 추천 +1, 새 카운트 반환. */
export async function recommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'increment_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** 추천 -1 (0 이하로 내려가지 않음), 새 카운트 반환. */
export async function unrecommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'decrement_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 3: 커밋**

```bash
git add src/types/deckPost.ts src/utils/recommendStorage.ts src/api/deckPosts.ts
git commit -m "feat(board): add recommend count field, sort, RPC wrappers"
```

---

### Task 6: BoardPage 정렬 토글

**Files:**
- Modify: `src/pages/BoardPage.tsx`

- [ ] **Step 1: URL에서 `sort` 읽기**

`params.get('page')` 옆에 `sort` 파싱 추가. 기존:

```ts
const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
const oshiFilter = params.get('oshi') ?? '';
const containsFilter = params.get('card') ?? '';
const awardOnly = params.get('award') === '1';
```

→ 아래 줄을 `awardOnly` 다음에 추가:

```ts
const sort: 'recent' | 'popular' =
  params.get('sort') === 'popular' ? 'popular' : 'recent';
```

- [ ] **Step 2: `filter` useMemo에 sort 포함**

기존 useMemo:

```ts
const filter: ListPostsFilter = useMemo(() => {
  const f: ListPostsFilter = {};
  if (oshiFilter) f.oshiCardId = oshiFilter;
  else if (containsFilter) f.containsCardId = containsFilter;
  if (awardOnly) f.awardOnly = true;
  return f;
}, [oshiFilter, containsFilter, awardOnly]);
```

→

```ts
const filter: ListPostsFilter = useMemo(() => {
  const f: ListPostsFilter = {};
  if (oshiFilter) f.oshiCardId = oshiFilter;
  else if (containsFilter) f.containsCardId = containsFilter;
  if (awardOnly) f.awardOnly = true;
  f.sort = sort;
  return f;
}, [oshiFilter, containsFilter, awardOnly, sort]);
```

- [ ] **Step 3: 정렬 토글 핸들러 추가**

`toggleAwardOnly` 함수 바로 다음에 추가:

```ts
function toggleSort() {
  const next = new URLSearchParams(params);
  next.delete('page');
  if (sort === 'popular') next.delete('sort');
  else next.set('sort', 'popular');
  setParams(next, { replace: false });
  window.scrollTo({ top: 0 });
}
```

- [ ] **Step 4: 정렬 토글 버튼 렌더링**

기존 입상덱 토글 버튼:

```tsx
<button
  onClick={toggleAwardOnly}
  aria-pressed={awardOnly}
  title={awardOnly ? '입상덱 필터 해제' : '입상덱만 보기'}
  className={
    'h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium border transition-colors ' +
    (awardOnly
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 hover:bg-amber-500/30'
      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700')
  }
>
  <span aria-hidden>🏆</span>
  <span>입상덱만</span>
</button>
```

이 버튼 바로 다음(`</button>` 다음 줄)에 정렬 토글 버튼 추가:

```tsx
<button
  onClick={toggleSort}
  aria-pressed={sort === 'popular'}
  title={sort === 'popular' ? '최신순으로 정렬' : '추천순으로 정렬'}
  className={
    'h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium border transition-colors ' +
    (sort === 'popular'
      ? 'bg-pink-500/20 text-pink-200 border-pink-500/60 hover:bg-pink-500/30'
      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700')
  }
>
  <span aria-hidden>{sort === 'popular' ? '👍' : '🕒'}</span>
  <span>{sort === 'popular' ? '추천순' : '최신순'}</span>
</button>
```

- [ ] **Step 5: 빌드 검증**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/BoardPage.tsx
git commit -m "feat(board): add recent/popular sort toggle"
```

---

### Task 7: PostListItem 추천 칩 + 토글 버튼

**Files:**
- Modify: `src/components/PostListItem.tsx`

- [ ] **Step 1: import 추가**

파일 상단 import 블록을 다음과 같이 갱신:

```tsx
import { useEffect, useState } from 'react';
import type { DeckPost } from '../types/deckPost';
import { CARDS } from '../data/cards';
import { getAccentColor } from '../utils/cardUtils';
import PostDeckView from './PostDeckView';
import {
  hasRecommended,
  addRecommended,
  removeRecommended,
} from '../utils/recommendStorage';
import { recommendDeckPost, unrecommendDeckPost } from '../api/deckPosts';
```

- [ ] **Step 2: state 및 초기화**

`const oshiThumbUrl = ...` 줄 다음에 추가:

```tsx
const [recommendCount, setRecommendCount] = useState(post.recommendCount);
const [recommended, setRecommended] = useState(false);
const [pending, setPending] = useState(false);

useEffect(() => {
  setRecommended(hasRecommended(post.id));
}, [post.id]);

useEffect(() => {
  setRecommendCount(post.recommendCount);
}, [post.recommendCount]);
```

`useEffect` 두 개를 분리한 이유: 추천 여부는 마운트 / id 변경 시 localStorage에서 1회 동기화, 카운트는 상위에서 새로고침된 게시글이 props로 새 값을 주면 따라가야 함.

- [ ] **Step 3: 추천 토글 핸들러**

state 선언 아래에 추가:

```tsx
async function handleToggleRecommend(e: React.MouseEvent) {
  e.stopPropagation();
  if (pending) return;
  setPending(true);

  const willRecommend = !recommended;
  // 낙관적 업데이트
  setRecommended(willRecommend);
  setRecommendCount((c) => Math.max(0, c + (willRecommend ? 1 : -1)));

  try {
    const newCount = willRecommend
      ? await recommendDeckPost(post.id)
      : await unrecommendDeckPost(post.id);
    setRecommendCount(newCount);
    if (willRecommend) addRecommended(post.id);
    else removeRecommended(post.id);
  } catch (err) {
    // 롤백
    setRecommended(!willRecommend);
    setRecommendCount((c) => Math.max(0, c + (willRecommend ? -1 : 1)));
    alert(
      err instanceof Error
        ? `추천 처리에 실패했습니다: ${err.message}`
        : '추천 처리에 실패했습니다.',
    );
  } finally {
    setPending(false);
  }
}
```

- [ ] **Step 4: 접힌 행에 카운트 칩 노출**

기존 우측 작성자/날짜 블록:

```tsx
{/* 작성자 / 날짜 (오른쪽) */}
<div className="flex flex-col items-end shrink-0 text-[10px] sm:text-[11px] text-gray-400 leading-tight">
  <span className="truncate max-w-[100px] sm:max-w-none">by {post.author}</span>
  <span className="text-gray-500">{formatDate(post.createdAt)}</span>
</div>
```

이 블록 **바로 앞**에 추천 카운트 칩 추가 (`recommendCount > 0`일 때만):

```tsx
{recommendCount > 0 && (
  <div
    className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-pink-900/40 text-pink-200 border border-pink-800/40"
    aria-label={`추천 ${recommendCount}`}
    title={`추천 ${recommendCount}`}
  >
    <span aria-hidden>👍</span>
    <span>{recommendCount}</span>
  </div>
)}
```

- [ ] **Step 5: 펼친 액션 바에 추천 토글 버튼**

기존 펼친 영역 액션 바:

```tsx
<div className="flex justify-end px-3 py-2 border-t border-gray-800 bg-gray-950">
  <button
    onClick={() => onLoadIntoDeck(post)}
    className="px-3 py-1.5 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border border-indigo-600"
  >
    내 덱으로 불러오기
  </button>
</div>
```

→ 추천 버튼을 왼쪽, 불러오기를 오른쪽으로 배치:

```tsx
<div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-800 bg-gray-950">
  <button
    onClick={handleToggleRecommend}
    disabled={pending}
    aria-pressed={recommended}
    className={
      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ' +
      (recommended
        ? 'bg-pink-700 hover:bg-pink-600 text-white border-pink-600'
        : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700') +
      (pending ? ' opacity-60 cursor-wait' : '')
    }
  >
    <span aria-hidden>👍</span>{' '}
    {recommended ? `추천됨 · 취소 (${recommendCount})` : `추천 (${recommendCount})`}
  </button>
  <button
    onClick={() => onLoadIntoDeck(post)}
    className="px-3 py-1.5 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border border-indigo-600"
  >
    내 덱으로 불러오기
  </button>
</div>
```

- [ ] **Step 6: 빌드 검증**

Run: `npm run build`
Expected: 통과.

- [ ] **Step 7: 수동 스모크 (`npm run dev`)**

Run: `npm run dev`

다음을 브라우저에서 확인:

1. `/board` 진입 → 기존 게시글 카드들이 정상 렌더.
2. 게시글 하나 펼치기 → 좌측 하단에 `👍 추천 (0)` 버튼이 회색으로 노출.
3. 추천 버튼 클릭 → 즉시 핑크 톤으로 바뀌고 "추천됨 · 취소 (1)", 접힌 행에 `👍 1` 칩 등장.
4. 새로고침 → 카운트 1 유지, 버튼은 다시 핑크(localStorage 기억).
5. 다시 클릭 → 0으로 복귀, 접힌 행 칩 사라짐.
6. 헤더의 "최신순" 토글 → "추천순"으로 바뀌고, 추천 많은 글이 위로.
7. 정렬 변경 후 `?page=2` 가 자동으로 제거되어 첫 페이지로.
8. (선택) 시크릿 창에서 같은 글 다시 추천 가능한지 확인.

- [ ] **Step 8: 커밋**

```bash
git add src/components/PostListItem.tsx
git commit -m "feat(board): add 👍 recommend chip and toggle button"
```

---

### Task 8: 최종 빌드 통과 확인

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 빌드 통과**

Run: `npm run build`
Expected: TypeScript + Vite 빌드 통과, 경고 없는 출력.

- [ ] **Step 2: lint 통과**

Run: `npm run lint`
Expected: 에러 없음. 신규 코드에 의한 신규 경고가 없는지 확인.

- [ ] **Step 3: 푸시 전 git 상태 확인**

```bash
git status
git log --oneline -5
```

Expected: 3개 커밋이 깔끔하게 쌓여있음.

---

## 검증 매트릭스 (스펙 ↔ 태스크)

| 스펙 요구사항 | 구현 위치 |
|---|---|
| DB `recommend_count` 컬럼 + RPC 2개 | Task 1 |
| `DeckPost.recommendCount` | Task 2 |
| localStorage 헬퍼 | Task 3 |
| `SELECT_COLUMNS`/`toDeckPost`/`ListPostsFilter.sort` | Task 4 |
| `recommendDeckPost`/`unrecommendDeckPost` | Task 5 |
| BoardPage 정렬 토글 + URL `?sort=popular` | Task 6 |
| 정렬 변경 시 `page=1` 리셋 | Task 6 Step 3 |
| 접힌 행 카운트 칩 (0이면 숨김) | Task 7 Step 4 |
| 펼친 영역 추천 토글 버튼 + 카운트 | Task 7 Step 5 |
| 낙관적 업데이트 + 실패 시 롤백 | Task 7 Step 3 |
| 페이징 변경 없음 (기존 20/페이지 유지) | — (변경 없음) |
