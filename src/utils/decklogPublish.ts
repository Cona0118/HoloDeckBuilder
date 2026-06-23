import type { CardColor, Deck } from '../types/card';
import { DECKLOG_GAME_TITLE_ID_JP, DECKLOG_VIEW_BASE_JP, DECKLOG_RESPONSE_CODE_FIELD } from './decklogApi';
import { supabase } from '../lib/supabase';

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
