import type { Card, CardColor, CardType, HolomemSubtype, SupportSubtype, FilterState, SearchScope, AbilityTiming } from '../types/card';
import { getEventPool, isCardInPool } from '../data/eventPools';

export const COLOR_LABELS: Record<CardColor, string> = {
  white:  '백',
  green:  '녹',
  red:    '적',
  blue:   '청',
  purple: '자',
  yellow: '황',
};

export const COLOR_BG: Record<CardColor, string> = {
  white:  'bg-white text-gray-800 border-gray-300',
  green:  'bg-green-600 text-white border-green-700',
  red:    'bg-red-600 text-white border-red-700',
  blue:   'bg-blue-600 text-white border-blue-700',
  purple: 'bg-purple-600 text-white border-purple-700',
  yellow: 'bg-yellow-500 text-gray-900 border-yellow-600',
};

export const COLOR_ACCENT: Record<CardColor, string> = {
  white:  '#e0e0e0',
  green:  '#22c55e',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#a855f7',
  yellow: '#eab308',
};

export const TYPE_LABELS: Record<CardType, string> = {
  oshi:    '오시',
  holomem: '홀로멤',
  support: '서포트',
};

export const TYPE_BG: Record<CardType, string> = {
  oshi:    'bg-amber-500 text-white',
  holomem: 'bg-emerald-600 text-white',
  support: 'bg-sky-600 text-white',
};

export const HOLOMEM_SUBTYPE_LABELS: Record<HolomemSubtype, string> = {
  debut: 'Debut',
  '1st': '1st',
  '2nd': '2nd',
  spot:  'Spot',
};

export const SUPPORT_SUBTYPE_LABELS: Record<SupportSubtype, string> = {
  event:   '이벤트',
  fan:     '팬',
  mascot:  '마스코트',
  tool:    '툴',
  item:    '아이템',
  staff:   '스태프',
  '':      '미분류',
};

export const SUPPORT_SUBTYPE_BG: Record<SupportSubtype, string> = {
  event:   'bg-orange-600 text-white',
  fan:     'bg-pink-600 text-white',
  mascot:  'bg-teal-600 text-white',
  tool:    'bg-slate-600 text-white',
  item:    'bg-amber-700 text-white',
  staff:   'bg-cyan-700 text-white',
  '':      'bg-gray-600 text-white',
};

export const ABILITY_TIMING_LABELS: Record<AbilityTiming, string> = {
  gift:   '기프트',
  collab: '콜라보',
  bloom:  '블룸',
};

export function isBuzz(card: Card): boolean {
  return card.type === 'holomem' && card.holomemSubtype === '1st' && !!card.extraRule?.includes('라이프 -2');
}

/** 카드의 효과/룰 텍스트를 한 문자열로 합쳐 소문자로 반환 (효과 검색용). */
export function getCardEffectText(card: Card): string {
  const parts: string[] = [];
  (card.abilities ?? []).forEach((a) => {
    if (a.name) parts.push(a.name);
    if (a.description) parts.push(a.description);
  });
  [card.oshiStageAbility, card.oshiAbility, card.spAbility].forEach((ab) => {
    if (ab) {
      if (ab.name) parts.push(ab.name);
      if (ab.description) parts.push(ab.description);
    }
  });
  if (card.extraRule) parts.push(card.extraRule);
  return parts.join(' ').toLowerCase();
}

/** 검색어 q가 주어진 검색 범위(scope)에서 카드와 매치되는지 판정. */
function matchesQuery(card: Card, q: string, scope: SearchScope): boolean {
  const inName = () =>
    card.name.toLowerCase().includes(q) ||
    (card.nameJp ?? '').toLowerCase().includes(q) ||
    card.cardNumber.toLowerCase().includes(q) ||
    (card.keywords ?? []).some((kw) => kw.toLowerCase().includes(q));
  const inTag = () => (card.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
  const inEffect = () => getCardEffectText(card).includes(q);

  switch (scope) {
    case 'name':   return inName();
    case 'tag':    return inTag();
    case 'effect': return inEffect();
    case 'all':
    default:       return inName() || inTag() || inEffect();
  }
}

export function filterCards(cards: Card[], filter: FilterState): Card[] {
  return cards.filter((card) => {
    if (filter.searchText) {
      const queries = filter.searchText.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const scope = filter.searchScope ?? 'all';
      const match = queries.some((q) => matchesQuery(card, q, scope));
      if (!match) return false;
    }
    if (filter.types.length > 0 && !filter.types.includes(card.type)) return false;
    if (filter.colors.length > 0) {
      if (!card.color || !card.color.some((c) => filter.colors.includes(c))) return false;
    }
    if (filter.holomemSubtypes.length > 0) {
      if (card.type !== 'holomem' || !card.holomemSubtype || !filter.holomemSubtypes.includes(card.holomemSubtype)) return false;
    }
    if (filter.buzzOnly) {
      if (card.type !== 'holomem' || card.holomemSubtype !== '1st' || !isBuzz(card)) return false;
    }
    if (filter.holomemAbilities && filter.holomemAbilities.length > 0) {
      if (card.type !== 'holomem') return false;
      const timings = new Set((card.abilities ?? []).map((a) => a.timing).filter(Boolean));
      // OR 로직: 선택한 효과 타이밍 중 하나라도 보유하면 통과
      if (!filter.holomemAbilities.some((t) => timings.has(t))) return false;
    }
    if (filter.supportSubtypes.length > 0) {
      if (card.type !== 'support' || !filter.supportSubtypes.includes(card.supportSubtype ?? '')) return false;
    }
    if (filter.limitedFilter !== null && filter.limitedFilter !== undefined) {
      if (card.type !== 'support') return false;
      if (filter.limitedFilter !== (card.limited === true)) return false;
    }
    if (filter.tags.length > 0) {
      const cardTags = card.tags ?? [];
      const match = filter.tagFilterMode === 'and'
        ? filter.tags.every((t) => cardTags.includes(t))
        : filter.tags.some((t) => cardTags.includes(t));
      if (!match) return false;
    }
    if (filter.sets.length > 0) {
      const normalizedSetId = /^hBD\d/.test(card.setId) ? 'hBD' : card.setId;
      if (!filter.sets.includes(normalizedSetId)) return false;
    }
    if (filter.eventPool) {
      // 이벤트컵 카드풀: 세트 전체 허용 + 개별 허용 카드만 통과.
      const pool = getEventPool(filter.eventPool);
      if (pool && !isCardInPool(card, pool)) return false;
    }
    return true;
  });
}

export function getPrimaryColor(card: Card): CardColor | null {
  return card.color?.[0] ?? null;
}

export function getAccentColor(card: Card): string {
  const c = getPrimaryColor(card);
  return c ? COLOR_ACCENT[c] : '#6b7280';
}
