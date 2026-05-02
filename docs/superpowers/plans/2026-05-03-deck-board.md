# 덱 공유 게시판 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hololive TCG 덱 빌더에 Supabase 기반 익명 비밀번호 게시판을 추가하여, 사용자가 자기 덱을 업로드하고 다른 사용자의 덱을 받아 자기 빌더에 새 덱으로 추가할 수 있도록 한다.

**Architecture:** Vite + React 19 + Zustand 정적 SPA에 `react-router-dom`으로 `/`(빌더)와 `/board`(게시판) 두 라우트를 추가. Supabase 단일 테이블 `deck_posts`에 카드ID + 매수만 저장(카드 메타는 클라이언트 `CARDS` 사용). 비밀번호는 클라이언트 `bcryptjs` 해시, 삭제는 Postgres RPC + `pgcrypto.crypt()`로 검증.

**Tech Stack:** React 19, TypeScript, Vite, Zustand, Tailwind v4, react-router-dom, @supabase/supabase-js, bcryptjs, Supabase Postgres + pgcrypto.

**스펙 참조:** `docs/superpowers/specs/2026-05-03-deck-board-design.md`

**테스트 전략:** 프로젝트에 단위 테스트 인프라 없음. spec §11에 따라 각 task 끝에서 `npx tsc --noEmit` + 수동 시나리오 검증으로 통과 확인. 마지막 Task에서 end-to-end 수동 시나리오를 수행.

---

### Task 1: 의존성 설치 및 환경변수 템플릿

**Files:**
- Modify: `package.json` (deps)
- Create: `.env.local.example`

- [ ] **Step 1: 신규 의존성 설치**

```bash
npm install @supabase/supabase-js react-router-dom bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: `.env.local.example` 생성**

`.env.local.example`:
```
# Supabase 프로젝트 설정 후 https://supabase.com/dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: `.env.local` 보호 확인**

Run: `cat .gitignore | grep -E "\.env|\.local"`
Expected: `*.local`이 매칭되어야 함 (이미 ignored). 없으면 `*.local`을 `.gitignore`에 추가.

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과 (의존성 설치만 했으므로 변경 없음).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore: 게시판용 의존성 추가 (supabase-js, react-router, bcryptjs)"
```

---

### Task 2: Supabase 클라이언트 wrapper

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: 클라이언트 모듈 작성**

`src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 빌드는 통과시키되 런타임에 명확한 메시지를 던진다.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. ' +
      '게시판 기능이 동작하지 않습니다. .env.local.example을 참고하세요.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false },
});
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: supabase 클라이언트 wrapper 추가"
```

---

### Task 3: Supabase 셋업 가이드 문서

**Files:**
- Create: `docs/SUPABASE_SETUP.md`

- [ ] **Step 1: 가이드 문서 작성**

`docs/SUPABASE_SETUP.md`:
````markdown
# Supabase 셋업 가이드

덱 공유 게시판을 사용하려면 Supabase 프로젝트가 필요합니다.

## 1. 프로젝트 생성
1. https://supabase.com 접속 → Sign in → New project
2. Region은 `Northeast Asia (Seoul)` 권장
3. DB password는 안전하게 보관

## 2. SQL 실행 (SQL Editor → + New query)

```sql
create extension if not exists pgcrypto;

create table deck_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text not null default '익명',
  password_hash   text not null,
  oshi_card_id    text not null,
  main_deck       jsonb not null,
  cheers          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index deck_posts_created_at_idx on deck_posts (created_at desc);

alter table deck_posts enable row level security;

create policy "deck_posts_select_all"
  on deck_posts for select
  to anon, authenticated
  using (true);

create policy "deck_posts_insert_all"
  on deck_posts for insert
  to anon, authenticated
  with check (true);

-- DELETE / UPDATE 정책 없음 → RLS에 의해 차단

revoke select (password_hash) on deck_posts from anon, authenticated;

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
  if stored_hash is null then return false; end if;
  if crypt(password, stored_hash) = stored_hash then
    delete from deck_posts where id = post_id;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function delete_deck_post(uuid, text) to anon, authenticated;
```

## 3. 환경변수
1. Project Settings → API
2. `Project URL` → `.env.local`의 `VITE_SUPABASE_URL`
3. `anon public` key → `.env.local`의 `VITE_SUPABASE_ANON_KEY`
4. 프로젝트 루트의 `.env.local.example`을 복사해서 `.env.local`을 만든 뒤 위 값 입력

## 4. 검증
- 개발 서버 재시작 (`npm run dev`)
- 브라우저 콘솔에 supabase 관련 경고가 없으면 OK
````

- [ ] **Step 2: Commit**

```bash
git add docs/SUPABASE_SETUP.md
git commit -m "docs: Supabase 셋업 가이드 추가"
```

---

### Task 4: 게시판 타입 정의

**Files:**
- Create: `src/types/deckPost.ts`

- [ ] **Step 1: 타입 작성**

`src/types/deckPost.ts`:
```typescript
import type { CardColor } from './card';

/** 등록 시점에 직렬화한 덱 스냅샷. 카드 메타는 클라이언트 CARDS와 join. */
export interface DeckSnapshot {
  oshiCardId: string;
  /** 메인덱: 등록 순서대로 [{cardId, count}] */
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
}

/** Supabase에서 받아온 게시글 (password_hash 컬럼 제외) */
export interface DeckPost {
  id: string;
  title: string;
  author: string;
  oshiCardId: string;
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
  createdAt: string;
}

