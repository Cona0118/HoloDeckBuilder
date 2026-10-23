// 홀로부리(holoburi.com, hOCG 시뮬레이터) 덱 코드 변환.
//
// 코드 형식 (홀로부리 번들에서 확인, 2026-10-24):
//   "hocg1." + base64url(UTF-8 JSON), 패딩(=) 없음
//   JSON = { n: 덱이름, o: 오시 카드번호 | null,
//            m: [[카드번호, 매수], ...],          // 메인덱
//            c: [[옐 카드번호, 매수], ...],       // 옐 덱 (hY01~hY06-NNN, 일러스트별 별도 번호)
//            a?: [[카드번호, 아트코드], ...] }    // 카드당 일러스트 1종 (예: "SR", "SR_2", "OUR")
// 홀로부리는 불러올 때 매수 1~50 정수·자기 DB에 있는 카드만 받고, 나머지는 조용히 버린다.
// 아트코드는 이미지 "{카드번호}_{아트코드}"로 해석되고, 홀로부리에 없는 아트는 기본 일러스트로 보인다.
//
// 아트는 번호 없는 레어도 코드("SR", "UR", "OUR", "SEC" 등)만 주고받는다. 이것들은 우리
// "{카드번호}_{레어도}.png"와 같은 그림임을 확인했다. 번호 붙은 코드("SR_2")는 홀로부리 자체의
// 인쇄 순번이라 우리 파일 번호와 다른 그림을 가리킨다(예: hBP03-044 SR_2는 여름 수영복 일러스트,
// 우리 _SR_2는 다른 일러스트). 그래서 번호 붙은 일러스트는 기본 일러스트로 둔다.

import type { Card, CardColor, Deck, DeckEntry } from '../types/card';
import { CARDS } from '../data/cards';
import { getCardImageVariants } from '../data/cardImageVariants';
import { CHEER_COLORS, CHEER_VARIANTS } from '../data/cheerImages';
import { toImagePath } from './imageCdn';

export const HOLOBURI_CODE_PREFIX = 'hocg1.';

const ART_CODE_RE = /^[A-Z]{1,5}$/;
const MAX_ENTRY_COUNT = 50;
const MAX_NAME_LENGTH = 40;

/** 옐 색상 ↔ 홀로부리 옐 카드번호 접두사. */
const CHEER_SET: Record<CardColor, string> = {
  white: 'hY01',
  green: 'hY02',
  red: 'hY03',
  blue: 'hY04',
  purple: 'hY05',
  yellow: 'hY06',
};
const CHEER_COLOR_BY_SET = Object.fromEntries(
  Object.entries(CHEER_SET).map(([color, set]) => [set, color as CardColor]),
) as Record<string, CardColor>;

