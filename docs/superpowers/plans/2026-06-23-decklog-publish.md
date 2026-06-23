# Deck Log 업로드(publish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱에서 만든 덱을 Bushiroad JP Deck Log에 발행하고 `decklog.bushiroad.com/view/{code}` 공유 링크를 받는다.

**Architecture:** 클라이언트가 `hocg_cards.json`으로 `card_number → manage_id` 맵을 만들어 Deck Log 페이로드(JSON)를 빌드한다. Supabase Edge Function이 `Referer/Origin` 헤더를 붙여 실제 Deck Log publish 엔드포인트로 POST하고 응답을 그대로 돌려준다(얇은 프록시). 클라이언트는 받은 코드로 링크를 만든다.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand, Supabase Edge Functions(Deno), vitest(신규, 순수 로직 단위 테스트).

## Global Constraints

- JP 전용: `game_title_id = 9`. 발행 링크 베이스 `https://decklog.bushiroad.com/view/`.
- Deck 제목은 최대 25자(초과 시 절단).
- `manage_id`는 문자열로 직렬화. 각 카드의 **첫 일러스트 첫 JP manage_id**(기본 인쇄)를 사용 — 아트 변형은 보존하지 않는다.
- 카드 DB 소스: `https://qrimpuff.github.io/hocg-fan-sim-assets/hocg_cards.json` (GitHub Pages, CORS 허용).
- 옐 색상↔접두사: `hY01=white, hY02=green, hY03=red, hY04=blue, hY05=purple, hY06=yellow`.
- 카드 매칭 키는 `card_number`(예: `hBP08-001`). 앱 `CARDS`와 hocg_cards.json 모두 동일 체계.
- 코드 주석은 한국어, 식별자는 영어(기존 코드 관례).

## Deck Log publish 계약 (Task 1에서 확정, 그 전까지 가정값)

- 엔드포인트(가정): `POST https://decklog.bushiroad.com/system/app/api/...`
- 헤더(가정): `Content-Type: application/json`, `Referer: https://decklog.bushiroad.com/`, `Origin: https://decklog.bushiroad.com`, `X-Requested-With: XMLHttpRequest`
- 바디: 아래 `DeckLogPayload` JSON
- 응답(가정): 새 덱 코드가 `deck_id` 필드에 포함
- 이 값들은 `src/utils/decklogApi.ts` 한 곳에 모은다(스파이크 후 상수만 교체).

---

### Task 1: 스파이크 — 실제 Deck Log publish 계약 캡처

**목적:** 정확한 엔드포인트/헤더/바디 인코딩/응답 필드를 실측으로 확정하고, 익명 발행이 가능한지 확인한다. 이 결과가 Task 5(Edge Function)를 좌우한다.

**Files:**
- Create: `src/utils/decklogApi.ts` (캡처 결과를 상수로 기록)
- Modify: `docs/superpowers/specs/2026-06-23-decklog-publish-design.md` (3절 "미확정 항목"을 확정값으로 갱신)

**Interfaces:**
- Produces: `DECKLOG_GAME_TITLE_ID_JP: number`, `DECKLOG_VIEW_BASE_JP: string`, `DECKLOG_PUBLISH_URL: string`, `DECKLOG_PUBLISH_HEADERS: Record<string,string>`, `DECKLOG_PUBLISH_CONTENT_TYPE: 'json' | 'form'`, `DECKLOG_RESPONSE_CODE_FIELD: string`

- [ ] **Step 1: Deck Log JP에서 최소 덱을 수동 발행하며 요청 캡처**

브라우저 DevTools(Network)에서 `https://decklog.bushiroad.com/` (hololive, JP) 접속 → 임의의 작은 덱을 구성하고 "발행/공유"를 누른다. 발행 시 발생하는 POST 요청을 찾아 다음을 기록한다:
- Request URL(전체 경로), Method
- Request Headers (특히 Content-Type, Referer, Origin, X-Requested-With)
- Request Payload (JSON인지 form-urlencoded인지, 필드명: game_title_id/deck_id/title/p_list/list/sub_list, 카드 항목 필드: card_number/num/manage_id)
- Response Body (새 덱 코드를 담은 필드명)

