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