function encodeBase64Url(text: string): string {
  let bin = '';
  new TextEncoder().encode(text).forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

/** URL·CDN URL 무관하게 확장자 뺀 파일명. */
function fileStem(url: string): string {
  const name = toImagePath(url).split('/').pop() ?? '';
  return name.replace(/\.[A-Za-z0-9]+$/, '');
}

/**
 * 카드 이미지 파일명 → 홀로부리 아트코드. 번호 없는 레어도 접미사만 인정한다.
 *   hBP01-001_OUR → "OUR", hBP03-050_SR → "SR", hBP03-050_SR_02 → null
 */
export function artCodeFromImage(cardId: string, url: string): string | null {
  const stem = fileStem(url);
  if (!stem.startsWith(`${cardId}_`)) return null;
  const code = stem.slice(cardId.length + 1);
  return ART_CODE_RE.test(code) ? code : null;
}

/** 저장된 일러스트가 카드 기본과 다를 때만 아트코드를 만든다. */
function artCodeForEntry(card: Card, imageUrl: string | undefined): string | null {
  if (!imageUrl) return null;
  if (card.imageUrl && toImagePath(imageUrl) === toImagePath(card.imageUrl)) return null;
  return artCodeFromImage(card.id, imageUrl);
}

/** 아트코드에 해당하는 우리 일러스트 URL. 기본 일러스트이거나 없으면 undefined. */
function imageForArtCode(card: Card, code: string): string | undefined {
  const hit = getCardImageVariants(card.id, card.imageUrl).find(
    (v) => artCodeFromImage(card.id, v) === code,
  );
  if (!hit) return undefined;
  if (card.imageUrl && toImagePath(hit) === toImagePath(card.imageUrl)) return undefined;
  return hit;
}

/** 옐 이미지 파일명의 옐 카드번호 (hY01-002_P.png → "hY01-002"). 기본 이미지(hY01.png)는 null. */
function cheerIdOfImage(url: string): string | null {
  return fileStem(url).match(/^hY0\d-\d{3}(?=_|$)/)?.[0] ?? null;
}

/** 옐 일러스트 URL → 홀로부리 옐 카드번호. 기본 이미지는 -001. */
function cheerIdFor(color: CardColor, imageUrl: string | undefined): string {
  const set = CHEER_SET[color];
  const id = imageUrl ? cheerIdOfImage(imageUrl) : null;
  return id?.startsWith(`${set}-`) ? id : `${set}-001`;
}

/** 덱 → 홀로부리 덱 코드. 같은 카드가 여러 일러스트로 나뉘어 있으면 매수가 가장 많은 일러스트를 쓴다. */
export function deckToHoloburiCode(deck: Deck): string {
  const main = new Map<string, number>();
  const topArt = new Map<string, { count: number; art: string | null }>();
  for (const e of deck.mainDeck) {
    main.set(e.card.id, (main.get(e.card.id) ?? 0) + e.count);
    const prev = topArt.get(e.card.id);
    if (!prev || e.count > prev.count) {
      topArt.set(e.card.id, { count: e.count, art: artCodeForEntry(e.card, e.imageUrl) });
    }
  }

  const art: Array<[string, string]> = [];
  if (deck.oshi) {
    const code = artCodeForEntry(deck.oshi, deck.oshiImageUrl);
    if (code) art.push([deck.oshi.id, code]);
  }
  for (const [id, { art: code }] of topArt) if (code) art.push([id, code]);

  const cheers: Array<[string, number]> = [];
  for (const color of CHEER_COLORS) {
    const n = deck.cheers?.[color] ?? 0;
    if (n > 0) cheers.push([cheerIdFor(color, deck.cheerImages?.[color]), n]);
  }

  const payload = {
    n: deck.name,
    o: deck.oshi?.id ?? null,
    m: [...main.entries()],
    c: cheers,
    ...(art.length ? { a: art } : {}),
  };
  return HOLOBURI_CODE_PREFIX + encodeBase64Url(JSON.stringify(payload));
}

export interface HoloburiDeckImport {
  /** 코드에 담긴 덱 이름 (비어 있으면 null). */
  name: string | null;
  oshi: Card | null;
  oshiImageUrl?: string;
  mainDeck: DeckEntry[];
  cheers: Partial<Record<CardColor, number>>;
  cheerImages?: Partial<Record<CardColor, string>>;
  /** CARDS에서 찾지 못한 카드번호 (오시·메인덱·옐). */
  missingCardIds: string[];
  /** 누락된 카드의 총 매수 (오시는 1). */
  missingCardCount: number;
}

/** 붙여넣은 텍스트 안에 홀로부리 덱 코드가 있는지. */
export function containsHoloburiCode(text: string): boolean {
  return text.includes(HOLOBURI_CODE_PREFIX);
}

function validEntries(raw: unknown): Array<[string, number]> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is [string, number] =>
      Array.isArray(e) &&
      typeof e[0] === 'string' &&
      Number.isInteger(e[1]) &&
      e[1] > 0 &&
      e[1] <= MAX_ENTRY_COUNT,
  );
}

function decodePayload(body: string): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(decodeBase64Url(body));
    return data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** 텍스트에서 "hocg1." 뒤의 코드를 읽는다. 메신저 등에서 줄바꿈으로 잘린 코드도 이어 붙여 다시 시도한다. */
