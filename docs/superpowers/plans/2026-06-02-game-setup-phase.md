# 게임 셋업 단계 + 로비 솔로 대전 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hololive TCG 게임의 셋업 단계(덱 배치→라이프→선후공→멀리건→데뷔 배치)를 로컬 핫시트로 구현하고, 로비에서 덱 2개로 혼자 대전을 시작하는 진입점을 추가한다.

**Architecture:** 프레임워크 비의존 순수 규칙 모듈(`src/game/`)이 셔플·배분·멀리건·배치 규칙을 담당하고, 얇은 Zustand `gameStore`가 상태를 보관하며 그 함수들을 호출한다. UI(GamePage/GameBoard/SetupOverlay/HandArea)는 스토어를 구독한다. 핫시트는 `activeActor`를 P1→P2로 전환하며 진행한다.

**Tech Stack:** Vite + React + TypeScript + Tailwind CSS v4 + Zustand. 스펙: `docs/superpowers/specs/2026-06-02-game-setup-phase-design.md`.

**검증 방식:** 이 프로젝트는 테스트 러너가 없다. 각 task는 `npm run build`(타입/컴파일) + `npm run lint` + (UI는) 수동 확인으로 검증한다. 순수 함수(`src/game/`)는 부수효과 없이 작성해 추후 vitest 추가가 가능하도록 유지한다.

**커밋:** 커밋 단계는 스킬 관례상 포함했다. 실제 커밋은 사용자 요청 시에만 수행한다(현재 브랜치 master, 프로젝트 관례=한국어 커밋 메시지). 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` 추가.

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `src/game/rng.ts` (생성) | 시드 PRNG(mulberry32) + `shuffle` |
| `src/game/types.ts` (생성) | 게임 상태 타입 (PlayerId, CardInstance, PlayerState, Phase, Slot, GameState) |
| `src/game/setup.ts` (생성) | 순수 규칙 함수 (전개·셔플·라이프·드로우·멀리건·페널티·배치·판정) |
| `src/store/gameStore.ts` (생성) | Zustand 스토어 + 핫시트 phase 전환 로직 |
| `src/components/GameBoard.tsx` (수정) | zone에 실제 카드 렌더 + 배치 가능 zone 하이라이트/클릭 |
| `src/components/game/HandArea.tsx` (생성) | 클릭 선택 가능한 패 |
| `src/components/game/SetupOverlay.tsx` (생성) | 현재 phase·actor 안내 + 행동 버튼 |
| `src/pages/GamePage.tsx` (수정) | gameStore 구독으로 재작성, mode별 init |
| `src/pages/LobbyPage.tsx` (수정) | "혼자 연습 대전" 섹션 추가 |

`src/router.tsx`는 수정 불필요 — 기존 `/game/:code`가 `/game/solo`를 `code='solo'`로 매칭한다.

---

## Task 1: 시드 RNG 모듈

**Files:**
- Create: `src/game/rng.ts`

- [ ] **Step 1: `src/game/rng.ts` 작성**

```ts
/** 시드 가능한 PRNG. 동일 seed → 동일 수열 (재현성/테스트/향후 공유시드 네트워크 대비). */
export type Rng = () => number; // [0, 1)

/** mulberry32 PRNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32비트 무작위 시드. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/** Fisher–Yates. 원본을 변형하지 않고 새 배열 반환. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 배열에서 하나를 무작위 선택. */
export function pickOne<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built` (타입/컴파일 통과)

- [ ] **Step 3: 커밋**

```bash
git add src/game/rng.ts
git commit -m "게임 셋업: 시드 RNG 모듈 추가"
```

---

## Task 2: 게임 상태 타입

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: `src/game/types.ts` 작성**

```ts
import type { Card, CardColor } from '../types/card';

export type PlayerId = 'p1' | 'p2';

/** 메인덱 카드 인스턴스 — 같은 카드 여러 장을 uid로 구분. */
export interface CardInstance {
  uid: string;
  card: Card;
  imageUrl?: string;
}

/** 데뷔 배치 대상 슬롯. */
export type Slot = { zone: 'center' } | { zone: 'back'; index: number };

export interface PlayerState {
  name: string;
  oshi: Card | null;
  oshiImageUrl?: string;
  deck: CardInstance[]; // 셔플된 메인덱, index 0 = 맨 위
  hand: CardInstance[];
  cheerDeck: CardColor[]; // 셔플된 옐덱, index 0 = 맨 위
  life: CardColor[]; // 라이프(뒷면). cheerDeck 위에서 oshi.life장
  center: CardInstance | null; // 센터 (데뷔 필수)
  back: (CardInstance | null)[]; // 백 1~5 (길이 5, null = 빈 슬롯)
  mulliganUsed: boolean; // 임의 멀리건으로 다시 뽑았는지
  mulliganDecided: boolean; // 임의 멀리건 단계(유지/다시)를 마쳤는지
  forcedMulligans: number; // 데뷔 없음으로 강제 재멀리건한 횟수 (페널티 카운트)
  penaltyDone: boolean; // 페널티 카드 반납 완료
  ready: boolean; // 데뷔 배치 확정
}

export type Phase =
  | 'idle' // 게임 시작 전 (init 대기)
  | 'firstPlayer' // 시스템이 무작위 지목한 플레이어가 선/후공 결정
  | 'mulligan' // activeActor 임의 멀리건(유지/다시) 결정
  | 'debutCheck' // activeActor 데뷔 없으면 공개 + 강제 재멀리건 반복
  | 'penalty' // activeActor 강제 멀리건 횟수만큼 패 → 덱 맨 아래
  | 'placeDebut' // activeActor 센터(필수) + 백(선택) 데뷔 배치
  | 'ready'; // 셋업 완료

export type GameMode = 'solo' | 'dev' | 'online';

export interface GameState {
  phase: Phase;
  mode: GameMode;
  players: Record<PlayerId, PlayerState>;
  randomlyPicked: PlayerId | null; // 선후공 결정권자 (시스템 무작위)
  firstPlayer: PlayerId | null; // 선공 확정
  activeActor: PlayerId; // 핫시트: 지금 조작 대상
  seed: number;
}