> 캡처가 어려우면, 기존 공개 덱을 여는 **view** 요청을 먼저 캡처해 API 베이스/경로 패턴을 확인하고 publish 경로를 유추한 뒤 실제 발행으로 검증한다.

- [ ] **Step 2: 캡처 결과를 상수 모듈로 기록**

`src/utils/decklogApi.ts` 생성. 캡처한 실제값으로 채운다(아래는 가정값 예시 — 실제 캡처값으로 교체):

```ts
// Deck Log JP publish 계약. 값은 Task 1 스파이크에서 실측 확정.
export const DECKLOG_GAME_TITLE_ID_JP = 9;
export const DECKLOG_VIEW_BASE_JP = 'https://decklog.bushiroad.com/view/';

// 실제 발행 엔드포인트 — 캡처값으로 교체
export const DECKLOG_PUBLISH_URL =
  'https://decklog.bushiroad.com/system/app/api/publish/9';

// 'json' | 'form' — 캡처한 Content-Type에 맞춤
export const DECKLOG_PUBLISH_CONTENT_TYPE: 'json' | 'form' = 'json';

// 업스트림이 요구하는 헤더 — 캡처값으로 교체
export const DECKLOG_PUBLISH_HEADERS: Record<string, string> = {
  Referer: 'https://decklog.bushiroad.com/',
  Origin: 'https://decklog.bushiroad.com',
  'X-Requested-With': 'XMLHttpRequest',
};

// 응답에서 새 덱 코드를 담는 필드명 — 캡처값으로 교체
export const DECKLOG_RESPONSE_CODE_FIELD = 'deck_id';
```

- [ ] **Step 3: 익명 발행 가능 여부 결론 기록**

스파이크 결과(쿠키/세션/토큰 필요 여부)를 스펙 3절에 한 줄로 기록. 토큰이 필요하면 Edge Function에서 처리하도록 Task 5에 메모를 남긴다.

- [ ] **Step 4: Commit**

```bash
git add src/utils/decklogApi.ts docs/superpowers/specs/2026-06-23-decklog-publish-design.md
git commit -m "spike: capture Deck Log JP publish contract"
```

---

### Task 2: vitest 설치 및 설정

**Files:**
- Modify: `package.json` (devDependency + `test` 스크립트)
- Create: `vitest.config.ts`
- Create: `src/utils/decklogPublish.test.ts` (스모크 테스트로 시작)

**Interfaces:**
- Produces: `npm test`로 실행되는 vitest 러너.

- [ ] **Step 1: vitest 설치**

Run: `npm install -D vitest`
Expected: 설치 성공, `package.json` devDependencies에 `vitest` 추가.

- [ ] **Step 2: 테스트 스크립트 추가**

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: vitest 설정 생성**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 스모크 테스트 작성**

`src/utils/decklogPublish.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 실행하여 통과 확인**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/utils/decklogPublish.test.ts
git commit -m "chore: add vitest for unit tests"
```

---

### Task 3: 타입 + manage_id 인덱스 빌더

**Files:**
- Create: `src/utils/decklogPublish.ts` (타입 + `buildManageIdIndex`)
- Test: `src/utils/decklogPublish.test.ts` (스모크 테스트 대체)

**Interfaces:**
- Consumes: (없음 — 순수 함수)
- Produces:
  - `interface DeckLogCard { game_title_id: number; card_number: string; num: number; manage_id: string }`
  - `interface DeckLogPayload { game_title_id: number; deck_id: string; title: string; p_list: DeckLogCard[]; list: DeckLogCard[]; sub_list: DeckLogCard[] }`
  - `interface ManageIdIndex { byCardNumber: Map<string,string>; yellByColor: Partial<Record<CardColor,{cardNumber:string;manageId:string}>> }`
  - `function buildManageIdIndex(cards: RawCard[]): ManageIdIndex`
  - `interface RawCard { card_number: string; illustrations?: { card_number: string; manage_id?: { jp?: number[] } }[] }`

- [ ] **Step 1: 실패 테스트 작성**

