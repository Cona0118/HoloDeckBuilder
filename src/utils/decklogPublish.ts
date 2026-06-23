import type { CardColor, Deck } from '../types/card';
import { DECKLOG_VIEW_BASE_JP, DECKLOG_RESPONSE_CODE_FIELD } from './decklogApi';
import { supabase } from '../lib/supabase';

/**
 * Deck Log `/publish/9` 가 받는 덱 레시피 바디.
 * 카드 객체 배열이 아니라 manage_id의 **평행 배열**이다(num은 같은 인덱스의 매수).
 * token_id/token 은 Edge Function이 `/create/` 에서 받아 주입하므로 여기엔 없다.
 */
export interface DeckLogPayload {
  id: string; // '' (신규 발행)
  deck_id: string; // '' (신규 발행)
  title: string;
  post_deckrecipe: number; // 1
  memo: string; // ''
  deck_param1: string; // 'S' (hOCG Standard)
  deck_param2: string; // ''
  add_param1: string; // ''
  add_param2: string; // ''
  no: string[]; // 메인덱 manage_id
  num: number[]; // 메인덱 매수 (no와 같은 인덱스)
  sub_no: string[]; // 옐덱 manage_id
  sub_num: number[]; // 옐덱 매수 (sub_no와 같은 인덱스)
  p_no: string[]; // 오시 manage_id
  p_num: number[]; // [1]
  p_slot: (number | null)[]; // [null]
  has_session: boolean; // false
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

/**
 * hocg_cards.json은 `card_number → 카드객체` 맵 형태다(배열 아님).
 * 맵이면 값 배열로, 이미 배열이면 그대로, 그 외엔 빈 배열로 정규화한다.
 */
export function parseCardsJson(json: unknown): RawCard[] {
  if (Array.isArray(json)) return json as RawCard[];
  if (json && typeof json === 'object') {
    return Object.values(json as Record<string, RawCard>);
  }
  return [];
}

const TITLE_MAX = 25;
const DECK_PARAM1 = 'S'; // hOCG는 Standard 포맷 고정(관측값)

export function buildDeckLogPayload(
  deck: Deck,
  index: ManageIdIndex,
): { payload: DeckLogPayload; unpublishable: string[] } {
  const unpublishable: string[] = [];

  // 오시
  const p_no: string[] = [];
  const p_num: number[] = [];
  const p_slot: (number | null)[] = [];
  if (deck.oshi) {
    const oshiId = index.byCardNumber.get(deck.oshi.cardNumber);
    if (oshiId) {
      p_no.push(oshiId);
      p_num.push(1);
      p_slot.push(null);
    } else {
      unpublishable.push(deck.oshi.cardNumber);
    }
  }

  // 메인덱: 같은 카드번호는 매수 합산(아트 변형은 무시하고 기본 인쇄로 발행)
  const mainCounts = new Map<string, number>();
  for (const e of deck.mainDeck) {
    mainCounts.set(
      e.card.cardNumber,
      (mainCounts.get(e.card.cardNumber) ?? 0) + e.count,
    );
  }
  const no: string[] = [];
  const num: number[] = [];
  for (const [cardNumber, count] of mainCounts) {
    const manageId = index.byCardNumber.get(cardNumber);
    if (!manageId) {
      unpublishable.push(cardNumber);
      continue;
    }
    no.push(manageId);
    num.push(count);
  }

  // 옐덱: 색상별 대표 옐카드의 manage_id로 발행
  const sub_no: string[] = [];
  const sub_num: number[] = [];
  const cheers = deck.cheers ?? {};
  for (const color of Object.keys(cheers) as CardColor[]) {
    const count = cheers[color] ?? 0;
    if (count <= 0) continue;
    const yell = index.yellByColor[color];
    if (!yell) {
      unpublishable.push(`(옐:${color})`);
      continue;
    }
    sub_no.push(yell.manageId);
    sub_num.push(count);
  }

  const payload: DeckLogPayload = {
    id: '',
    deck_id: '',
    title: (deck.name ?? '').slice(0, TITLE_MAX),
    post_deckrecipe: 1,
    memo: '',
    deck_param1: DECK_PARAM1,
    deck_param2: '',
    add_param1: '',
    add_param2: '',
    no,
    num,
    sub_no,
    sub_num,
    p_no,
    p_num,
    p_slot,
    has_session: false,
  };
  return { payload, unpublishable };
}

const CARDS_JSON_URL = 'https://qrimpuff.github.io/hocg-fan-sim-assets/hocg_cards.json';

let cachedIndex: ManageIdIndex | null = null;

export async function loadManageIdIndex(): Promise<ManageIdIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(CARDS_JSON_URL);
  if (!res.ok) throw new Error('카드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  const json: unknown = await res.json();
  cachedIndex = buildManageIdIndex(parseCardsJson(json));
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