export const OTHER: Record<PlayerId, PlayerId> = { p1: 'p2', p2: 'p1' };
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/game/types.ts
git commit -m "게임 셋업: 게임 상태 타입 정의"
```

---

## Task 3: 순수 규칙 — 전개/초기화/판정

**Files:**
- Create: `src/game/setup.ts`

- [ ] **Step 1: `src/game/setup.ts` 작성 (초기화 부분)**

```ts
import type { Card, CardColor, Deck, DeckEntry } from '../types/card';
import type { CardInstance, PlayerState } from './types';
import { shuffle, type Rng } from './rng';

export const HAND_SIZE = 7;
export const BACK_SLOTS = 5;

/** 데뷔 홀로멤 여부. */
export function isDebut(card: Card): boolean {
  return card.type === 'holomem' && card.holomemSubtype === 'debut';
}

/** 패에 데뷔가 1장이라도 있는지. */
export function handHasDebut(hand: CardInstance[]): boolean {
  return hand.some((ci) => isDebut(ci.card));
}

/** 메인덱 엔트리(card×count)를 개별 인스턴스로 전개. uid는 결정적. */
export function expandMainDeck(entries: DeckEntry[]): CardInstance[] {
  const out: CardInstance[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) {
      out.push({
        uid: `${e.card.id}::${e.imageUrl ?? ''}#${i}`,
        card: e.card,
        imageUrl: e.imageUrl,
      });
    }
  }
  return out;
}

/** 옐덱(색상 맵)을 색상 배열로 전개. */
export function expandCheers(cheers: Partial<Record<CardColor, number>>): CardColor[] {
  const out: CardColor[] = [];
  (Object.keys(cheers) as CardColor[]).forEach((color) => {
    const n = cheers[color] ?? 0;
    for (let i = 0; i < n; i++) out.push(color);
  });
  return out;
}

/**
 * 게임 시작용 플레이어 상태 구성:
 * 메인덱/옐덱 셔플 → 라이프(oshi.life장) 분리 → 7장 드로우.
 */