function readCode(text: string): Record<string, unknown> {
  const at = text.indexOf(HOLOBURI_CODE_PREFIX);
  if (at < 0) {
    throw new Error('홀로부리 덱 코드 형식이 아닙니다. (hocg1. 으로 시작해야 합니다)');
  }
  const rest = text.slice(at + HOLOBURI_CODE_PREFIX.length);
  const body = (s: string) => s.match(/^[A-Za-z0-9_\-+/]*/)![0];
  const data = decodePayload(body(rest)) ?? decodePayload(body(rest.replace(/\s+/g, '')));
  if (!data) {
    throw new Error('덱 코드를 읽을 수 없습니다. 코드를 끝까지 복사했는지 확인해주세요.');
  }
  return data;
}

/**
 * 홀로부리 덱 코드 → 우리 덱 데이터. 텍스트 앞뒤에 다른 글자가 섞여 있어도 코드만 찾아 읽는다.
 * 형식이 아니거나 읽을 수 없으면 Error를 던진다.
 */
export function parseHoloburiCode(text: string): HoloburiDeckImport {
  const data = readCode(text);

  const cardById = new Map(CARDS.map((c) => [c.id, c]));
  const missingCardIds: string[] = [];
  let missingCardCount = 0;
  const miss = (id: string, n: number) => {
    missingCardIds.push(id);
    missingCardCount += n;
  };

  const artById = new Map<string, string>();
  if (Array.isArray(data.a)) {
    for (const e of data.a.slice(0, 100)) {
      if (Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string') {
        artById.set(e[0], e[1]);
      }
    }
  }
  const imageFor = (card: Card) => {
    const code = artById.get(card.id);
    return code ? imageForArtCode(card, code) : undefined;
  };

  let oshi: Card | null = null;
  let oshiImageUrl: string | undefined;
  if (typeof data.o === 'string' && data.o) {
    const card = cardById.get(data.o);
    if (card?.type === 'oshi') {
      oshi = card;
      oshiImageUrl = imageFor(card);
    } else {
      miss(data.o, 1);
    }
  }

  // 같은 카드번호가 여러 번 나오면 한 엔트리로 합친다(일러스트는 카드당 1종).
  const mainById = new Map<string, DeckEntry>();
  for (const [id, count] of validEntries(data.m)) {
    const card = cardById.get(id);
    if (!card || card.type === 'oshi') {
      miss(id, count);
      continue;
    }
    const prev = mainById.get(id);
    if (prev) {
      prev.count += count;
      continue;
    }
    const imageUrl = imageFor(card);
    mainById.set(id, { card, count, ...(imageUrl ? { imageUrl } : {}) });
  }

  // 옐: 색상별 매수 합산. 일러스트는 그 색에서 매수가 많은 옐 번호부터, 우리에게 있는 것을 쓴다.
  const cheers: Partial<Record<CardColor, number>> = {};
  const cheerIds: Partial<Record<CardColor, Map<string, number>>> = {};
  for (const [id, count] of validEntries(data.c)) {
    const color = CHEER_COLOR_BY_SET[id.match(/^(hY0\d)-\d{3}$/)?.[1] ?? ''];
    if (!color) {
      miss(id, count);
      continue;
    }
    cheers[color] = (cheers[color] ?? 0) + count;
    const ids = (cheerIds[color] ??= new Map());
    ids.set(id, (ids.get(id) ?? 0) + count);
  }
  const cheerImages: Partial<Record<CardColor, string>> = {};
  for (const color of CHEER_COLORS) {
    const ranked = [...(cheerIds[color] ?? [])].sort((a, b) => b[1] - a[1]);
    for (const [id] of ranked) {
      if (id === `${CHEER_SET[color]}-001`) break; // 기본 옐
      const hit = CHEER_VARIANTS[color].find((v) => cheerIdOfImage(v) === id);
      if (hit) {
        cheerImages[color] = hit;
        break;
      }
    }
  }

  const trimmed = typeof data.n === 'string' ? data.n.trim() : '';
  // 이모지가 반으로 잘리지 않도록 코드 포인트 단위로 자른다.
  const name = trimmed ? Array.from(trimmed).slice(0, MAX_NAME_LENGTH).join('') : null;

  return {
    name,
    oshi,
    ...(oshiImageUrl ? { oshiImageUrl } : {}),
    mainDeck: [...mainById.values()],
    cheers,
    ...(Object.keys(cheerImages).length ? { cheerImages } : {}),
    missingCardIds,
    missingCardCount,
  };
}