`src/utils/decklogPublish.test.ts` 전체를 교체:

```ts
import { describe, it, expect } from 'vitest';
import { buildManageIdIndex } from './decklogPublish';

const RAW = [
  { card_number: 'hBD24-001', illustrations: [{ card_number: 'hBD24-001', manage_id: { jp: [199] } }] },
  { card_number: 'hBP08-001', illustrations: [
      { card_number: 'hBP08-001', manage_id: { jp: [501] } },
      { card_number: 'hBP08-001', manage_id: { jp: [502] } },
  ] },
  { card_number: 'hY01-001', illustrations: [{ card_number: 'hY01-001', manage_id: { jp: [10] } }] },
  { card_number: 'hY01-002', illustrations: [{ card_number: 'hY01-002', manage_id: { jp: [11] } }] },
  { card_number: 'hY03-001', illustrations: [{ card_number: 'hY03-001', manage_id: { jp: [30] } }] },
  { card_number: 'hBP99-XXX', illustrations: [{ card_number: 'hBP99-XXX', manage_id: {} }] }, // jp 없음
];

describe('buildManageIdIndex', () => {
  it('카드번호→첫 JP manage_id(문자열) 매핑', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.byCardNumber.get('hBD24-001')).toBe('199');
    expect(idx.byCardNumber.get('hBP08-001')).toBe('501'); // 첫 일러스트 첫 id
  });

  it('JP manage_id 없는 카드는 인덱스에 없음', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.byCardNumber.has('hBP99-XXX')).toBe(false);
  });

  it('색상별 대표 옐카드는 가장 낮은 번호', () => {
    const idx = buildManageIdIndex(RAW);
    expect(idx.yellByColor.white).toEqual({ cardNumber: 'hY01-001', manageId: '10' });
    expect(idx.yellByColor.red).toEqual({ cardNumber: 'hY03-001', manageId: '30' });
    expect(idx.yellByColor.green).toBeUndefined(); // hY02 없음
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL ("buildManageIdIndex is not a function" 등).

- [ ] **Step 3: 구현**

`src/utils/decklogPublish.ts`:

```ts
import type { CardColor } from '../types/card';

export interface DeckLogCard {
  game_title_id: number;
  card_number: string;
  num: number;
  manage_id: string;
}

export interface DeckLogPayload {
  game_title_id: number;
  deck_id: string;
  title: string;
  p_list: DeckLogCard[];
  list: DeckLogCard[];
  sub_list: DeckLogCard[];
}

export interface RawCard {
  card_number: string;
  illustrations?: { card_number: string; manage_id?: { jp?: number[] } }[];
}

export interface ManageIdIndex {
  /** card_number → manage_id (JP 기본 인쇄, 문자열). */
  byCardNumber: Map<string, string>;
  /** 색상 → 대표 옐 카드. */
  yellByColor: Partial<Record<CardColor, { cardNumber: string; manageId: string }>>;
}

/** hY0N 접두사 → 색상. */
const YELL_PREFIX_TO_COLOR: Record<string, CardColor> = {
  hY01: 'white',
  hY02: 'green',
  hY03: 'red',
  hY04: 'blue',
  hY05: 'purple',
  hY06: 'yellow',
};

function firstJpManageId(card: RawCard): string | undefined {
  const id = card.illustrations?.[0]?.manage_id?.jp?.[0];
  return id === undefined ? undefined : String(id);
}