export function buildPlayerState(deck: Deck, name: string, rng: Rng): PlayerState {
  const fullDeck = shuffle(expandMainDeck(deck.mainDeck), rng);
  const fullCheer = shuffle(expandCheers(deck.cheers), rng);
  const lifeCount = Math.min(deck.oshi?.life ?? 0, fullCheer.length);
  return {
    name,
    oshi: deck.oshi,
    oshiImageUrl: deck.oshiImageUrl,
    deck: fullDeck.slice(HAND_SIZE),
    hand: fullDeck.slice(0, HAND_SIZE),
    life: fullCheer.slice(0, lifeCount),
    cheerDeck: fullCheer.slice(lifeCount),
    center: null,
    back: Array(BACK_SLOTS).fill(null),
    mulliganUsed: false,
    mulliganDecided: false,
    forcedMulligans: 0,
    penaltyDone: false,
    ready: false,
  };
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/game/setup.ts
git commit -m "게임 셋업: 덱 전개·초기화·데뷔 판정 순수 함수"
```

---

## Task 4: 순수 규칙 — 멀리건/페널티/배치

**Files:**
- Modify: `src/game/setup.ts` (Task 3에 이어 함수 추가)

- [ ] **Step 1: `src/game/setup.ts`에 액션 함수 추가**

파일 상단 import에 `Slot` 추가:

```ts
import type { CardInstance, PlayerState, Slot } from './types';
```

파일 끝에 다음 함수들을 추가:

```ts
/** 임의 멀리건: 패 전체를 덱에 넣고 셔플 후 7장. 페널티 없음(1회). */
export function mulliganRedraw(p: PlayerState, rng: Rng): PlayerState {
  const combined = shuffle([...p.deck, ...p.hand], rng);
  return {
    ...p,
    deck: combined.slice(HAND_SIZE),
    hand: combined.slice(0, HAND_SIZE),
    mulliganUsed: true,
    mulliganDecided: true,
  };
}

/** 강제 재멀리건 1회(데뷔 없음): 덱에 넣고 셔플 → 7장. forcedMulligans++. */
export function forcedRedraw(p: PlayerState, rng: Rng): PlayerState {
  const combined = shuffle([...p.deck, ...p.hand], rng);
  return {
    ...p,
    deck: combined.slice(HAND_SIZE),
    hand: combined.slice(0, HAND_SIZE),
    forcedMulligans: p.forcedMulligans + 1,
  };
}

/** 선택한 카드(uid)를 패에서 빼 덱 맨 아래로(선택 순서대로). */
export function applyPenalty(p: PlayerState, uids: string[]): PlayerState {
  const uidSet = new Set(uids);
  const remainingHand: CardInstance[] = [];
  const byUid = new Map<string, CardInstance>();
  for (const ci of p.hand) {
    if (uidSet.has(ci.uid)) byUid.set(ci.uid, ci);
    else remainingHand.push(ci);
  }
  // 선택 순서(uids) 유지
  const chosen = uids.map((u) => byUid.get(u)).filter((c): c is CardInstance => !!c);
  return {
    ...p,
    hand: remainingHand,
    deck: [...p.deck, ...chosen], // 맨 아래
    penaltyDone: true,
  };
}

/** 패의 데뷔 카드(uid)를 슬롯(센터/백)에 배치. 기존 카드는 패로 되돌림. 데뷔만 허용. */
export function placeDebut(p: PlayerState, uid: string, slot: Slot): PlayerState {
  const ci = p.hand.find((c) => c.uid === uid);
  if (!ci || !isDebut(ci.card)) return p;
  const hand = p.hand.filter((c) => c.uid !== uid);
  if (slot.zone === 'center') {
    return {
      ...p,
      hand: p.center ? [...hand, p.center] : hand,
      center: ci,
    };
  }
  const back = p.back.slice();
  const displaced = back[slot.index];
  back[slot.index] = ci;
  return { ...p, hand: displaced ? [...hand, displaced] : hand, back };
}

/** 슬롯(센터/백)의 카드를 패로 되돌림. */
export function unplaceDebut(p: PlayerState, slot: Slot): PlayerState {
  if (slot.zone === 'center') {
    if (!p.center) return p;
    return { ...p, hand: [...p.hand, p.center], center: null };
  }
  const back = p.back.slice();
  const ci = back[slot.index];
  if (!ci) return p;
  back[slot.index] = null;
  return { ...p, hand: [...p.hand, ci], back };
}

/** 시작 확정 가능 여부: 센터에 데뷔가 있어야 함. */
export function canConfirmReady(p: PlayerState): boolean {
  return p.center !== null && isDebut(p.center.card);
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/game/setup.ts
git commit -m "게임 셋업: 멀리건·페널티·데뷔 배치 순수 함수"
```

---

## Task 5: gameStore (Zustand + 핫시트 phase 전환)

**Files:**
- Create: `src/store/gameStore.ts`

핫시트 진행 순서(선형): 선후공 결정 → [선공, 후공] 순서로 각자 (멀리건→데뷔체크→페널티) → [선공, 후공] 순서로 데뷔 배치 → ready.

- [ ] **Step 1: `src/store/gameStore.ts` 작성**

```ts
import { create } from 'zustand';
import type { Deck } from '../types/card';
import type { GameMode, GameState, PlayerId, PlayerState, Slot } from '../game/types';
import { OTHER } from '../game/types';
import { mulberry32, randomSeed, type Rng } from '../game/rng';
import * as rules from '../game/setup';

interface InitOpts {
  mode: GameMode;
  p1Name?: string;
  p2Name?: string;
  seed?: number;
}

interface GameStore extends GameState {
  initGame: (p1Deck: Deck, p2Deck: Deck, opts: InitOpts) => void;
  decideFirstPlayer: (first: PlayerId) => void;
  mulligan: (redraw: boolean) => void; // activeActor 대상
  forcedMulligan: () => void; // activeActor 대상 (데뷔 없을 때 다시 뽑기)
  applyPenalty: (uids: string[]) => void; // activeActor 대상
  placeDebut: (uid: string, slot: Slot) => void; // activeActor 대상
  unplaceDebut: (slot: Slot) => void; // activeActor 대상
  confirmReady: () => void; // activeActor 대상
  reset: () => void;
}

const EMPTY: GameState = {
  phase: 'idle',
  mode: 'dev',
  players: {
    p1: emptyPlayer('P1'),
    p2: emptyPlayer('P2'),
  },
  randomlyPicked: null,
  firstPlayer: null,
  activeActor: 'p1',
  seed: 0,
};

function emptyPlayer(name: string): PlayerState {
  return {
    name,
    oshi: null,
    deck: [],
    hand: [],
    cheerDeck: [],
    life: [],
    center: null,
    back: [null, null, null, null, null],
    mulliganUsed: false,
    mulliganDecided: false,
    forcedMulligans: 0,
    penaltyDone: false,
    ready: false,
  };
}

/** 멀리건/데뷔체크/페널티를 마친 activeActor 다음의 phase·actor를 계산. */
function advanceAfterMulliganDone(s: GameState): Partial<GameState> {
  const other = OTHER[s.activeActor];
  if (!s.players[other].mulliganDecided) {
    // 상대 멀리건 차례
    return { phase: 'mulligan', activeActor: other };
  }
  // 양쪽 멀리건 완료 → 데뷔 배치(선공부터)
  const first = s.firstPlayer ?? 'p1';
  return { phase: 'placeDebut', activeActor: first };
}

/** activeActor의 멀리건 결정 직후: 데뷔 유무에 따라 debutCheck/penalty/다음으로. */
function afterMulliganDecision(s: GameState): Partial<GameState> {
  const p = s.players[s.activeActor];
  if (!rules.handHasDebut(p.hand)) {
    return { phase: 'debutCheck' }; // 공개 + 다시 뽑기 (UI가 forcedMulligan 호출)
  }
  if (p.forcedMulligans > 0 && !p.penaltyDone) {
    return { phase: 'penalty' };
  }
  return advanceAfterMulliganDone(s);
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY,

  initGame: (p1Deck, p2Deck, opts) => {
    const seed = opts.seed ?? randomSeed();
    const rng: Rng = mulberry32(seed);
    const p1 = rules.buildPlayerState(p1Deck, opts.p1Name ?? 'P1', rng);
    const p2 = rules.buildPlayerState(p2Deck, opts.p2Name ?? 'P2', rng);
    const picked: PlayerId = rng() < 0.5 ? 'p1' : 'p2';
    set({
      phase: 'firstPlayer',
      mode: opts.mode,
      players: { p1, p2 },
      randomlyPicked: picked,
      firstPlayer: null,
      activeActor: picked,
      seed,
    });
  },

  decideFirstPlayer: (first) => {
    set({ firstPlayer: first, phase: 'mulligan', activeActor: first });
  },

  mulligan: (redraw) => {
    const s = get();
    const pid = s.activeActor;
    const rng = mulberry32(s.seed + 1 + s.players[pid].forcedMulligans);
    const updated = redraw
      ? rules.mulliganRedraw(s.players[pid], rng)
      : { ...s.players[pid], mulliganDecided: true };
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    set({ players: next.players, ...afterMulliganDecision(next) });
  },

  forcedMulligan: () => {
    const s = get();
    const pid = s.activeActor;
    const rng = mulberry32(s.seed + 100 + s.players[pid].forcedMulligans);
    const updated = rules.forcedRedraw(s.players[pid], rng);
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    if (!rules.handHasDebut(updated.hand)) {
      set({ players: next.players, phase: 'debutCheck' });
      return;
    }
    if (updated.forcedMulligans > 0 && !updated.penaltyDone) {
      set({ players: next.players, phase: 'penalty' });
      return;
    }
    set({ players: next.players, ...advanceAfterMulliganDone(next) });
  },

  applyPenalty: (uids) => {
    const s = get();
    const pid = s.activeActor;
    const updated = rules.applyPenalty(s.players[pid], uids);
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    set({ players: next.players, ...advanceAfterMulliganDone(next) });
  },

  placeDebut: (uid, slot) => {
    const s = get();
    const pid = s.activeActor;
    set({ players: { ...s.players, [pid]: rules.placeDebut(s.players[pid], uid, slot) } });
  },

  unplaceDebut: (slot) => {
    const s = get();
    const pid = s.activeActor;
    set({ players: { ...s.players, [pid]: rules.unplaceDebut(s.players[pid], slot) } });
  },

  confirmReady: () => {
    const s = get();
    const pid = s.activeActor;
    if (!rules.canConfirmReady(s.players[pid])) return;
    const players = { ...s.players, [pid]: { ...s.players[pid], ready: true } };
    const other = OTHER[pid];
    if (!players[other].ready) {
      set({ players, activeActor: other }); // 상대 데뷔 배치 차례
    } else {
      set({ players, phase: 'ready' });
    }
  },

  reset: () => set({ ...EMPTY }),
}));
```

> 주의: `mulligan`/`forcedMulligan`은 `seed`에서 파생한 별도 시드로 셔플해 결정성을 유지한다. 같은 게임에서 재멀리건 횟수에 따라 다른 수열을 쓰도록 오프셋을 더한다.

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/store/gameStore.ts
git commit -m "게임 셋업: gameStore(상태+핫시트 phase 전환)"
```