export interface CreatePostInput {
  title: string;
  author: string;
  password: string;
  snapshot: DeckSnapshot;
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/types/deckPost.ts
git commit -m "feat: 게시판 타입 정의 추가"
```

---

### Task 5: 비밀번호 해시 유틸

**Files:**
- Create: `src/utils/password.ts`

- [ ] **Step 1: helper 작성**

`src/utils/password.ts`:
```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
export const MIN_PASSWORD_LENGTH = 4;

/** 클라이언트에서 평문 비번을 bcrypt 해시로 변환. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function isValidPassword(plain: string): boolean {
  return plain.length >= MIN_PASSWORD_LENGTH;
}
```

- [ ] **Step 2: 동작 확인 (개발자 콘솔에서 즉석 검증)**

브라우저 개발자 도구를 사용할 거지만, 이 step에서는 단순 import 가능 여부만 확인:

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/utils/password.ts
git commit -m "feat: bcryptjs 비밀번호 해시 유틸 추가"
```

---

### Task 6: 덱 ↔ 스냅샷 변환 유틸

**Files:**
- Create: `src/utils/deckSnapshot.ts`

- [ ] **Step 1: 변환 함수 작성**

`src/utils/deckSnapshot.ts`:
```typescript
import type { Card, Deck, DeckEntry } from '../types/card';
import type { DeckSnapshot } from '../types/deckPost';
import { CARDS } from '../data/cards';

/** Deck → 직렬화 가능한 snapshot. oshi/메인덱은 cardId로, 매수는 그대로. */
export function deckToSnapshot(deck: Deck): DeckSnapshot {
  if (!deck.oshi) {
    throw new Error('오시 카드가 없는 덱은 공유할 수 없습니다.');
  }
  return {
    oshiCardId: deck.oshi.id,
    mainDeck: deck.mainDeck.map((e) => ({ cardId: e.card.id, count: e.count })),
    cheers: { ...(deck.cheers ?? {}) },
  };
}

export interface SnapshotResolveResult {
  oshi: Card | null;
  mainDeck: DeckEntry[];
  cheers: DeckSnapshot['cheers'];
  /** 클라이언트 CARDS에서 찾지 못한 cardId 목록 (오시 + 메인덱). */
  missingCardIds: string[];
  /** 누락된 카드의 총 매수 (오시는 1로 카운트, 메인덱은 count 합). */
  missingCardCount: number;
}

/** snapshot의 cardId를 CARDS와 join. 찾지 못한 카드는 누락 목록에 기록. */
export function resolveSnapshot(snapshot: DeckSnapshot): SnapshotResolveResult {
  const cardById = new Map(CARDS.map((c) => [c.id, c]));

  const missingCardIds: string[] = [];
  let missingCardCount = 0;

  const oshi = cardById.get(snapshot.oshiCardId) ?? null;
  if (!oshi) {
    missingCardIds.push(snapshot.oshiCardId);
    missingCardCount += 1;
  }

  const mainDeck: DeckEntry[] = [];
  for (const entry of snapshot.mainDeck) {
    const card = cardById.get(entry.cardId);
    if (card) {
      mainDeck.push({ card, count: entry.count });
    } else {
      missingCardIds.push(entry.cardId);
      missingCardCount += entry.count;
    }
  }

  return {
    oshi,
    mainDeck,
    cheers: { ...snapshot.cheers },
    missingCardIds,
    missingCardCount,
  };
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/utils/deckSnapshot.ts
git commit -m "feat: 덱-스냅샷 변환 유틸 (cardId ↔ Card join, 누락 카드 추적)"
```

---

### Task 7: store에 createDeckFromSnapshot 액션 추가

**Files:**
- Modify: `src/store/deckStore.ts`

- [ ] **Step 1: 인터페이스에 액션 추가**

[src/store/deckStore.ts:50-84](src/store/deckStore.ts#L50-L84) `DeckState` 인터페이스의 `createDeck` 바로 아래에 새 액션 시그니처를 추가:

기존:
```typescript
  createDeck: (name?: string) => void;
  deleteDeck: (id: string) => void;
```

변경:
```typescript
  createDeck: (name?: string) => void;
  /** snapshot으로 새 덱을 만들고 active로 설정. 누락 카드는 스킵. */
  createDeckFromSnapshot: (
    name: string,
    resolved: { oshi: Card | null; mainDeck: DeckEntry[]; cheers: Partial<Record<CardColor, number>> },
  ) => string;
  deleteDeck: (id: string) => void;
```

- [ ] **Step 2: 구현 추가**

[src/store/deckStore.ts](src/store/deckStore.ts) 내 `createDeck` 구현 직후에 다음을 추가:

```typescript
      createDeckFromSnapshot: (name, resolved) => {
        const deck: Deck = {
          ...createEmptyDeck(name),
          oshi: resolved.oshi,
          mainDeck: resolved.mainDeck.map((e) => ({ ...e })),
          cheers: { ...resolved.cheers },
        };
        set((s) => ({ decks: [...s.decks, deck], activeDeckId: deck.id }));
        return deck.id;
      },
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 4: 동작 확인 (수동)**

Run: `npm run dev`
브라우저 → 빌더 정상 동작 확인 (덱 추가/제거, 페이지 새로고침 후에도 덱 유지). 백그라운드로 두기.

- [ ] **Step 5: Commit**

```bash
git add src/store/deckStore.ts
git commit -m "feat: store에 createDeckFromSnapshot 액션 추가"
```

---

### Task 8: API layer (list / create / delete)

**Files:**
- Create: `src/api/deckPosts.ts`

- [ ] **Step 1: API 함수 작성**

`src/api/deckPosts.ts`:
```typescript
import { supabase } from '../lib/supabase';
import type { DeckPost, CreatePostInput } from '../types/deckPost';
import { hashPassword } from '../utils/password';

const PAGE_SIZE = 20;

interface DbDeckPost {
  id: string;
  title: string;
  author: string;
  oshi_card_id: string;
  main_deck: Array<{ cardId: string; count: number }>;
  cheers: Record<string, number>;
  created_at: string;
}

function toDeckPost(row: DbDeckPost): DeckPost {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    oshiCardId: row.oshi_card_id,
    mainDeck: row.main_deck ?? [],
    cheers: (row.cheers ?? {}) as DeckPost['cheers'],
    createdAt: row.created_at,
  };
}

export interface ListPostsResult {
  posts: DeckPost[];
  total: number;
  pageSize: number;
}

/** 1-based 페이지 번호. 최신순 고정. */
export async function listDeckPosts(page: number): Promise<ListPostsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from('deck_posts')
    .select('id, title, author, oshi_card_id, main_deck, cheers, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    posts: (data as DbDeckPost[] | null ?? []).map(toDeckPost),
    total: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

export async function createDeckPost(input: CreatePostInput): Promise<DeckPost> {
  const passwordHash = await hashPassword(input.password);

  const { data, error } = await supabase
    .from('deck_posts')
    .insert({
      title: input.title,
      author: input.author,
      password_hash: passwordHash,
      oshi_card_id: input.snapshot.oshiCardId,
      main_deck: input.snapshot.mainDeck,
      cheers: input.snapshot.cheers,
    })
    .select('id, title, author, oshi_card_id, main_deck, cheers, created_at')
    .single();

  if (error) throw error;
  return toDeckPost(data as DbDeckPost);
}

/**
 * RPC delete_deck_post(post_id, password) → boolean.
 * true: 삭제 성공. false: 비번 불일치 또는 글 없음.
 */
export async function deleteDeckPost(
  postId: string,
  password: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_deck_post', {
    post_id: postId,
    password,
  });
  if (error) throw error;
  return data === true;
}

export { PAGE_SIZE };
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/api/deckPosts.ts
git commit -m "feat: 게시판 API layer (list/create/delete)"
```

---

### Task 9: React Router 도입 + 페이지 분리

**Files:**
- Create: `src/pages/BuilderPage.tsx`
- Create: `src/pages/BoardPage.tsx`
- Create: `src/router.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: BuilderPage 생성 (현재 App 본문 이동)**

`src/pages/BuilderPage.tsx`:
```typescript
import { useState } from 'react';
import CardGrid from '../components/CardGrid';
import DeckPanel from '../components/DeckPanel';
import { useDeckStore } from '../store/deckStore';

export default function BuilderPage() {
  const [deckOpen, setDeckOpen] = useState(false);
  const { getActiveDeck, getMainDeckCount } = useDeckStore();
  const deck = getActiveDeck();
  const mainCount = getMainDeckCount();

  return (
    <div className="h-dvh overflow-hidden" style={{ background: '#0f0f1a' }}>
      {/* Desktop (md+) */}
      <div className="hidden md:flex h-full overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CardGrid />
        </div>
        <div className="w-105 shrink-0 border-l border-gray-800 overflow-hidden">
          <DeckPanel />
        </div>
      </div>

      {/* Mobile (<md) */}
      <div className="flex md:hidden flex-col h-full overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CardGrid />
        </div>
        <button
          onClick={() => setDeckOpen(true)}
          className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-700 active:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4-4m4 4l-4 4" />
            </svg>
            <span className="text-sm font-semibold text-white">{deck?.name ?? '덱'}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mainCount === 50 ? 'bg-green-900/60 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {mainCount} / 50
            </span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {deckOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeckOpen(false)} />
          <div className="relative flex flex-col h-[92vh] bg-gray-950 rounded-t-2xl overflow-hidden border-t border-gray-700 shadow-2xl">
            <div
              className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-pointer border-b border-gray-800"
              onClick={() => setDeckOpen(false)}
            >
              <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
            </div>
            <div className="flex-1 overflow-hidden">
              <DeckPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: BoardPage 스켈레톤 생성**

`src/pages/BoardPage.tsx`:
```typescript
import { Link } from 'react-router-dom';

export default function BoardPage() {
  return (
    <div className="h-dvh overflow-y-auto" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">덱 공유 게시판</h1>
          <Link
            to="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
          >
            ← 빌더
          </Link>
        </div>
        <div className="text-gray-500 text-sm">아직 공유된 덱이 없습니다.</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 라우터 정의**

`src/router.tsx`:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import BuilderPage from './pages/BuilderPage';
import BoardPage from './pages/BoardPage';

export const router = createBrowserRouter([
  { path: '/', element: <BuilderPage /> },
  { path: '/board', element: <BoardPage /> },
]);
```

- [ ] **Step 4: `App.tsx`를 RouterProvider로 단순화**

`src/App.tsx` 전체를 다음으로 교체:

```typescript
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 5: `main.tsx` 변경 없음 확인**

[src/main.tsx](src/main.tsx)는 현재 `<App />`을 그대로 렌더하므로 변경 불필요. 확인만.

- [ ] **Step 6: 타입체크 + 수동 확인**

Run: `npx tsc --noEmit`
Expected: 통과

Run: `npm run dev` (이미 떠있으면 재로드)
브라우저:
- `http://localhost:5173/` → 기존 빌더 정상 표시
- `http://localhost:5173/board` → "덱 공유 게시판" 헤더 + "← 빌더" 링크 → 클릭 시 빌더로 이동

- [ ] **Step 7: Commit**

```bash
git add src/pages/BuilderPage.tsx src/pages/BoardPage.tsx src/router.tsx src/App.tsx
git commit -m "feat: react-router 도입, /와 /board 라우트 분리"
```

---

### Task 10: SharePostDialog (업로드 모달)

**Files:**
- Create: `src/components/SharePostDialog.tsx`

- [ ] **Step 1: 다이얼로그 컴포넌트 작성**

`src/components/SharePostDialog.tsx`:
```typescript
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Deck } from '../types/card';
import { deckToSnapshot } from '../utils/deckSnapshot';
import { createDeckPost } from '../api/deckPosts';
import { isValidPassword, MIN_PASSWORD_LENGTH } from '../utils/password';

interface Props {
  deck: Deck;
  onClose: () => void;
  onSuccess: () => void;
}

const TITLE_MAX = 50;
const AUTHOR_MAX = 20;

export default function SharePostDialog({ deck, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(deck.name ?? '');
  const [author, setAuthor] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleTrimmed = title.trim();
  const authorFinal = (author.trim() || '익명').slice(0, AUTHOR_MAX);
  const canSubmit =
    !!titleTrimmed &&
    titleTrimmed.length <= TITLE_MAX &&
    isValidPassword(password) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const snapshot = deckToSnapshot(deck);
      await createDeckPost({
        title: titleTrimmed,
        author: authorFinal,
        password,
        snapshot,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">덱 공유하기</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">게시글 제목</span>
            <input
              autoFocus
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 후부키 적색 컨트롤"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">작성자 (기본: 익명)</span>
            <input
              value={author}
              maxLength={AUTHOR_MAX}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="익명"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              비밀번호 (삭제 시 사용, {MIN_PASSWORD_LENGTH}자 이상)
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-lg text-sm bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40"
          >
            {submitting ? '업로드 중...' : '공유하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/SharePostDialog.tsx
git commit -m "feat: SharePostDialog (업로드 모달) 추가"
```

---

### Task 11: DeckPanel에 "덱 공유하기" 버튼 wire-in

**Files:**
- Modify: `src/components/DeckPanel.tsx`

- [ ] **Step 1: ExportPanel에 버튼 추가**

[src/components/DeckPanel.tsx](src/components/DeckPanel.tsx)의 `ExportPanel` 함수 직후, 또는 그 안에 새 버튼을 둔다. 이번엔 별도의 `SharePanel`을 만들어 ExportPanel 아래에 두는 방식으로 한다 — 시각적으로 분리되어 명확.

[src/components/DeckPanel.tsx](src/components/DeckPanel.tsx) 상단 import 섹션에 추가:

```typescript
import SharePostDialog from './SharePostDialog';
```

`DeckPanel` 컴포넌트 내부 (return 직전)에 다음 상태 추가:

```typescript
const [shareOpen, setShareOpen] = useState(false);
```

`ExportPanel` 컴포넌트 자체 변경하지 않고, `DeckPanel`의 JSX에서 `<ExportPanel ... />` 다음에 새 공유 영역을 삽입.

[src/components/DeckPanel.tsx:1477](src/components/DeckPanel.tsx#L1477) 부근의 `<ExportPanel onOpenDrawSim={() => setDrawSimOpen(true)} />` 바로 아래에 다음 추가:

```tsx
<div className="px-3 pb-3 border-t border-gray-800">
  <button
    onClick={() => setShareOpen(true)}
    disabled={errors.length > 0}
    title={errors.length > 0 ? '덱 검증 오류를 먼저 해결해주세요' : undefined}
    className="w-full mt-3 py-2 rounded-lg text-sm font-medium transition-all bg-purple-700 hover:bg-purple-600 disabled:bg-gray-800 disabled:text-gray-500 text-white border border-purple-600 disabled:border-gray-700"
  >
    덱 공유하기
  </button>
</div>
{shareOpen && deck && (
  <SharePostDialog
    deck={deck}
    onClose={() => setShareOpen(false)}
    onSuccess={() => {
      setShareOpen(false);
      // 토스트 대용: 단순 alert (프로젝트에 토스트 시스템 없음)
      alert('게시판에 업로드되었습니다.');
    }}
  />
)}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 수동 검증**

Run: `npm run dev` (이미 떠있으면 reload)
- 빌더에서 덱 패널 하단에 "덱 공유하기" 버튼이 보임
- 덱 에러가 있으면 비활성화 (오시 없거나 50장 미달)
- 50장 + 오시 채우면 활성화, 클릭 시 모달 열림
- 모달의 "취소"는 닫힘. (실제 업로드는 Supabase 셋업 후 Task 15에서 검증)

- [ ] **Step 4: Commit**

```bash
git add src/components/DeckPanel.tsx
git commit -m "feat: DeckPanel에 '덱 공유하기' 버튼과 SharePostDialog 연결"
```

---

### Task 12: PostDeckView (펼친 덱 표시)

**Files:**
- Create: `src/components/PostDeckView.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/PostDeckView.tsx`:
```typescript
import { CARDS } from '../data/cards';
import type { CardColor } from '../types/card';
import { COLOR_ACCENT, COLOR_LABELS, getAccentColor } from '../utils/cardUtils';

const CHEER_IMAGE: Record<CardColor, string> = {
  white: '/images/hY/hY01.png',
  green: '/images/hY/hY02.png',
  red: '/images/hY/hY03.png',
  blue: '/images/hY/hY04.png',
  purple: '/images/hY/hY05.png',
  yellow: '/images/hY/hY06.png',
};

interface Props {
  oshiCardId: string;
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
}

function getCard(id: string) {
  return CARDS.find((c) => c.id === id);
}

function CardSlot({
  imageUrl,
  name,
  count,
  accent,
  missing,
}: {
  imageUrl?: string;
  name: string;
  count: number;
  accent: string;
  missing?: boolean;
}) {
  return (
    <div className="relative aspect-2.5/3.5 rounded overflow-hidden border bg-gray-900"
         style={{ borderColor: accent + '66' }}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center p-1"
          style={{ background: accent + '22' }}
        >
          <span className="text-[9px] text-center text-gray-400 leading-tight">
            {missing ? '카드 없음' : name}
          </span>
        </div>
      )}
      <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold flex items-center justify-center shadow">
        ×{count}
      </span>
    </div>
  );
}

export default function PostDeckView({ oshiCardId, mainDeck, cheers }: Props) {
  const oshi = getCard(oshiCardId);
  const oshiAccent = oshi ? getAccentColor(oshi) : '#6b7280';

  const cheerEntries = (
    Object.entries(cheers) as Array<[CardColor, number | undefined]>
  ).filter(([, n]) => (n ?? 0) > 0);

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 bg-gray-950 border-t border-gray-800">
      {/* 오시 (왼쪽 큰 사이즈) */}
      <div className="md:w-48 shrink-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">오시</p>
        <div
          className="aspect-2.5/3.5 rounded-lg overflow-hidden border-2 max-w-40 md:max-w-none mx-auto md:mx-0"
          style={{ borderColor: oshiAccent + 'aa' }}
        >
          {oshi?.imageUrl ? (
            <img src={oshi.imageUrl} alt={oshi.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-xs text-gray-500 text-center px-1">
                {oshi ? oshi.name : '카드 없음'}
              </span>
            </div>
          )}
        </div>
        {oshi && (
          <p className="mt-1 text-xs text-amber-200 font-semibold text-center md:text-left truncate">
            {oshi.name}
          </p>
        )}
      </div>

      {/* 메인덱 그리드 + 엘 덱 */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            메인 덱{' '}
            <span className="text-gray-600">
              ({mainDeck.reduce((s, e) => s + e.count, 0)})
            </span>
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
            {mainDeck.map((e, idx) => {
              const card = getCard(e.cardId);
              const accent = card ? getAccentColor(card) : '#6b7280';
              return (
                <CardSlot
                  key={`${e.cardId}-${idx}`}
                  imageUrl={card?.imageUrl}
                  name={card?.name ?? e.cardId}
                  count={e.count}
                  accent={accent}
                  missing={!card}
                />
              );
            })}
          </div>
        </div>

        {cheerEntries.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">엘 덱</p>
            <div className="flex flex-wrap gap-2">
              {cheerEntries.map(([color, count]) => (
                <div
                  key={color}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-900 border"
                  style={{ borderColor: COLOR_ACCENT[color] + '66' }}
                >
                  <img src={CHEER_IMAGE[color]} alt={color} className="w-4 h-5 object-cover rounded-sm" />
                  <span className="text-xs text-gray-300">{COLOR_LABELS[color]} ×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/PostDeckView.tsx
git commit -m "feat: PostDeckView (오시 + 메인덱 그리드 + 엘 덱) 추가"
```

---

### Task 13: PostListItem (아코디언 헤더 + 펼친 본문)

**Files:**
- Create: `src/components/PostListItem.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/PostListItem.tsx`:
```typescript
import { useState } from 'react';
import type { DeckPost } from '../types/deckPost';
import { CARDS } from '../data/cards';
import { getAccentColor } from '../utils/cardUtils';
import PostDeckView from './PostDeckView';

interface Props {
  post: DeckPost;
  onLoadIntoDeck: (post: DeckPost) => void;
  onDeleteRequest: (post: DeckPost) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function PostListItem({ post, onLoadIntoDeck, onDeleteRequest }: Props) {
  const [open, setOpen] = useState(false);
  const oshi = CARDS.find((c) => c.id === post.oshiCardId);
  const oshiAccent = oshi ? getAccentColor(oshi) : '#6b7280';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* 오시 썸네일 */}
        <div
          className="w-10 h-14 sm:w-12 sm:h-16 shrink-0 rounded overflow-hidden border bg-gray-800"
          style={{ borderColor: oshiAccent + '88' }}
        >
          {oshi?.imageUrl ? (
            <img src={oshi.imageUrl} alt={oshi.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 text-center px-0.5">
              {oshi ? oshi.name : '카드 없음'}
            </div>
          )}
        </div>

        {/* 제목 / 작성자 / 날짜 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{post.title}</p>
          <div className="flex flex-col sm:flex-row sm:gap-2 text-[11px] text-gray-400">
            <span className="truncate">by {post.author}</span>
            <span className="text-gray-500 hidden sm:inline">·</span>
            <span className="text-gray-500">{formatDate(post.createdAt)}</span>
          </div>
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(post);
            }}
            className="px-2 py-1 text-[11px] text-gray-500 hover:text-red-300 hover:bg-red-900/40 rounded border border-gray-700"
          >
            삭제
          </button>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <>
          <PostDeckView
            oshiCardId={post.oshiCardId}
            mainDeck={post.mainDeck}
            cheers={post.cheers}
          />
          <div className="flex justify-end px-3 py-2 border-t border-gray-800 bg-gray-950">
            <button
              onClick={() => onLoadIntoDeck(post)}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border border-indigo-600"
            >
              내 덱으로 불러오기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/PostListItem.tsx
git commit -m "feat: PostListItem (아코디언 헤더 + 펼친 본문) 추가"
```

---

### Task 14: Pagination 컴포넌트

**Files:**
- Create: `src/components/Pagination.tsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/Pagination.tsx`:
```typescript
interface Props {
  page: number;        // 1-based 현재 페이지
  total: number;       // 전체 항목 수
  pageSize: number;
  onChange: (page: number) => void;
}

const WINDOW = 5; // 한 번에 보여줄 페이지 번호 수

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  // 윈도우 계산: 현재 페이지를 중심으로 +-2
  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), totalPages - WINDOW + 1));
  const end = Math.min(totalPages, start + WINDOW - 1);
  const numbers: number[] = [];
  for (let i = start; i <= end; i++) numbers.push(i);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40"
      >
        이전
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`min-w-8 px-2 py-1.5 text-xs rounded border ${
            n === page
              ? 'bg-indigo-700 text-white border-indigo-600'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
          }`}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: Commit**

```bash
git add src/components/Pagination.tsx
git commit -m "feat: Pagination 컴포넌트 추가 (윈도우 5)"
```

---

### Task 15: BoardPage 통합 (fetch + 리스트 + 페이지네이션 + 상태들)

**Files:**
- Modify: `src/pages/BoardPage.tsx`

- [ ] **Step 1: BoardPage 본문 교체**

`src/pages/BoardPage.tsx` 전체 교체:

```typescript
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listDeckPosts, PAGE_SIZE } from '../api/deckPosts';
import type { DeckPost } from '../types/deckPost';
import PostListItem from '../components/PostListItem';
import Pagination from '../components/Pagination';

export default function BoardPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [posts, setPosts] = useState<DeckPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listDeckPosts(page)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '게시판을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, reloadKey]);

  function handlePageChange(p: number) {
    setParams({ page: String(p) }, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  // 다음 task에서 채울 핸들러 자리 (placeholder까지 미완성 코드 X — alert로 임시 처리)
  function handleLoadIntoDeck(post: DeckPost) {
    // Task 17에서 본 구현으로 교체
    alert(`불러오기 미구현: ${post.title}`);
  }
  function handleDeleteRequest(post: DeckPost) {
    // Task 16에서 본 구현으로 교체
    alert(`삭제 미구현: ${post.title}`);
  }

  return (
    <div className="h-dvh overflow-y-auto" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-white">덱 공유 게시판</h1>
          <Link
            to="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
          >
            ← 빌더
          </Link>
        </div>

        {loading && <div className="text-gray-500 text-sm py-8 text-center">불러오는 중...</div>}

        {!loading && error && (
          <div className="text-red-400 text-sm py-4 px-3 bg-red-950/40 border border-red-900 rounded">
            {error}
            <button onClick={reload} className="ml-2 underline">다시 시도</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-gray-500 text-sm py-12 text-center">아직 공유된 덱이 없습니다.</div>
        )}

        {!loading && !error && posts.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {posts.map((p) => (
                <PostListItem
                  key={p.id}
                  post={p}
                  onLoadIntoDeck={handleLoadIntoDeck}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 통과

- [ ] **Step 3: 수동 검증 (Supabase 셋업 후)**

전제: 사용자가 `docs/SUPABASE_SETUP.md` 따라 프로젝트 만들고 `.env.local` 채움.

Run: `npm run dev` 재시작 (env 반영)
- 빌더에서 50장 + 오시 덱 만들고 "덱 공유하기" → 모달 → 제목/작성자/비번 입력 → 공유
- 성공 alert 후 `/board`로 이동 → 방금 글이 헤더에 보임
- 클릭 → 펼쳐짐 → 오시(왼쪽) + 덱 그리드 + 엘 덱 표시
- 누락 카드 시뮬: 임시로 cards.ts에서 한 카드 주석 처리 후 reload → "카드 없음" placeholder 정상

- [ ] **Step 4: Commit**

```bash
git add src/pages/BoardPage.tsx
git commit -m "feat: BoardPage 게시글 목록/페이지네이션/상태 처리"
```

---

### Task 16: DeletePostDialog + 삭제 플로우

**Files:**
- Create: `src/components/DeletePostDialog.tsx`
- Modify: `src/pages/BoardPage.tsx`

- [ ] **Step 1: DeletePostDialog 작성**

`src/components/DeletePostDialog.tsx`:
```typescript
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DeckPost } from '../types/deckPost';
import { deleteDeckPost } from '../api/deckPosts';

interface Props {
  post: DeckPost;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeletePostDialog({ post, onClose, onDeleted }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await deleteDeckPost(post.id, password);
      if (ok) {
        onDeleted();
      } else {
        setError('비밀번호가 일치하지 않습니다.');
        setSubmitting(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">게시글 삭제</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs text-gray-400">
            「{post.title}」을(를) 삭제하려면 작성 시 입력한 비밀번호를 입력하세요.
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password) handleDelete();
            }}
            placeholder="비밀번호"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={!password || submitting}
            className="flex-1 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-600 text-white disabled:opacity-40"
          >
            {submitting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: BoardPage에 wire-in**

[src/pages/BoardPage.tsx](src/pages/BoardPage.tsx) 변경:

import 추가:
```typescript
import DeletePostDialog from '../components/DeletePostDialog';
```

state 추가 (`const [reloadKey, setReloadKey] = useState(0);` 직후):
```typescript
const [deleteTarget, setDeleteTarget] = useState<DeckPost | null>(null);
```

`handleDeleteRequest` 함수 교체:
```typescript
function handleDeleteRequest(post: DeckPost) {
  setDeleteTarget(post);
}
```

JSX에서 마지막 `</div>` 직전(혹은 `Pagination` 다음)에 다이얼로그 렌더링 추가:
```tsx
{deleteTarget && (
  <DeletePostDialog
    post={deleteTarget}
    onClose={() => setDeleteTarget(null)}
    onDeleted={() => {
      setDeleteTarget(null);
      reload();
      alert('삭제되었습니다.');
    }}
  />
)}
```

- [ ] **Step 3: 타입체크 + 수동 검증**

Run: `npx tsc --noEmit`
Expected: 통과

수동 검증:
- 게시글 헤더의 "삭제" 버튼 → 비번 모달
- 잘못된 비번 → "비밀번호가 일치하지 않습니다."
- 올바른 비번 → 모달 닫힘 + 목록에서 사라짐 + 성공 alert

- [ ] **Step 4: Commit**

```bash
git add src/components/DeletePostDialog.tsx src/pages/BoardPage.tsx
git commit -m "feat: 게시글 삭제 (비번 검증 모달 + RPC) 추가"
```

---

### Task 17: "내 덱으로 불러오기" 플로우

**Files:**
- Modify: `src/pages/BoardPage.tsx`

- [ ] **Step 1: handleLoadIntoDeck 본 구현으로 교체**

[src/pages/BoardPage.tsx](src/pages/BoardPage.tsx) 변경:

import 추가:
```typescript
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../store/deckStore';
import { resolveSnapshot } from '../utils/deckSnapshot';
```

`BoardPage` 함수 본문 상단에 추가:
```typescript
const navigate = useNavigate();
const createDeckFromSnapshot = useDeckStore((s) => s.createDeckFromSnapshot);
```

기존 `handleLoadIntoDeck` 교체:
```typescript
function handleLoadIntoDeck(post: DeckPost) {
  const ok = window.confirm(`「${post.title}」을(를) 새 덱으로 추가합니다.`);
  if (!ok) return;

  const resolved = resolveSnapshot({
    oshiCardId: post.oshiCardId,
    mainDeck: post.mainDeck,
    cheers: post.cheers,
  });

  createDeckFromSnapshot(post.title, {
    oshi: resolved.oshi,
    mainDeck: resolved.mainDeck,
    cheers: resolved.cheers,
  });

  if (resolved.missingCardCount > 0) {
    alert(
      `덱이 추가되었습니다. (${resolved.missingCardCount}장 카드를 불러오지 못했습니다.)`,
    );
  } else {
    alert('덱이 추가되었습니다.');
  }
  navigate('/');
}
```

- [ ] **Step 2: 타입체크 + 수동 검증**

Run: `npx tsc --noEmit`
Expected: 통과

수동:
- 게시판에서 글 펼쳐서 "내 덱으로 불러오기" → confirm → 빌더로 이동
- 빌더의 덱 셀렉터에 새 덱(제목 그대로) 추가됨, oshi/메인덱/엘덱 그대로 표시
- 기존 덱은 그대로 보존 (덮어쓰기 X)

- [ ] **Step 3: Commit**

```bash
git add src/pages/BoardPage.tsx
git commit -m "feat: '내 덱으로 불러오기' 본 구현 (snapshot 매핑 + 새 덱 추가 + navigate)"
```

---

### Task 18: 빌더에 게시판 진입 링크

**Files:**
- Modify: `src/pages/BuilderPage.tsx`

- [ ] **Step 1: 데스크탑/모바일 양쪽에 게시판 링크 추가**

[src/pages/BuilderPage.tsx](src/pages/BuilderPage.tsx) 변경:

상단 import에 추가:
```typescript
import { Link } from 'react-router-dom';
```

데스크탑 영역의 `<DeckPanel />` 영역을 감싸는 컨테이너 안 상단에 작은 링크 바를 끼워 넣는다. 단, 기존 DeckPanel 스타일을 깨지 않도록 별도 헤더를 빌더 화면 모바일/데스크탑 공통으로 우상단 floating 링크로 처리.

기존 `return (`의 외곽 div 안 가장 첫 줄에 floating 링크를 추가 (모든 break point에서 보임):

기존:
```tsx
return (
  <div className="h-dvh overflow-hidden" style={{ background: '#0f0f1a' }}>
```

변경:
```tsx
return (
  <div className="h-dvh overflow-hidden relative" style={{ background: '#0f0f1a' }}>
    <Link
      to="/board"
      className="absolute top-2 right-2 z-40 px-3 py-1.5 text-xs bg-gray-800/90 hover:bg-gray-700 text-gray-200 rounded-lg border border-gray-700 backdrop-blur"
    >
      게시판 →
    </Link>
```

- [ ] **Step 2: 타입체크 + 수동 검증**

Run: `npx tsc --noEmit`
Expected: 통과

수동:
- 빌더 우상단에 "게시판 →" 링크가 떠 있음
- 클릭 시 `/board`로 이동
- 기존 카드 선택/검색 UI를 가리지 않음 (z-index 40, 우상단 코너)

- [ ] **Step 3: Commit**

```bash
git add src/pages/BuilderPage.tsx
git commit -m "feat: 빌더 우상단에 게시판 진입 링크"
```

---

### Task 19: 최종 end-to-end 수동 검증

**Files:** (코드 변경 없음, 검증만. 문제 발견 시 해당 task로 돌아가 수정)

- [ ] **Step 1: 빌드 통과 확인**

Run: `npm run build`
Expected: 에러 없이 dist 생성

- [ ] **Step 2: spec §11 시나리오 전체 수동 검증**

`npm run dev`로 띄우고 다음을 순서대로 검증:

1. **정상 업로드**: 50장 + 오시 + 비번 4자 이상 → 공유하기 → 게시판에서 자기 글 노출
2. **빈 게시판 상태**: 모든 글 삭제 후 `/board` → "아직 공유된 덱이 없습니다."
3. **펼치기/접기**: 헤더 클릭으로 정상 토글, 화살표 회전
4. **펼친 본문**: 오시(왼쪽 큼지막) + 메인덱 그리드(자동 줄바꿈, 매수 뱃지) + 엘덱(있을 때만)
5. **불러오기 — 빈 덱 상태**: 새 덱 생성 → 오시 비어있음 → 게시판에서 불러오기 → 새 덱 추가됨
6. **불러오기 — 차있는 덱 상태**: 카드 채운 활성 덱 → 게시판 불러오기 → 기존 덱 보존, 새 덱 추가
7. **삭제 — 비번 일치**: 본인 글 → 삭제 → 비번 입력 → 목록에서 사라짐
8. **삭제 — 비번 불일치**: 잘못된 비번 → "비밀번호가 일치하지 않습니다."
9. **페이지네이션**: 21개 이상 업로드해서 1·2 페이지 모두 정상 동작 (더미 글 빠르게 만들 수 있음)
10. **누락 카드**: `src/data/cards.ts`에서 한 카드를 잠시 주석 처리 → reload → 게시판에서 placeholder("카드 없음 ×N") 표시 + 불러오기 시 "X장 카드를 불러오지 못했습니다." 토스트. 검증 후 주석 복원.
11. **모바일 (`<md`)**: DevTools 모바일 뷰포트 → 헤더 한 줄, 펼친 본문 column, 다이얼로그 화면 안에 들어옴, 키보드 노출 시 스크롤
12. **빌더 ↔ 게시판 네비게이션**: 양방향 링크 동작

- [ ] **Step 3: 발견 이슈 수정**

문제가 발견되면 해당 Task로 돌아가 수정 후 commit. 문제 없으면 다음 step.

- [ ] **Step 4: README 업데이트 안내** (선택)

`README.md`가 있으면 게시판 기능 + Supabase 셋업 가이드 링크 한 줄 추가. 없으면 스킵.

Run: `ls README*` (없으면 skip)

만약 있을 경우, 다음 줄 추가:
```markdown
## 덱 공유 게시판
Supabase 백엔드 기반 익명 게시판. 셋업: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
```

- [ ] **Step 5: 최종 commit (필요 시)**

수정사항이 있으면:
```bash
git add -A
git commit -m "chore: 게시판 e2e 검증 후 마이너 수정"
```

수정사항 없으면 skip.

---

## Self-Review 체크리스트 (계획 작성자가 본인이 수행)

**Spec coverage:**
- §2 핵심 결정: Supabase / react-router / bcrypt+pgcrypto / 아코디언 / 오시 옆 그리드 / 매수 묶음 / 최신순 / 페이지 번호 / 새 덱 추가 → 모두 Task 1~17에 대응 ✓
- §4 스키마, RLS, RPC → Task 3 (셋업 가이드) ✓
- §5 신규 파일 — 모두 Task에 대응:
  - lib/supabase.ts (T2), api/deckPosts.ts (T8), utils/deckSnapshot.ts (T6), utils/password.ts (T5),
  - pages/BuilderPage (T9), pages/BoardPage (T9, T15), components/SharePostDialog (T10),
  - components/DeletePostDialog (T16), components/PostListItem (T13), components/PostDeckView (T12),
  - components/Pagination (T14), router.tsx (T9) ✓
- §5.4 타입 — Task 4 ✓
- §6.1 업로드 플로우 → T10+T11 ✓
- §6.2 게시판 보기 → T12~T15 ✓
- §6.3 불러오기 → T17 ✓
- §6.4 삭제 → T16 ✓
- §7 보안 — bcryptjs+pgcrypto 비교, password_hash 컬럼 권한 회수 → T3 SQL에 포함 ✓
- §8 누락 카드 → T6 (resolveSnapshot 추적) + T12 (placeholder) + T17 (불러오기 토스트) ✓
- §9 모바일 → T9 (BuilderPage 보존), T13/T15 (responsive 클래스), T19 검증 ✓
- §10 환경변수 → T1 (.env.local.example), T3 (가이드) ✓
- §11 검증 시나리오 → T19에 1:1 매핑 ✓

**Placeholder scan:**
- T15에 `handleLoadIntoDeck`/`handleDeleteRequest`가 임시 alert 핸들러로 작성되지만 곧 T16/T17에서 본 구현으로 교체. 코드 자체는 placeholder가 아닌 동작하는 임시 구현이므로 OK. T15→T16→T17 순서로 commit이 분리되어 각 단계가 독립적으로 동작하는 게 의도. ✓
- "TODO/TBD/implement later" 없음 ✓
- 모든 step에 실제 코드 또는 명령어 포함 ✓

**Type consistency:**
- `DeckSnapshot` 형태: T4에서 정의, T6/T8/T10/T17에서 동일하게 사용 ✓
- `DeckPost` 형태: T4에서 정의, T8 toDeckPost가 매핑, T13/T15/T16/T17에서 일관 사용 ✓
- `createDeckFromSnapshot(name, { oshi, mainDeck, cheers })` 시그니처: T7에서 정의, T17에서 동일 호출 ✓
- `listDeckPosts(page) → { posts, total, pageSize }`: T8 정의, T15 사용 ✓
- `deleteDeckPost(id, password) → boolean`: T8 정의, T16 사용 ✓

스펙 누락 없음, placeholder 없음, 타입 일관됨.