export function buildManageIdIndex(cards: RawCard[]): ManageIdIndex {
  const byCardNumber = new Map<string, string>();
  const yellByColor: ManageIdIndex['yellByColor'] = {};

  for (const card of cards) {
    const manageId = firstJpManageId(card);
    if (!manageId) continue;
    byCardNumber.set(card.card_number, manageId);

    const prefix = card.card_number.slice(0, 4); // "hY0N"
    const color = YELL_PREFIX_TO_COLOR[prefix];
    if (color) {
      const cur = yellByColor[color];
      // 가장 낮은 카드번호를 대표로
      if (!cur || card.card_number < cur.cardNumber) {
        yellByColor[color] = { cardNumber: card.card_number, manageId };
      }
    }
  }

  return { byCardNumber, yellByColor };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/decklogPublish.ts src/utils/decklogPublish.test.ts
git commit -m "feat: build card_number to Deck Log manage_id index"
```

---

### Task 4: Deck Log 페이로드 빌더

**Files:**
- Modify: `src/utils/decklogPublish.ts` (`buildDeckLogPayload` 추가)
- Test: `src/utils/decklogPublish.test.ts` (케이스 추가)

**Interfaces:**
- Consumes: `ManageIdIndex`, `DeckLogPayload`, `DeckLogCard` (Task 3), `Deck` (`src/types/card`), `DECKLOG_GAME_TITLE_ID_JP` (`src/utils/decklogApi`)
- Produces: `function buildDeckLogPayload(deck: Deck, index: ManageIdIndex): { payload: DeckLogPayload; unpublishable: string[] }`

- [ ] **Step 1: 실패 테스트 추가**

`src/utils/decklogPublish.test.ts`에 추가:

```ts
import { buildDeckLogPayload } from './decklogPublish';
import type { Card, Deck } from '../types/card';

const idx = buildManageIdIndex(RAW);

function card(cardNumber: string): Card {
  return { id: cardNumber, name: cardNumber, type: 'holomem', setId: 's', cardNumber } as Card;
}

function makeDeck(over: Partial<Deck>): Deck {
  return {
    id: 'd', name: '테스트덱', oshi: null, mainDeck: [], cheers: {},
    createdAt: 0, updatedAt: 0, ...over,
  };
}

describe('buildDeckLogPayload', () => {
  it('오시/메인/옐을 manage_id로 변환', () => {
    const deck = makeDeck({
      oshi: card('hBD24-001'),
      mainDeck: [{ card: card('hBP08-001'), count: 4 }],
      cheers: { white: 10, red: 10 },
    });
    const { payload, unpublishable } = buildDeckLogPayload(deck, idx);
    expect(unpublishable).toEqual([]);
    expect(payload.game_title_id).toBe(9);
    expect(payload.deck_id).toBe('');
    expect(payload.p_list).toEqual([{ game_title_id: 9, card_number: 'hBD24-001', num: 1, manage_id: '199' }]);
    expect(payload.list).toEqual([{ game_title_id: 9, card_number: 'hBP08-001', num: 4, manage_id: '501' }]);
    expect(payload.sub_list).toEqual([
      { game_title_id: 9, card_number: 'hY01-001', num: 10, manage_id: '10' },
      { game_title_id: 9, card_number: 'hY03-001', num: 10, manage_id: '30' },
    ]);
  });

  it('제목은 25자로 절단', () => {
    const deck = makeDeck({ oshi: card('hBD24-001'), name: 'x'.repeat(40) });
    const { payload } = buildDeckLogPayload(deck, idx);
    expect(payload.title.length).toBe(25);
  });

  it('manage_id 없는 카드는 unpublishable에 수집', () => {
    const deck = makeDeck({ oshi: card('hBD24-001'), mainDeck: [{ card: card('hZZ00-000'), count: 1 }] });
    const { unpublishable } = buildDeckLogPayload(deck, idx);
    expect(unpublishable).toContain('hZZ00-000');
  });

  it('대표 옐카드 없는 색상은 unpublishable', () => {
    const deck = makeDeck({ oshi: card('hBD24-001'), cheers: { green: 5 } });
    const { unpublishable } = buildDeckLogPayload(deck, idx);
    expect(unpublishable.some((s) => s.includes('green'))).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL ("buildDeckLogPayload is not a function").

- [ ] **Step 3: 구현**

`src/utils/decklogPublish.ts`에 추가:

```ts
import type { Card, CardColor, Deck } from '../types/card';
import { DECKLOG_GAME_TITLE_ID_JP } from './decklogApi';

const TITLE_MAX = 25;

export function buildDeckLogPayload(
  deck: Deck,
  index: ManageIdIndex,
): { payload: DeckLogPayload; unpublishable: string[] } {
  const gid = DECKLOG_GAME_TITLE_ID_JP;
  const unpublishable: string[] = [];

  const toCard = (cardNumber: string, num: number): DeckLogCard | null => {
    const manageId = index.byCardNumber.get(cardNumber);
    if (!manageId) {
      unpublishable.push(cardNumber);
      return null;
    }
    return { game_title_id: gid, card_number: cardNumber, num, manage_id: manageId };
  };

  const p_list: DeckLogCard[] = [];
  if (deck.oshi) {
    const c = toCard(deck.oshi.cardNumber, 1);
    if (c) p_list.push(c);
  }

  const list: DeckLogCard[] = [];
  for (const e of deck.mainDeck) {
    const c = toCard(e.card.cardNumber, e.count);
    if (c) list.push(c);
  }

  const sub_list: DeckLogCard[] = [];
  const cheers = deck.cheers ?? {};
  for (const color of Object.keys(cheers) as CardColor[]) {
    const num = cheers[color] ?? 0;
    if (num <= 0) continue;
    const yell = index.yellByColor[color];
    if (!yell) {
      unpublishable.push(`(옐:${color})`);
      continue;
    }
    sub_list.push({ game_title_id: gid, card_number: yell.cardNumber, num, manage_id: yell.manageId });
  }

  const payload: DeckLogPayload = {
    game_title_id: gid,
    deck_id: '',
    title: (deck.name ?? '').slice(0, TITLE_MAX),
    p_list,
    list,
    sub_list,
  };
  return { payload, unpublishable };
}
```

> 참고: `Card` import는 테스트에서만 쓰이면 구현 파일에서 제거. 위 구현은 `Card`를 직접 쓰지 않으므로 import에서 빼도 된다(lint 통과 우선).

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (전체).

- [ ] **Step 5: lint 확인**

Run: `npm run lint`
Expected: 0 errors (미사용 import 없을 것).

- [ ] **Step 6: Commit**

```bash
git add src/utils/decklogPublish.ts src/utils/decklogPublish.test.ts
git commit -m "feat: build Deck Log payload from app deck"
```

---

### Task 5: Supabase Edge Function (얇은 프록시)

**Files:**
- Create: `supabase/functions/decklog-publish/index.ts`

**Interfaces:**
- Consumes: Task 1의 계약(엔드포인트/헤더/Content-Type/응답 필드).
- Produces: `POST {SUPABASE_URL}/functions/v1/decklog-publish` — 바디로 `DeckLogPayload`를 받아 Deck Log 응답(JSON)을 그대로 반환.

- [ ] **Step 1: 함수 작성**

`supabase/functions/decklog-publish/index.ts` (Deno). Task 1에서 확정한 엔드포인트/헤더/Content-Type을 반영:

```ts
// Deck Log JP publish 프록시. Referer/Origin을 부착해 브라우저 CORS/검증을 우회한다.
const DECKLOG_PUBLISH_URL = 'https://decklog.bushiroad.com/system/app/api/publish/9'; // Task 1 확정값
const CONTENT_TYPE: 'json' | 'form' = 'json'; // Task 1 확정값

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function encodeBody(payload: unknown): { body: string; contentType: string } {
  if (CONTENT_TYPE === 'form') {
    const params = new URLSearchParams();
    params.set('deck', JSON.stringify(payload));
    return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  return { body: JSON.stringify(payload), contentType: 'application/json' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
  try {
    const payload = await req.json();
    const { body, contentType } = encodeBody(payload);
    const upstream = await fetch(DECKLOG_PUBLISH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Referer: 'https://decklog.bushiroad.com/',
        Origin: 'https://decklog.bushiroad.com',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: 로컬 또는 원격 배포**

Run: `npx supabase functions deploy decklog-publish --no-verify-jwt`
Expected: 배포 성공, 함수 URL 출력. (`--no-verify-jwt`: 익명 anon 키 호출 허용. 프로젝트 정책에 맞게 조정.)

- [ ] **Step 3: curl로 수동 검증 (Task 1에서 캡처한 페이로드로)**

Run: 실제 유효 manage_id가 채워진 작은 페이로드를 함수 URL로 POST.
```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/decklog-publish" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"game_title_id":9,"deck_id":"","title":"test","p_list":[...],"list":[...],"sub_list":[...]}'
```
Expected: 200 + Deck Log가 반환한 새 덱 코드(JSON). 받은 코드로 `https://decklog.bushiroad.com/view/{code}` 접속 시 덱이 보일 것.

> 실패하면 Task 1의 계약(헤더/Content-Type/엔드포인트)을 재점검해 상수 수정 후 재배포.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/decklog-publish/index.ts
git commit -m "feat: add Supabase Edge Function proxy for Deck Log publish"
```

---

### Task 6: 발행 서비스 (클라이언트 오케스트레이션)

**Files:**
- Modify: `src/utils/decklogPublish.ts` (`loadManageIdIndex`, `publishToDeckLog` 추가)

**Interfaces:**
- Consumes: `buildManageIdIndex`, `buildDeckLogPayload` (Task 3·4), `supabase` (`src/lib/supabase`), `DECKLOG_VIEW_BASE_JP`/`DECKLOG_RESPONSE_CODE_FIELD` (`src/utils/decklogApi`)
- Produces:
  - `function loadManageIdIndex(): Promise<ManageIdIndex>` (fetch + 캐시)
  - `function publishToDeckLog(deck: Deck): Promise<{ url: string }>`

- [ ] **Step 1: 구현 추가**

`src/utils/decklogPublish.ts`에 추가:

```ts
import { supabase } from '../lib/supabase';
import { DECKLOG_VIEW_BASE_JP, DECKLOG_RESPONSE_CODE_FIELD } from './decklogApi';

const CARDS_JSON_URL = 'https://qrimpuff.github.io/hocg-fan-sim-assets/hocg_cards.json';

let cachedIndex: ManageIdIndex | null = null;

export async function loadManageIdIndex(): Promise<ManageIdIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(CARDS_JSON_URL);
  if (!res.ok) throw new Error('카드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  const json = (await res.json()) as RawCard[];
  cachedIndex = buildManageIdIndex(json);
  return cachedIndex;
}

export async function publishToDeckLog(deck: Deck): Promise<{ url: string }> {
  const index = await loadManageIdIndex();
  const { payload, unpublishable } = buildDeckLogPayload(deck, index);
  if (unpublishable.length > 0) {
    throw new Error('다음 카드는 Deck Log에 발행할 수 없습니다: ' + unpublishable.join(', '));
  }
  const { data, error } = await supabase.functions.invoke('decklog-publish', { body: payload });
  if (error) throw new Error('Deck Log 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
  const code = (data as Record<string, unknown> | null)?.[DECKLOG_RESPONSE_CODE_FIELD];
  if (!code || typeof code !== 'string') {
    throw new Error('Deck Log 응답을 인식하지 못했습니다.');
  }
  return { url: `${DECKLOG_VIEW_BASE_JP}${code}` };
}
```

- [ ] **Step 2: 타입/빌드 확인**

Run: `npm run build`
Expected: tsc 통과(타입 에러 0), vite 빌드 성공.

- [ ] **Step 3: 단위 테스트 회귀 확인**

Run: `npm test`
Expected: 기존 테스트 모두 PASS(추가 fetch/supabase 코드는 순수 함수 테스트에 영향 없음).

- [ ] **Step 4: Commit**

```bash
git add src/utils/decklogPublish.ts
git commit -m "feat: add Deck Log publish orchestration service"
```

---

### Task 7: UI — "Deck Log에 업로드" 버튼 + 결과

**Files:**
- Modify: `src/components/DeckPanel.tsx` (`ExportPanel`)

**Interfaces:**
- Consumes: `publishToDeckLog` (Task 6), `getActiveDeck`/`getDeckErrors` (deckStore)

- [ ] **Step 1: ExportPanel에 상태/핸들러 추가**

`ExportPanel` 컴포넌트 상단에 import 및 상태 추가:

```ts
import { publishToDeckLog } from '../utils/decklogPublish';
```
```ts
const { exportDeckText, getActiveDeck, getDeckErrors } = useDeckStore();
const [publishing, setPublishing] = useState(false);
const [publishUrl, setPublishUrl] = useState<string | null>(null);
const [publishError, setPublishError] = useState<string | null>(null);

async function handlePublish() {
  const deck = getActiveDeck();
  if (!deck) return;
  setPublishing(true);
  setPublishError(null);
  setPublishUrl(null);
  try {
    const { url } = await publishToDeckLog(deck);
    setPublishUrl(url);
  } catch (e) {
    setPublishError(e instanceof Error ? e.message : 'Deck Log 업로드에 실패했습니다.');
  } finally {
    setPublishing(false);
  }
}
```

> `ExportPanel`은 이미 `shareDisabled`(= 덱 검증 오류 여부)를 prop으로 받는다. 업로드 버튼도 동일 게이트(`shareDisabled`)를 사용한다.

- [ ] **Step 2: 버튼 + 결과 UI 추가**

`ExportPanel`의 보조 액션 영역(텍스트 복사 줄) 아래에 추가:

```tsx
<div className="flex flex-col gap-1 pt-1">
  <button
    onClick={handlePublish}
    disabled={shareDisabled || publishing}
    title={shareDisabled ? '덱 검증 오류를 먼저 해결해주세요' : 'Deck Log에 업로드하고 공유 링크를 받습니다 (기본 일러스트로 발행)'}
    className="w-full py-2 rounded-lg text-sm font-medium bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 text-white border border-emerald-600 disabled:border-gray-700 transition-colors"
  >
    {publishing ? '업로드 중…' : 'Deck Log에 업로드'}
  </button>
  <p className="text-[10px] text-gray-500 text-center">
    아트 변형은 반영되지 않고 기본 일러스트로 발행됩니다.
  </p>
  {publishUrl && (
    <div className="flex items-center gap-1 text-[11px]">
      <a href={publishUrl} target="_blank" rel="noreferrer" className="flex-1 truncate text-emerald-300 hover:underline">
        {publishUrl}
      </a>
      <button
        onClick={() => navigator.clipboard.writeText(publishUrl)}
        className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
      >
        링크 복사
      </button>
    </div>
  )}
  {publishError && (
    <p className="text-[11px] text-amber-400 break-words">{publishError}</p>
  )}
</div>
```

- [ ] **Step 3: 빌드/lint 확인**

Run: `npm run build && npm run lint`
Expected: 빌드 성공, lint 0 errors.

- [ ] **Step 4: dev에서 수동 검증**

Run: `npm run dev` → 유효한 50장 덱 구성 → "Deck Log에 업로드" 클릭 → 링크 수신 → 링크 열어 오시/메인/옐 색상 분포 일치 확인. 검증 오류 덱은 버튼 비활성 확인. manage_id 누락 카드 포함 시 안내 메시지 확인.

- [ ] **Step 5: Commit**

```bash
git add src/components/DeckPanel.tsx
git commit -m "feat: add Deck Log upload button to deck panel"
```

---

## Self-Review (작성자 점검 결과)

- **스펙 커버리지:** manage_id 매핑(Task 3), 옐 매핑(Task 3), 페이로드/제목절단/누락처리(Task 4), Edge Function 프록시·헤더(Task 5), 발행 오케스트레이션·URL 조립(Task 6), UI·게이트·아트변형 안내(Task 7), 엔드포인트 확정(Task 1) — 스펙 각 절에 대응 태스크 존재.
- **플레이스홀더:** Task 1 산출물(`decklogApi.ts`)의 엔드포인트/헤더는 "스파이크에서 확정"이 본질인 known-unknown이며, 가정값을 실제 코드로 제공하고 캡처로 교체하는 구조 — 빈 TODO 아님.
- **타입 일관성:** `ManageIdIndex`/`DeckLogPayload`/`DeckLogCard`가 Task 3에서 정의되어 4·6에서 동일 시그니처로 사용. `DECKLOG_*` 상수는 Task 1에서 정의되어 4·5·6에서 사용.
- **알려진 한계:** `Card` 미사용 import 주의(Task 4 Step3 노트), Edge Function의 Content-Type은 Task 1 결과로 `encodeBody`에서 분기.