---

## Task 6: GameBoard — 실제 카드 렌더 + 배치 하이라이트

기존 `GameBoard.tsx`는 빈 zone만 렌더한다. props로 `PlayerState`와 배치 상호작용을 받아 카드/스택을 렌더하고, 데뷔 배치 가능 슬롯을 강조·클릭 가능하게 확장한다. `--cw`/레이아웃/`mirrored` 회전 등 기존 구조는 유지한다.

**Files:**
- Modify: `src/components/GameBoard.tsx`

- [ ] **Step 1: `GameBoard.tsx` 전체 교체**

```tsx
import type { CSSProperties } from 'react';
import type { CardColor } from '../types/card';
import type { CardInstance, PlayerState, Slot } from '../game/types';

type Orientation = 'portrait' | 'landscape';

interface GameBoardProps {
  player: PlayerState;
  mirrored?: boolean;
  /** 강조(점멸)할 배치 가능 슬롯들. */
  highlightSlots?: Slot[];
  /** 슬롯 클릭 콜백 (배치/해제). */
  onSlotClick?: (slot: Slot) => void;
}

const COLOR_BG: Record<CardColor, string> = {
  white: 'bg-gray-200',
  green: 'bg-green-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-400',
};

function slotEq(a: Slot, b: Slot): boolean {
  if (a.zone !== b.zone) return false;
  return a.zone === 'center' || a.index === (b as { index: number }).index;
}

/** 카드 인스턴스(앞면) 또는 빈 zone. */
function CardSlot({
  label,
  card,
  orientation = 'portrait',
  mirrored = false,
  highlighted = false,
  onClick,
  className = '',
}: {
  label: string;
  card?: CardInstance | null;
  orientation?: Orientation;
  mirrored?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const size =
    orientation === 'landscape'
      ? 'w-[calc(var(--cw)*1.4)] aspect-[7/5]'
      : 'w-[var(--cw)] aspect-[5/7]';
  const img = card?.imageUrl ?? card?.card.imageUrl;
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`relative ${size} shrink-0 rounded-md border flex items-center justify-center overflow-hidden ${
        highlighted
          ? 'border-amber-300 ring-2 ring-amber-300/70 animate-pulse cursor-pointer'
          : card
            ? 'border-gray-600'
            : 'border-dashed border-indigo-300/20 bg-indigo-400/[0.04]'
      } ${clickable ? 'cursor-pointer' : ''} ${className}`}
    >
      {card ? (
        img ? (
          <img src={img} alt={card.card.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className={`text-[8px] text-gray-300 p-0.5 text-center leading-tight ${mirrored ? 'rotate-180' : ''}`}>
            {card.card.name}
          </span>
        )
      ) : (
        <span
          className={`select-none text-center leading-tight text-[clamp(7px,1.05vw,11px)] text-gray-500 px-1 ${
            mirrored ? 'rotate-180' : ''
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** 라이프 zone(가로) + 라이프 색상 스택. */
function LifeZone({ life, mirrored }: { life: CardColor[]; mirrored: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[calc(var(--cw)*0.06)]">
      <div className="relative w-[calc(var(--cw)*1.4)] aspect-[7/5] shrink-0 rounded-md border border-dashed border-indigo-300/20 bg-indigo-400/[0.04] flex items-center justify-center">
        <span className={`text-[clamp(7px,1.05vw,11px)] text-gray-500 ${mirrored ? 'rotate-180' : ''}`}>
          라이프 {life.length}
        </span>
      </div>
      <div className="flex flex-col gap-[calc(var(--cw)*0.04)] w-[calc(var(--cw)*1.4)]">
        {life.map((color, i) => (
          <div
            key={i}
            className={`h-[calc(var(--cw)*0.1)] rounded-sm border border-black/20 ${COLOR_BG[color]} opacity-80`}
          />
        ))}
      </div>
    </div>
  );
}

/** 덱/옐덱 등 카드 더미(뒷면 + 장수). */
function PileZone({ label, count, mirrored }: { label: string; count: number; mirrored: boolean }) {
  return (
    <div className="relative w-[var(--cw)] aspect-[5/7] shrink-0 rounded-md border border-gray-600 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 flex flex-col items-center justify-center gap-0.5">
      <span className={`text-[clamp(7px,1.05vw,11px)] text-gray-400 ${mirrored ? 'rotate-180' : ''}`}>{label}</span>
      <span className={`text-[clamp(8px,1.2vw,13px)] font-bold text-gray-200 ${mirrored ? 'rotate-180' : ''}`}>{count}</span>
    </div>
  );
}

/**
 * 한 플레이어의 게임판. mirrored=true 면 180° 회전(상대 판), 라벨은 내부에서 보정.
 */
export default function GameBoard({ player, mirrored = false, highlightSlots = [], onSlotClick }: GameBoardProps) {
  const cellGap = 'gap-x-[calc(var(--cw)*0.12)]';
  const isHi = (slot: Slot) => highlightSlots.some((h) => slotEq(h, slot));
  const click = (slot: Slot) => (onSlotClick ? () => onSlotClick(slot) : undefined);

  return (
    <div
      className={`flex items-stretch justify-center gap-[calc(var(--cw)*0.2)] h-[calc(var(--cw)*3.6)] ${
        mirrored ? 'rotate-180' : ''
      }`}
      style={{ '--cw': 'clamp(20px, min(11.5cqw, 11.5cqh), 150px)' } as CSSProperties}
    >
      {/* 좌측 열: 라이프(상) / 옐 덱(하) */}
      <div className="flex flex-col justify-between items-center h-full">
        <LifeZone life={player.life} mirrored={mirrored} />
        <PileZone label="옐 덱" count={player.cheerDeck.length} mirrored={mirrored} />
      </div>

      {/* 중앙: 전열(콜라보·센터·오시) + 후열(백1~5) */}
      <div className={`grid grid-cols-[repeat(5,var(--cw))] grid-rows-2 content-between ${cellGap} h-full`}>
        <CardSlot label="콜라보 포지션" mirrored={mirrored} className="col-start-1 row-start-1" />
        <CardSlot
          label="센터 포지션"
          card={player.center}
          mirrored={mirrored}
          highlighted={isHi({ zone: 'center' })}
          onClick={click({ zone: 'center' })}
          className="col-start-3 row-start-1"
        />
        <CardSlot
          label="오시 포지션"
          card={player.oshi ? { uid: 'oshi', card: player.oshi, imageUrl: player.oshiImageUrl } : null}
          mirrored={mirrored}
          className="col-start-5 row-start-1"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <CardSlot
            key={i}
            label={`백 포지션 ${i + 1}`}
            card={player.back[i]}
            mirrored={mirrored}
            highlighted={isHi({ zone: 'back', index: i })}
            onClick={click({ zone: 'back', index: i })}
            className={`col-start-${i + 1} row-start-2`}
          />
        ))}
      </div>

      {/* 우측 열: 홀로 파워(상) / 덱(중) / 아카이브(하) */}
      <div className="flex flex-col justify-between items-center h-full">
        <CardSlot label="홀로 파워" orientation="landscape" mirrored={mirrored} />
        <PileZone label="덱" count={player.deck.length} mirrored={mirrored} />
        <CardSlot label="아카이브" orientation="landscape" mirrored={mirrored} />
      </div>
    </div>
  );
}
```

> 주의: `col-start-${i+1}` 같은 동적 클래스는 Tailwind JIT가 소스에서 문자열을 정적으로 못 볼 수 있다. 기존 GameBoard처럼 **명시적 클래스**(`col-start-1`..`col-start-5`)를 쓰는 것이 안전하다. 동적 생성 대신 아래처럼 배열 매핑으로 명시 클래스를 나열할 것:
>
> ```tsx
> const BACK_COLS = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5'];
> // ... className={`${BACK_COLS[i]} row-start-2`}
> ```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/components/GameBoard.tsx
git commit -m "게임 셋업: GameBoard 실제 카드 렌더+배치 하이라이트"
```

