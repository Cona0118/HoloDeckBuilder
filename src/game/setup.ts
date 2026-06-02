import type { Card, CardColor, Deck, DeckEntry } from '../types/card';
import type { CardInstance, PlayerState, Slot } from './types';
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

export const REQUIRED_MAIN = 50;
export const REQUIRED_CHEER = 20;

export interface DeckValidation {
  valid: boolean;
  reasons: string[];
}

/** 게임 진입 가능한 올바른 덱인지 검사: 메인 50 / 옐 20 / 오시 1 / 데뷔 ≥1. */
export function validateDeck(deck: Deck | null | undefined): DeckValidation {
  if (!deck) return { valid: false, reasons: ['덱이 없습니다.'] };
  const reasons: string[] = [];
  const mainCount = deck.mainDeck.reduce((s, e) => s + e.count, 0);
  const cheerCount = Object.values(deck.cheers).reduce((s: number, v) => s + (v ?? 0), 0);
  const debutCount = deck.mainDeck.reduce((s, e) => s + (isDebut(e.card) ? e.count : 0), 0);
  if (!deck.oshi) reasons.push('오시 카드가 없습니다.');
  if (mainCount !== REQUIRED_MAIN) reasons.push(`메인 덱은 ${REQUIRED_MAIN}장이어야 합니다 (현재 ${mainCount}장).`);
  if (cheerCount !== REQUIRED_CHEER) reasons.push(`옐 덱은 ${REQUIRED_CHEER}장이어야 합니다 (현재 ${cheerCount}장).`);
  if (debutCount < 1) reasons.push('데뷔 홀로멤이 최소 1장 필요합니다.');
  return { valid: reasons.length === 0, reasons };
}
