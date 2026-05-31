import type { Card, CardColor, Deck, DeckEntry } from '../types/card';
import type { DeckSnapshot } from '../types/deckPost';
import { CARDS } from '../data/cards';

/** Deck → 직렬화 가능한 snapshot. oshi/메인덱은 cardId로, 매수와 일러스트 URL은 그대로. */
export function deckToSnapshot(deck: Deck): DeckSnapshot {
  if (!deck.oshi) {
    throw new Error('오시 카드가 없는 덱은 공유할 수 없습니다.');
  }
  return {
    oshiCardId: deck.oshi.id,
    ...(deck.oshiImageUrl ? { oshiImageUrl: deck.oshiImageUrl } : {}),
    mainDeck: deck.mainDeck.map((e) => ({
      cardId: e.card.id,
      count: e.count,
      ...(e.imageUrl ? { imageUrl: e.imageUrl } : {}),
    })),
    cheers: { ...(deck.cheers ?? {}) },
  };
}

export interface SnapshotResolveResult {
  oshi: Card | null;
  oshiImageUrl?: string;
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
      mainDeck.push({
        card,
        count: entry.count,
        ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}),
      });
    } else {
      missingCardIds.push(entry.cardId);
      missingCardCount += entry.count;
    }
  }

  return {
    oshi,
    oshiImageUrl: snapshot.oshiImageUrl,
    mainDeck,
    cheers: { ...snapshot.cheers },
    missingCardIds,
    missingCardCount,
  };
}

/** 한글 색상 약자 → CardColor (엘 덱 텍스트 파싱용). */
const COLOR_KO_TO_EN: Record<string, CardColor> = {
  백: 'white',
  녹: 'green',
  적: 'red',
  청: 'blue',
  자: 'purple',
  황: 'yellow',
};

const ALL_COLORS: CardColor[] = [
  'white',
  'green',
  'red',
  'blue',
  'purple',
  'yellow',
];

export interface ParsedDeckText {
  /** `# 제목` 줄에서 추출한 덱 이름 (없으면 null). */
  deckName: string | null;
  oshi: Card | null;
  mainDeck: DeckEntry[];
  cheers: Partial<Record<CardColor, number>>;
  /** CARDS에서 찾지 못한 카드의 총 매수 (오시는 1로 카운트). */
  missingCardCount: number;
  /** 카드/엘 정보를 하나라도 인식했는지 (유효성 판단용). */
  recognizedAny: boolean;
}

/**
 * `exportDeckText()`가 만드는 텍스트 포맷을 거꾸로 파싱한다.
 *   # 덱이름
 *   ## 오시
 *   hSD01-001 토키노 소라
 *   ## 메인 덱
 *   hSD01-003 AZKi x4
 *   ## 엘 덱
 *   백 x10
 * 카드는 줄 맨 앞 토큰(카드번호)으로 CARDS와 매칭하고, 못 찾으면 id로 한 번 더 시도한다.
 * 일러스트 정보는 텍스트에 없으므로 기본 이미지를 사용한다.
 */
export function parseDeckText(text: string): ParsedDeckText {
  const cardByNumber = new Map(CARDS.map((c) => [c.cardNumber, c]));
  const cardById = new Map(CARDS.map((c) => [c.id, c]));
  const findCard = (token: string): Card | undefined =>
    cardByNumber.get(token) ?? cardById.get(token);

  let deckName: string | null = null;
  let oshi: Card | null = null;
  const mainDeck: DeckEntry[] = [];
  const cheers: Partial<Record<CardColor, number>> = {};
  let missingCardCount = 0;
  let recognizedAny = false;

  type Section = 'none' | 'oshi' | 'main' | 'cheer';
  let section: Section = 'none';

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // 섹션 헤더 (## ...)
    if (line.startsWith('##')) {
      const header = line.replace(/^#+/, '').trim();
      if (header.includes('오시')) section = 'oshi';
      else if (header.includes('메인')) section = 'main';
      else if (
        header.includes('엘') ||
        header.includes('치어') ||
        header.toLowerCase().includes('cheer')
      )
        section = 'cheer';
      else section = 'none';
      continue;
    }
    // 덱 제목 (# ...)
    if (line.startsWith('#')) {
      deckName = line.replace(/^#+/, '').trim() || null;
      continue;
    }

    // 엘 덱: "백 x10"
    if (section === 'cheer') {
      const m = line.match(/^(\S+)\s*[x×]\s*(\d+)/i);
      if (m) {
        const color =
          COLOR_KO_TO_EN[m[1]] ??
          (ALL_COLORS.includes(m[1] as CardColor)
            ? (m[1] as CardColor)
            : undefined);
        const cnt = parseInt(m[2], 10);
        if (color && cnt > 0) {
          cheers[color] = (cheers[color] ?? 0) + cnt;
          recognizedAny = true;
        }
      }
      continue;
    }

    if (section !== 'oshi' && section !== 'main') continue;

    // 카드 줄: 맨 앞 토큰 = 카드번호, 끝의 xN = 매수
    const token = line.split(/\s+/)[0];
    const countMatch = line.match(/[x×]\s*(\d+)\s*$/i);
    const count = countMatch ? Math.max(1, parseInt(countMatch[1], 10)) : 1;
    const card = findCard(token);

    if (section === 'oshi') {
      if (card) {
        oshi = card;
        recognizedAny = true;
      } else {
        missingCardCount += 1;
      }
    } else {
      if (card) {
        const existing = mainDeck.find(
          (e) => e.card.id === card.id && e.imageUrl === undefined,
        );
        if (existing) existing.count += count;
        else mainDeck.push({ card, count });
        recognizedAny = true;
      } else {
        missingCardCount += count;
      }
    }
  }

  return { deckName, oshi, mainDeck, cheers, missingCardCount, recognizedAny };
}