---

## Task 7: HandArea — 클릭 선택 가능한 패

**Files:**
- Create: `src/components/game/HandArea.tsx`

선택 모드: `'select'`(데뷔 배치용 단일 선택) | `'multi'`(페널티용 다중 선택) | `'view'`(상세 보기만).

- [ ] **Step 1: `src/components/game/HandArea.tsx` 작성**

```tsx
import type { CSSProperties } from 'react';
import type { CardInstance } from '../../game/types';
import { isDebut } from '../../game/setup';

interface HandAreaProps {
  hand: CardInstance[];
  /** 강조(선택됨)할 카드 uid 집합. */
  selectedUids: string[];
  /** 카드 클릭. */
  onCardClick: (ci: CardInstance) => void;
  /** 데뷔만 활성(배치 단계)일 때 true → 비데뷔는 흐리게. */
  debutOnly?: boolean;
  emptyText?: string;
}

const handVars = { '--hcw': 'clamp(40px, min(13.5cqw, 14cqh), 120px)' } as CSSProperties;

export default function HandArea({
  hand,
  selectedUids,
  onCardClick,
  debutOnly = false,
  emptyText = '패가 비어 있습니다.',
}: HandAreaProps) {
  return (
    <div className="flex gap-1 overflow-x-auto items-center pt-0.5" style={handVars}>
      {hand.length === 0 ? (
        <p className="text-[11px] text-gray-600 px-1">{emptyText}</p>
      ) : (
        hand.map((ci) => {
          const img = ci.imageUrl ?? ci.card.imageUrl;
          const selected = selectedUids.includes(ci.uid);
          const dimmed = debutOnly && !isDebut(ci.card);
          return (
            <button
              key={ci.uid}
              onClick={() => onCardClick(ci)}
              className={`w-[var(--hcw)] shrink-0 rounded overflow-hidden border transition-all ${
                selected
                  ? 'border-amber-300 ring-2 ring-amber-300 -translate-y-1'
                  : 'border-gray-700 hover:border-gray-500'
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              {img ? (
                <img src={img} alt={ci.card.name} className="w-full block" draggable={false} />
              ) : (
                <div className="w-full aspect-[5/7] flex items-center justify-center text-[8px] text-gray-500 p-0.5 text-center leading-tight">
                  {ci.card.name}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/components/game/HandArea.tsx
git commit -m "게임 셋업: HandArea 클릭 선택 패 컴포넌트"
```

---

## Task 8: SetupOverlay — phase별 안내 + 행동 버튼

**Files:**
- Create: `src/components/game/SetupOverlay.tsx`

phase별로 안내 문구와 버튼을 렌더. 행동은 gameStore 액션 호출. 페널티/데뷔 선택 상태(선택된 uid)는 GamePage가 보유하고 props로 전달.

- [ ] **Step 1: `src/components/game/SetupOverlay.tsx` 작성**

```tsx
import type { PlayerId, PlayerState, Phase } from '../../game/types';

interface SetupOverlayProps {
  phase: Phase;
  activeActor: PlayerId;
  actorState: PlayerState;
  randomlyPicked: PlayerId | null;
  penaltyRemaining: number; // 페널티에서 더 골라야 하는 수
  canPlaceConfirm: boolean; // 센터에 데뷔 배치됨
  onDecideFirst: (first: PlayerId) => void;
  onMulligan: (redraw: boolean) => void;
  onForcedMulligan: () => void;
  onApplyPenalty: () => void;
  onConfirmReady: () => void;
}

function actorLabel(pid: PlayerId): string {
  return pid === 'p1' ? 'P1' : 'P2';
}

const btn =
  'px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function SetupOverlay(props: SetupOverlayProps) {
  const { phase, activeActor, actorState, randomlyPicked, penaltyRemaining, canPlaceConfirm } = props;
  const who = actorLabel(activeActor);

  return (
    <div className="shrink-0 flex items-center justify-center gap-3 px-3 py-2 bg-gray-900/80 border-b border-gray-800 min-h-[44px] flex-wrap">
      {phase === 'firstPlayer' && (
        <>
          <span className="text-xs text-gray-300">
            시스템이 <b className="text-amber-300">{actorLabel(randomlyPicked ?? activeActor)}</b>를 뽑았습니다. 선/후공을 결정하세요.
          </span>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={() => props.onDecideFirst(activeActor)}>
            선공
          </button>
          <button className={`${btn} bg-gray-700 hover:bg-gray-600 text-white`} onClick={() => props.onDecideFirst(activeActor === 'p1' ? 'p2' : 'p1')}>
            후공
          </button>
        </>
      )}

      {phase === 'mulligan' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 멀리건 (7장 다시 뽑기)?</span>
          <button className={`${btn} bg-gray-700 hover:bg-gray-600 text-white`} onClick={() => props.onMulligan(false)}>그대로</button>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={() => props.onMulligan(true)} disabled={actorState.mulliganUsed}>다시 뽑기</button>
        </>
      )}

      {phase === 'debutCheck' && (
        <>
          <span className="text-xs text-rose-300"><b>{who}</b>: 패에 데뷔가 없습니다. 패를 공개하고 다시 뽑습니다. (강제 {actorState.forcedMulligans}회)</span>
          <button className={`${btn} bg-rose-600 hover:bg-rose-500 text-white`} onClick={props.onForcedMulligan}>패 공개 후 다시 뽑기</button>
        </>
      )}

      {phase === 'penalty' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 강제 멀리건 {actorState.forcedMulligans}회 → 패에서 {actorState.forcedMulligans}장을 골라 덱 아래로. (남은 선택 {penaltyRemaining})</span>
          <button className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`} onClick={props.onApplyPenalty} disabled={penaltyRemaining !== 0}>확정</button>
        </>
      )}

      {phase === 'placeDebut' && (
        <>
          <span className="text-xs text-gray-300"><b className="text-amber-300">{who}</b>: 패의 데뷔 카드를 센터(필수)·백(선택)에 배치하세요.</span>
          <button className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`} onClick={props.onConfirmReady} disabled={!canPlaceConfirm}>시작</button>
        </>
      )}

      {phase === 'ready' && <span className="text-sm text-emerald-300 font-bold">셋업 완료! (턴 진행은 다음 단계)</span>}
    </div>
  );
}
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 3: 커밋**

