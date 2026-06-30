import { describe, it, expect } from 'vitest';
import { setRange, getEventPool, getOutOfPoolCards, isCardInPool } from './eventPools';
import type { Card, Deck } from '../types/card';

function card(cardNumber: string, setId: string): Card {
  return { id: cardNumber, name: cardNumber, type: 'holomem', setId, cardNumber } as Card;
}

function makeDeck(over: Partial<Deck>): Deck {
  return {
    id: 'd', name: '테스트덱', oshi: null, mainDeck: [], cheers: {},
    createdAt: 0, updatedAt: 0, ...over,
  };
}

describe('setRange', () => {
  it('연속 세트 ID를 0패딩으로 생성', () => {
    expect(setRange('hSD', 14, 19)).toEqual([
      'hSD14', 'hSD15', 'hSD16', 'hSD17', 'hSD18', 'hSD19',
    ]);
  });
  it('한 개 범위', () => {
    expect(setRange('hSD', 1, 1)).toEqual(['hSD01']);
  });
});

describe('getEventPool', () => {
  it('셀렉션 컵 풀에 hBP07/08 + hSD14~19 포함', () => {
    const pool = getEventPool('selection-cup');
    expect(pool).toBeDefined();
    expect(pool!.sets).toEqual(
      expect.arrayContaining(['hBP07', 'hBP08', 'hSD14', 'hSD15', 'hSD16', 'hSD17', 'hSD18', 'hSD19']),
    );
  });
  it('빈/미존재 id는 undefined', () => {
    expect(getEventPool(null)).toBeUndefined();
    expect(getEventPool('')).toBeUndefined();
    expect(getEventPool('nope')).toBeUndefined();
  });
});

describe('getOutOfPoolCards', () => {
  const pool = getEventPool('selection-cup')!;

  it('오시·메인덱이 모두 풀 안이면 빈 배열(=사용 가능)', () => {
    const deck = makeDeck({
      oshi: card('hBP08-001', 'hBP08'),
      mainDeck: [
        { card: card('hBP07-010', 'hBP07'), count: 4 },
        { card: card('hSD14-001', 'hSD14'), count: 2 },
      ],
    });
    expect(getOutOfPoolCards(deck, pool)).toEqual([]);
  });

  it('풀 밖 카드만 골라냄', () => {
    const deck = makeDeck({
      mainDeck: [
        { card: card('hBP06-001', 'hBP06'), count: 1 }, // 풀 외
        { card: card('hBP08-001', 'hBP08'), count: 1 }, // 풀 내
      ],
    });
    const out = getOutOfPoolCards(deck, pool);
    expect(out.map((c) => c.cardNumber)).toEqual(['hBP06-001']);
  });

  it('풀 밖 오시도 포함', () => {
    const deck = makeDeck({ oshi: card('hBD24-001', 'hBD24') });
    expect(getOutOfPoolCards(deck, pool).map((c) => c.cardNumber)).toEqual(['hBD24-001']);
  });

  it('같은 카드번호(아트 변형)는 중복 제거', () => {
    const deck = makeDeck({
      mainDeck: [
        { card: card('hBP06-001', 'hBP06'), count: 2, imageUrl: 'a.png' },
        { card: card('hBP06-001', 'hBP06'), count: 1, imageUrl: 'b.png' },
      ],
    });
    expect(getOutOfPoolCards(deck, pool)).toHaveLength(1);
  });

  it('옐(치어)은 검사 대상 아님', () => {
    const deck = makeDeck({ cheers: { white: 10, red: 10 } });
    expect(getOutOfPoolCards(deck, pool)).toEqual([]);
  });

  it('세트 밖이라도 개별 허용 카드(cards)면 사용 가능', () => {
    // hBP01은 세트 풀 밖이지만 hBP01-104(보통 컴퓨터)는 개별 허용됨
    const deck = makeDeck({
      mainDeck: [{ card: card('hBP01-104', 'hBP01'), count: 1 }],
    });
    expect(getOutOfPoolCards(deck, pool)).toEqual([]);
  });

  it('같은 세트라도 개별 허용 목록에 없는 카드는 풀 외', () => {
    const deck = makeDeck({
      mainDeck: [{ card: card('hBP01-999', 'hBP01'), count: 1 }],
    });
    expect(getOutOfPoolCards(deck, pool).map((c) => c.cardNumber)).toEqual(['hBP01-999']);
  });
});

describe('isCardInPool', () => {
  const pool = getEventPool('selection-cup')!;
  it('세트 전체 허용', () => {
    expect(isCardInPool(card('hBP08-050', 'hBP08'), pool)).toBe(true);
  });
  it('개별 허용 카드', () => {
    expect(isCardInPool(card('hBP01-104', 'hBP01'), pool)).toBe(true);
  });
  it('세트·개별 모두 아님 → false', () => {
    expect(isCardInPool(card('hBP01-999', 'hBP01'), pool)).toBe(false);
  });
});
