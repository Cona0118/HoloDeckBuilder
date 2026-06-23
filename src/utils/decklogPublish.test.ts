import { describe, it, expect } from 'vitest';
import { buildManageIdIndex, buildDeckLogPayload, parseCardsJson } from './decklogPublish';
import type { Card, Deck } from '../types/card';

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

describe('parseCardsJson', () => {
  it('객체 맵(card_number→카드)을 카드 배열로 변환', () => {
    const map = {
      'hBD24-001': { card_number: 'hBD24-001', illustrations: [{ card_number: 'hBD24-001', manage_id: { jp: [199] } }] },
      'hY01-001': { card_number: 'hY01-001', illustrations: [{ card_number: 'hY01-001', manage_id: { jp: [10] } }] },
    };
    const cards = parseCardsJson(map);
    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.card_number).sort()).toEqual(['hBD24-001', 'hY01-001']);
  });

  it('이미 배열이면 그대로 통과', () => {
    expect(parseCardsJson(RAW)).toHaveLength(RAW.length);
  });

  it('객체/배열이 아니면 빈 배열', () => {
    expect(parseCardsJson(null)).toEqual([]);
    expect(parseCardsJson('oops')).toEqual([]);
    expect(parseCardsJson(undefined)).toEqual([]);
  });

  it('맵을 변환해 인덱스를 만들면 정상 동작', () => {
    const map = {
      'hBD24-001': { card_number: 'hBD24-001', illustrations: [{ card_number: 'hBD24-001', manage_id: { jp: [199] } }] },
      'hY02-001': { card_number: 'hY02-001', illustrations: [{ card_number: 'hY02-001', manage_id: { jp: [20] } }] },
    };
    const idx = buildManageIdIndex(parseCardsJson(map));
    expect(idx.byCardNumber.get('hBD24-001')).toBe('199');
    expect(idx.yellByColor.green).toEqual({ cardNumber: 'hY02-001', manageId: '20' });
  });
});

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