```bash
git add src/components/game/SetupOverlay.tsx
git commit -m "게임 셋업: SetupOverlay phase별 안내/행동 UI"
```

---

## Task 9: GamePage — gameStore 연결 + 클릭 배치 + 핫시트

기존 GamePage(자기 덱을 양쪽 패로 보여주던 플레이스홀더)를 gameStore 구동으로 재작성한다. 좌측 `CardDetailPanel`은 유지. 중앙은 상대(P2, 상단·mirrored) / 게임판 / 내 패(activeActor) 구성. 핫시트라 P1 하단·P2 상단 고정, activeActor 보드 강조.

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: GamePage 재작성**

상호작용 규칙:
- `placeDebut`/`unplaceDebut`/`penalty`에서 패·슬롯 클릭으로 카드 선택/배치.
- 선택 상태(`selectedUid` 단일, `penaltyUids` 배열)는 GamePage 로컬 state.
- 배치 단계: 패에서 데뷔 카드 선택 → 강조된 센터/백 슬롯 클릭 시 `placeDebut`. 배치된 슬롯 클릭 시 `unplaceDebut`.
- 페널티 단계: 패 카드 클릭으로 다중 토글, N장 선택 시 `applyPenalty(penaltyUids)`.

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import GameBoard from '../components/GameBoard';
import HandArea from '../components/game/HandArea';
import SetupOverlay from '../components/game/SetupOverlay';
import CardDetailPanel, { type SelectedCard } from '../components/CardDetailPanel';
import { useGameStore } from '../store/gameStore';
import { useDeckStore } from '../store/deckStore';
import { canConfirmReady } from '../game/setup';
import type { CardInstance, PlayerId, Slot } from '../game/types';

