import { describe, it, expect } from 'vitest';
import type { CardColor, Deck } from '../types/card';
import { CARDS } from '../data/cards';
import { getCardImageVariants } from '../data/cardImageVariants';
import { CHEER_COLORS, CHEER_VARIANTS } from '../data/cheerImages';
import {
  artCodeFromImage,
  deckToHoloburiCode,
  parseHoloburiCode,
} from './holoburiCode';

const card = (id: string) => CARDS.find((c) => c.id === id)!;

/** 홀로부리 번들의 인코더(vu)와 같은 방식으로 코드를 만든다. */
function holoburiEncode(payload: unknown): string {
  let bin = '';
  new TextEncoder().encode(JSON.stringify(payload)).forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return 'hocg1.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodePayload(code: string) {
  const bin = atob(code.slice(6).replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

function makeDeck(partial: Partial<Deck>): Deck {
  return {
    id: 'd1',
    name: '테스트 덱',
    oshi: null,
    mainDeck: [],
    cheers: {},
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('artCodeFromImage', () => {
  it('번호 없는 레어도 접미사를 아트코드로 쓴다', () => {
    expect(artCodeFromImage('hBP03-050', '/images/hBP03/hBP03-050_SR.png')).toBe('SR');
    expect(artCodeFromImage('hBP01-001', '/images/hBP01/hBP01-001_OUR.png')).toBe('OUR');
  });

  it('CDN URL(.webp)도 같은 코드가 된다', () => {
    expect(
      artCodeFromImage('hBP01-001', 'https://cdn.example.com/images/hBP01/hBP01-001_OUR.webp'),
    ).toBe('OUR');
  });

  it('번호 붙은 변형·다른 카드 파일·형식이 안 맞는 파일은 null', () => {
    expect(artCodeFromImage('hBP03-050', '/images/hBP03/hBP03-050_SR_02.png')).toBeNull();
    expect(artCodeFromImage('hBP01-024', '/images/hBP01/hBP01-024_02_C.png')).toBeNull();
    expect(artCodeFromImage('hBP01-007', '/images/hBP01/hBP01-007_P_01.png')).toBeNull();
    expect(artCodeFromImage('hBP03-050', '/images/hBP03/hBP03-051_SR.png')).toBeNull();
    expect(artCodeFromImage('hBP03-050', '/images/hBP03/hBP03-050_sr.png')).toBeNull();
  });
});

describe('parseHoloburiCode', () => {
  it('홀로부리 코드에서 덱 이름·오시·메인덱·옐을 읽는다', () => {
    const code = holoburiEncode({
      n: '소라 덱',
      o: 'hSD01-001',
      m: [['hSD01-003', 4], ['hSD01-004', 3]],
      c: [['hY01-001', 10], ['hY02-001', 10]],
    });
    const r = parseHoloburiCode(code);
    expect(r.name).toBe('소라 덱');
    expect(r.oshi?.id).toBe('hSD01-001');
    expect(r.mainDeck.map((e) => [e.card.id, e.count])).toEqual([
      ['hSD01-003', 4],
      ['hSD01-004', 3],
    ]);
    expect(r.cheers).toEqual({ white: 10, green: 10 });
    expect(r.cheerImages).toBeUndefined();
    expect(r.missingCardCount).toBe(0);
  });

  it('앞뒤 공백·다른 글자가 섞여 있어도 코드만 찾아 읽는다', () => {
    const code = holoburiEncode({ n: 'x', o: 'hSD01-001', m: [], c: [] });
    expect(parseHoloburiCode(`덱 코드:\n  ${code}  \n`).oshi?.id).toBe('hSD01-001');
  });

  it('줄바꿈으로 잘린 코드도 이어 붙여 읽는다', () => {
    const code = holoburiEncode({ n: '줄바꿈', o: 'hSD01-001', m: [['hSD01-003', 4]], c: [] });
    const wrapped = code.slice(0, 20) + '\n' + code.slice(20, 45) + ' \r\n' + code.slice(45);
    const r = parseHoloburiCode(wrapped);
    expect(r.name).toBe('줄바꿈');
    expect(r.mainDeck[0].count).toBe(4);
  });

  it('없는 카드는 누락으로 집계하고, 잘못된 매수 항목은 버린다', () => {
    const code = holoburiEncode({
      n: '',
      o: 'hZZ99-001',
      m: [['hSD01-003', 4], ['hZZ99-002', 2], ['hSD01-004', 0], ['hSD01-005', 51], ['hSD01-006', 1.5]],
      c: [['hY09-001', 3]],
    });
    const r = parseHoloburiCode(code);
    expect(r.name).toBeNull();
    expect(r.oshi).toBeNull();
    expect(r.mainDeck.map((e) => e.card.id)).toEqual(['hSD01-003']);
    expect(r.missingCardIds).toEqual(['hZZ99-001', 'hZZ99-002', 'hY09-001']);
    expect(r.missingCardCount).toBe(1 + 2 + 3);
  });

  it('같은 카드번호가 여러 번 나오면 한 엔트리로 합친다', () => {
    const code = holoburiEncode({ n: 'd', o: null, m: [['hSD01-003', 2], ['hSD01-003', 2]], c: [] });
    expect(parseHoloburiCode(code).mainDeck.map((e) => [e.card.id, e.count])).toEqual([
      ['hSD01-003', 4],
    ]);
  });

  it('번호 없는 아트코드를 우리 일러스트로 연결한다', () => {
    const code = holoburiEncode({
      n: 'a',
      o: 'hBP01-001',
      m: [['hBP03-050', 2]],
      c: [],
      a: [['hBP01-001', 'OUR'], ['hBP03-050', 'SR']],
    });
    const r = parseHoloburiCode(code);
    expect(r.oshiImageUrl).toMatch(/hBP01-001_OUR\.(png|webp)$/);
    expect(r.mainDeck[0].imageUrl).toMatch(/hBP03-050_SR\.(png|webp)$/);
  });

  it('번호 붙은 아트코드나 우리에게 없는 아트코드는 기본 일러스트로 둔다', () => {
    const code = holoburiEncode({
      n: 'a',
      o: null,
      m: [['hBP03-044', 2], ['hBP03-050', 2]],
      c: [],
      a: [['hBP03-044', 'SR_2'], ['hBP03-050', 'HR']],
    });
    const r = parseHoloburiCode(code);
    expect(r.mainDeck.map((e) => e.imageUrl)).toEqual([undefined, undefined]);
  });

  it('옐 번호로 색상별 일러스트를 고른다 (매수가 많은 번호 우선)', () => {
    const variant = CHEER_VARIANTS.white.find((v) => v.includes('hY01-002'));
    expect(variant).toBeDefined();
    const code = holoburiEncode({
      n: 'c', o: null, m: [], c: [['hY01-001', 5], ['hY01-002', 15]],
    });
    const r = parseHoloburiCode(code);
    expect(r.cheers).toEqual({ white: 20 });
    expect(r.cheerImages).toEqual({ white: variant });
  });

  it('가장 많은 옐 번호의 일러스트가 우리에게 없으면 다음 번호를 쓴다', () => {
    const missing = Array.from({ length: 999 }, (_, i) => `hY01-${String(i + 2).padStart(3, '0')}`)
      .find((id) => !CHEER_VARIANTS.white.some((v) => v.includes(id)))!;
    const variant = CHEER_VARIANTS.white.find((v) => v.includes('hY01-002'))!;
    const code = holoburiEncode({ n: 'c', o: null, m: [], c: [[missing, 12], ['hY01-002', 8]] });
    expect(parseHoloburiCode(code).cheerImages).toEqual({ white: variant });
  });

  it('덱 이름은 40자로 자르되 이모지를 반으로 자르지 않는다', () => {
    const code = holoburiEncode({ n: 'a'.repeat(39) + '😀😀', o: null, m: [], c: [] });
    expect(parseHoloburiCode(code).name).toBe('a'.repeat(39) + '😀');
  });

  it('형식이 아니거나 깨진 코드는 에러', () => {
    expect(() => parseHoloburiCode('hSD01-001 x4')).toThrow(/hocg1/);
    expect(() => parseHoloburiCode('hocg1.!!!')).toThrow(/읽을 수 없습니다/);
    expect(() => parseHoloburiCode('hocg1.' + btoa('not json'))).toThrow(/읽을 수 없습니다/);
    expect(() => parseHoloburiCode('hocg1.' + btoa('[1,2]'))).toThrow(/읽을 수 없습니다/);
  });
});

describe('deckToHoloburiCode', () => {
  it('홀로부리 형식(hocg1. + base64url JSON, 패딩 없음)으로 만든다', () => {
    const deck = makeDeck({
      name: '한글 덱 이름',
      oshi: card('hSD01-001'),
      mainDeck: [
        { card: card('hSD01-003'), count: 4 },
        { card: card('hSD01-004'), count: 3 },
      ],
      cheers: { white: 10, green: 10 },
    });
    const code = deckToHoloburiCode(deck);
    expect(code).toMatch(/^hocg1\.[A-Za-z0-9_-]+$/);
    expect(decodePayload(code)).toEqual({
      n: '한글 덱 이름',
      o: 'hSD01-001',
      m: [['hSD01-003', 4], ['hSD01-004', 3]],
      c: [['hY01-001', 10], ['hY02-001', 10]],
    });
  });

  it('같은 카드의 일러스트별 엔트리는 합치고, 매수가 많은 일러스트를 아트코드로 쓴다', () => {
    const c = card('hBP03-050');
    const deck = makeDeck({
      oshi: card('hBP01-001'),
      oshiImageUrl: '/images/hBP01/hBP01-001_OUR.png',
      mainDeck: [
        { card: c, count: 1 },
        { card: c, count: 2, imageUrl: '/images/hBP03/hBP03-050_SR.png' },
        { card: card('hSD01-003'), count: 4 },
      ],
    });
    const p = decodePayload(deckToHoloburiCode(deck));
    expect(p.m).toEqual([['hBP03-050', 3], ['hSD01-003', 4]]);
    expect(p.a).toEqual([['hBP01-001', 'OUR'], ['hBP03-050', 'SR']]);
  });

  it('기본·번호 붙은 일러스트만 쓰면 a 필드를 넣지 않는다', () => {
    const c = card('hBP03-050');
    const deck = makeDeck({
      mainDeck: [
        { card: c, count: 2, imageUrl: c.imageUrl },
        { card: card('hBP03-044'), count: 2, imageUrl: '/images/hBP03/hBP03-044_SR_2.png' },
      ],
    });
    expect(decodePayload(deckToHoloburiCode(deck)).a).toBeUndefined();
  });

  it('옐 일러스트 선택을 옐 번호로 내보낸다', () => {
    const variant = CHEER_VARIANTS.white.find((v) => v.includes('hY01-002'))!;
    const deck = makeDeck({ cheers: { white: 20 }, cheerImages: { white: variant } });
    expect(decodePayload(deckToHoloburiCode(deck)).c).toEqual([['hY01-002', 20]]);
  });

  it('내보낸 코드를 다시 읽으면 같은 덱이 된다', () => {
    const variant = CHEER_VARIANTS.green.find((v) => v.includes('hY02-002'))!;
    const deck = makeDeck({
      name: '왕복',
      oshi: card('hBP01-001'),
      oshiImageUrl: '/images/hBP01/hBP01-001_OUR.png',
      mainDeck: [
        { card: card('hBP03-050'), count: 3, imageUrl: '/images/hBP03/hBP03-050_SR.png' },
        { card: card('hSD01-003'), count: 4 },
      ],
      cheers: { white: 12, green: 8 },
      cheerImages: { green: variant },
    });
    const r = parseHoloburiCode(deckToHoloburiCode(deck));
    expect(r.name).toBe('왕복');
    expect(r.oshi?.id).toBe('hBP01-001');
    expect(r.oshiImageUrl).toMatch(/hBP01-001_OUR\./);
    expect(r.mainDeck.map((e) => [e.card.id, e.count])).toEqual([['hBP03-050', 3], ['hSD01-003', 4]]);
    expect(r.mainDeck[0].imageUrl).toMatch(/hBP03-050_SR\./);
    expect(r.cheers).toEqual({ white: 12, green: 8 });
    expect(r.cheerImages).toEqual({ green: variant });
    expect(r.missingCardCount).toBe(0);
  });

  it('전 카드·전 일러스트: 아트코드는 카드 안에서 겹치지 않고, 왕복하면 같은 일러스트(또는 기본)가 된다', () => {
    for (const c of CARDS) {
      const seen = new Map<string, string>();
      for (const v of getCardImageVariants(c.id, c.imageUrl)) {
        const isOshi = c.type === 'oshi';
        const deck = isOshi
          ? makeDeck({ oshi: c, oshiImageUrl: v })
          : makeDeck({ mainDeck: [{ card: c, count: 1, imageUrl: v }] });
        const art = decodePayload(deckToHoloburiCode(deck)).a?.[0]?.[1] as string | undefined;
        if (art) {
          expect(seen.get(art), `${c.id} ${art}`).toBeUndefined();
          seen.set(art, v);
        }
        const r = parseHoloburiCode(deckToHoloburiCode(deck));
        const back = isOshi ? r.oshiImageUrl : r.mainDeck[0].imageUrl;
        expect(back, `${c.id} ${v}`).toBe(art ? v : undefined);
      }
    }
  });

  it('전 옐 일러스트: 왕복하면 같은 옐 일러스트(기본은 선택 없음)가 된다', () => {
    for (const color of CHEER_COLORS as CardColor[]) {
      CHEER_VARIANTS[color].forEach((v, i) => {
        const deck = makeDeck({ cheers: { [color]: 20 }, cheerImages: { [color]: v } });
        const r = parseHoloburiCode(deckToHoloburiCode(deck));
        expect(r.cheers).toEqual({ [color]: 20 });
        expect(r.cheerImages?.[color], v).toBe(i === 0 ? undefined : v);
      });
    }
  });
});