export default function GamePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const decks = useDeckStore((s) => s.decks);
  const activeDeckId = useDeckStore((s) => s.activeDeckId);

  const g = useGameStore();
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null); // 배치용 단일 선택
  const [penaltyUids, setPenaltyUids] = useState<string[]>([]);

  // ---- 마운트 시 게임 init (mode별) ----
  useEffect(() => {
    const state = location.state as { p1DeckId?: string; p2DeckId?: string } | null;
    if (code === 'solo') {
      const p1 = decks.find((d) => d.id === state?.p1DeckId);
      const p2 = decks.find((d) => d.id === state?.p2DeckId);
      if (!p1 || !p2) {
        navigate('/lobby');
        return;
      }
      useGameStore.getState().initGame(p1, p2, { mode: 'solo', p1Name: 'P1', p2Name: 'P2' });
    } else {
      // dev/online(임시): 활성 덱을 양쪽에 사용
      const d = decks.find((x) => x.id === activeDeckId) ?? decks[0];
      if (!d) return;
      useGameStore.getState().initGame(d, d, { mode: code ? 'online' : 'dev' });
    }
    return () => useGameStore.getState().reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // phase 바뀌면 선택 상태 초기화
  useEffect(() => {
    setSelectedUid(null);
    setPenaltyUids([]);
  }, [g.phase, g.activeActor]);

  if (g.phase === 'idle') {
    return (
      <div className="force-landscape flex items-center justify-center text-gray-400" style={{ background: '#0f0f1a' }}>
        덱을 불러오는 중...
      </div>
    );
  }

  const actor = g.activeActor;
  const actorState = g.players[actor];

  // 데뷔 배치 가능 슬롯 (배치 단계에서 데뷔 선택했을 때만 강조)
  const highlightSlots: Slot[] =
    g.phase === 'placeDebut' && selectedUid
      ? [{ zone: 'center' }, { zone: 'back', index: 0 }, { zone: 'back', index: 1 }, { zone: 'back', index: 2 }, { zone: 'back', index: 3 }, { zone: 'back', index: 4 }]
      : [];

  // 패 카드 클릭
  function onHandCardClick(ci: CardInstance) {
    setSelectedCard({ card: ci.card, imageUrl: ci.imageUrl });
    if (g.phase === 'penalty') {
      setPenaltyUids((prev) =>
        prev.includes(ci.uid)
          ? prev.filter((u) => u !== ci.uid)
          : prev.length < actorState.forcedMulligans
            ? [...prev, ci.uid]
            : prev,
      );
    } else if (g.phase === 'placeDebut') {
      setSelectedUid((prev) => (prev === ci.uid ? null : ci.uid));
    }
  }

  // 슬롯 클릭 (배치/해제)
  function onSlotClick(slot: Slot) {
    if (g.phase !== 'placeDebut') return;
    const occupied = slot.zone === 'center' ? actorState.center : actorState.back[slot.index];
    if (selectedUid) {
      g.placeDebut(selectedUid, slot);
      setSelectedUid(null);
    } else if (occupied) {
      g.unplaceDebut(slot);
    }
  }

  const penaltyRemaining = g.phase === 'penalty' ? actorState.forcedMulligans - penaltyUids.length : 0;
  const selectedUidsForHand = g.phase === 'penalty' ? penaltyUids : selectedUid ? [selectedUid] : [];

  // P1 하단 / P2 상단(mirrored). activeActor 보드 강조.
  const renderBoard = (pid: PlayerId, mirrored: boolean) => (
    <div className={`w-full rounded-lg ${pid === actor ? 'ring-1 ring-amber-300/40' : ''}`}>
      <GameBoard
        player={g.players[pid]}
        mirrored={mirrored}
        highlightSlots={pid === actor ? highlightSlots : []}
        onSlotClick={pid === actor ? onSlotClick : undefined}
      />
    </div>
  );

  return (
    <div className="force-landscape flex flex-col overflow-hidden" style={{ background: '#0f0f1a' }}>
      {/* 상단 바 */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <button onClick={() => navigate('/lobby')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          나가기
        </button>
        <span className="text-xs text-gray-500 truncate">{code === 'solo' ? '혼자 연습 대전' : code ? `방코드 ${code}` : '게임판 (개발용)'}</span>
        <span className="w-12" />
      </div>

      {/* phase 안내 + 행동 */}
      <SetupOverlay
        phase={g.phase}
        activeActor={actor}
        actorState={actorState}
        randomlyPicked={g.randomlyPicked}
        penaltyRemaining={penaltyRemaining}
        canPlaceConfirm={canConfirmReady(actorState)}
        onDecideFirst={g.decideFirstPlayer}
        onMulligan={g.mulligan}
        onForcedMulligan={g.forcedMulligan}
        onApplyPenalty={() => g.applyPenalty(penaltyUids)}
        onConfirmReady={g.confirmReady}
      />

      {/* 본문 2분할: 좌(카드 상세) / 중앙(상대판·내판·패) */}
      <div className="flex-1 min-h-0 flex">
        <aside className="w-[clamp(116px,20%,260px)] shrink-0 border-r border-gray-800 bg-gray-950/40">
          <CardDetailPanel selected={selectedCard} />
        </aside>

        <div className="flex-1 min-w-0 [container-type:size]">
          <div className="w-full h-full flex flex-col gap-1 p-2 overflow-hidden">
            {/* 상단: P2 보드 */}
            <div className="flex-1 min-h-0 [container-type:size] flex flex-col items-center justify-center">
              {renderBoard('p2', true)}
            </div>

            <div className="w-[min(100%,1100px)] h-px shrink-0 bg-gradient-to-r from-transparent via-gray-700 to-transparent self-center" />

            {/* 하단: P1 보드 */}
            <div className="flex-1 min-h-0 [container-type:size] flex flex-col items-center justify-center">
              {renderBoard('p1', false)}
            </div>

            {/* 패: activeActor의 패 (클릭) */}
            <div className="shrink-0 flex flex-col gap-0.5">
              <HandArea
                hand={actorState.hand}
                selectedUids={selectedUidsForHand}
                onCardClick={onHandCardClick}
                debutOnly={g.phase === 'placeDebut'}
                emptyText="패가 비어 있습니다."
              />
              <span className="ml-1 text-[10px] font-medium text-indigo-400/70">
                {actor === 'p1' ? 'P1' : 'P2'} 패 <span className="text-gray-600">{actorState.hand.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

> 주의: `g.mulligan`/`g.decideFirstPlayer` 등은 Zustand 액션이라 안정 참조다. `useGameStore()` 전체 구독은 재렌더가 잦을 수 있으나 이 화면 규모에선 무방하다(필요 시 추후 selector 분리).

- [ ] **Step 2: 빌드 검증 + 수동 확인**

Run: `npm run build`
Expected: `✓ built`
수동: `npm run dev` 후 `/game/solo`로 직접 진입은 state가 없어 `/lobby`로 리다이렉트되는지 확인(정상). 실제 진입은 Task 10 이후.

- [ ] **Step 3: 커밋**

```bash
git add src/pages/GamePage.tsx
git commit -m "게임 셋업: GamePage gameStore 연결+클릭 배치+핫시트"
```

---

## Task 10: LobbyPage — "혼자 연습 대전" 진입점

**Files:**
- Modify: `src/pages/LobbyPage.tsx`

저장된 덱 목록에서 P1/P2 덱을 골라 `/game/solo`로 이동. 오시 없는 덱은 선택 시 경고.

- [ ] **Step 1: import + 상태 추가**

`LobbyPage.tsx` 상단 import에 deckStore 추가:

```tsx
import { useDeckStore } from '../store/deckStore';
```

컴포넌트 본문 상단(`const name = ...` 아래)에 추가:

```tsx
  const decks = useDeckStore((s) => s.decks);
  const [p1DeckId, setP1DeckId] = useState('');
  const [p2DeckId, setP2DeckId] = useState('');

  function startSolo() {
    const p1 = decks.find((d) => d.id === p1DeckId);
    const p2 = decks.find((d) => d.id === p2DeckId);
    if (!p1 || !p2) {
      setError('P1/P2 덱을 모두 선택하세요.');
      return;
    }
    if (!p1.oshi || !p2.oshi) {
      setError('오시 카드가 없는 덱은 사용할 수 없습니다.');
      return;
    }
    setError('');
    navigate('/game/solo', { state: { p1DeckId, p2DeckId } });
  }
```

- [ ] **Step 2: "혼자 연습 대전" UI 추가**

카드 컨테이너(`방 입장` div 닫힌 뒤, 컨테이너 닫는 `</div>` 직전)에 구분선 + 섹션 추가:

```tsx
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600">혼자 연습</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={p1DeckId}
                onChange={(e) => setP1DeckId(e.target.value)}
                className="flex-1 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">P1 덱 선택</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.oshi ? '' : ' (오시 없음)'}</option>
                ))}
              </select>
              <select
                value={p2DeckId}
                onChange={(e) => setP2DeckId(e.target.value)}
                className="flex-1 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">P2 덱 선택</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.oshi ? '' : ' (오시 없음)'}</option>
                ))}
              </select>
            </div>
            <button
              onClick={startSolo}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition-colors"
            >
              혼자 대전 시작
            </button>
          </div>
```

> 주의: `error`/`setError`는 기존에 선언되어 있으므로 재사용한다. `decks`가 없으면 select가 비지만 build에는 영향 없음.

- [ ] **Step 3: 빌드 검증 + 수동 확인**

Run: `npm run build`
Expected: `✓ built`
수동: `npm run dev` → `/lobby` → 덱 2개 선택 → "혼자 대전 시작" → `/game/solo` 진입, 셋업 시작(firstPlayer phase).

- [ ] **Step 4: 커밋**

```bash
git add src/pages/LobbyPage.tsx
git commit -m "게임 셋업: 로비 혼자 연습 대전(덱 2개 선택) 진입점"
```

---

## Task 11: 전체 수동 검증 + lint/build

**Files:** 없음 (검증만)

- [ ] **Step 1: lint + build**

Run: `npm run lint`
Expected: 에러 없음
Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 2: 핫시트 전체 플로우 수동 확인**

`npm run dev` → 로비 → 덱 2개 선택 → 혼자 대전 시작. 다음을 확인:
1. **선후공**: 시스템이 P1/P2 중 하나를 뽑고 그 보드가 강조됨. [선공]/[후공] 클릭 → mulligan 진입.
2. **멀리건(선공부터)**: activeActor 패 7장 표시. [그대로]/[다시 뽑기]. "다시 뽑기" 후 버튼 비활성(1회).
3. **데뷔 체크**: 데뷔 없을 시 안내 + [패 공개 후 다시 뽑기] 반복, 데뷔 나오면 자동 통과.
4. **페널티**: 강제 멀리건 있었으면 N장 선택 → [확정] 활성 → 클릭 시 덱 아래로(덱 수 증가).
5. P2도 동일 플로우 진행.
6. **데뷔 배치(선공부터)**: 패의 데뷔 탭 → 센터/백 슬롯 점멸 → 슬롯 탭으로 배치. 센터 배치 전 [시작] 비활성, 배치 후 활성. 배치된 슬롯 탭 → 패로 복귀.
7. 양쪽 [시작] → "셋업 완료!" 표시.
8. 라이프 스택이 오시 라이프 수만큼 색상으로 표시, 덱/옐덱 장수 표시 확인.
9. 모바일(강제 가로/좁은 창)에서 레이아웃 깨지지 않는지 확인.

- [ ] **Step 3: (요청 시) 최종 커밋**

```bash
git add -A
git commit -m "게임 셋업: 전체 플로우 검증 완료"
```

---

## 자체 검토 (스펙 대비)

- 스펙 §2 모듈 구조 → Task 1~10에서 모두 생성/수정. ✓
- 스펙 §3 상태 모델 → Task 2(types) + Task 5(store). `mulliganDecided` 추가(핫시트 진행 추적용). ✓
- 스펙 §4 셋업 플로우(배치→라이프→선후공→멀리건→데뷔체크→페널티→데뷔배치→ready) → Task 3(init+라이프), Task 4(멀리건/페널티/배치), Task 5(전환), Task 9(UI). ✓
- 스펙 §4 멀리건 해석(임의 1회 무페널티 / 강제만 카운트) → `mulliganRedraw`(mulliganUsed) vs `forcedRedraw`(forcedMulligans++), 페널티=forcedMulligans. ✓
- 스펙 §5 클릭 조작/핫시트 → Task 9(선택 state, 슬롯 클릭, activeActor 강조) + Task 7/8. ✓
- 스펙 §6 로비 솔로 진입 → Task 10 + Task 9 init(`code==='solo'`). ✓
- 스펙 §7 엣지(색상 토큰 라이프, uid 구분, 불완전 덱, 오시 없음, 데뷔 없음 안전장치) → Task 3(lifeCount min), 6(LifeZone 색상), 10(오시 경고). **데뷔 전무 안전장치**: forcedMulligan 무한 반복 방지는 Task 5에서 미구현 — 아래 보강.
- 타입 일관성: `Slot`, `CardInstance`, `PlayerState`, 액션 시그니처가 Task 2/4/5/6/9 전반에서 일치. ✓

**보강(데뷔 전무 안전장치):** Task 5 `forcedMulligan`에 덱+패 통틀어 데뷔가 0장이면 더 못 뽑으므로, GamePage `debutCheck` 안내에 "이 덱에는 데뷔가 없습니다" 경고를 표시하도록 Task 9 SetupOverlay/안내에 조건 추가 가능(정상 덱이면 미발생). 구현 시 `actorState.deck`+`hand`에 `isDebut`가 전혀 없으면 forcedMulligan 버튼을 비활성화하고 안내. (실 데이터에선 거의 발생하지 않으므로 P1 보강 수준.)

---

**Plan complete.**
