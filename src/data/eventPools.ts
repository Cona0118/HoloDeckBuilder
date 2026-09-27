import type { Card, Deck } from '../types/card';

// 이벤트컵(대회) 카드풀 정의.
//
// 대회마다 사용 가능한 카드풀이 바뀐다. 카드 하나하나에 태그를 다는 대신
// "어떤 세트를 쓰는지"만 여기에 적어두면, 필터가 자동으로 해당 세트의 카드만 보여준다.
//
// ▶ 다음 대회로 교체/추가할 때는 이 파일의 EVENT_POOLS 만 수정하면 된다.
//   - 풀이 바뀌면 해당 항목의 sets 배열을 고치고,
//   - 새 대회를 추가하려면 EVENT_POOLS 에 새 객체를 하나 더 넣는다.

export interface EventPool {
  /** 내부 식별자(URL/상태 저장용, 영문 소문자-하이픈). */
  id: string;
  /** 화면에 표시되는 대회 이름. */
  name: string;
  /** 이 대회에서 "세트 전체"가 사용 가능한 세트 ID 목록(card.setId 기준, 예: 'hBP08'). */
  sets: string[];
  /** 세트 밖이지만 개별적으로 허용되는 카드 번호 목록(card.cardNumber 기준, 예: 'hBP01-104'). */
  cards?: string[];
}

/**
 * 연속된 세트를 짧게 표기하는 헬퍼.
 * 예) setRange('hSD', 14, 19) → ['hSD14','hSD15','hSD16','hSD17','hSD18','hSD19']
 */
export function setRange(prefix: string, from: number, to: number, pad = 2): string[] {
  const out: string[] = [];
  for (let n = from; n <= to; n++) out.push(`${prefix}${String(n).padStart(pad, '0')}`);
  return out;
}

export const EVENT_POOLS: EventPool[] = [
  {
    id: 'selection-cup',
    name: '셀렉션 컵',
    // 공식 【使用可能カード】セレクションカップ (cardsearch/?expansion=sele09) 기준.
    // hBP08 + hEB01 「섬머 홀로그램」 + hBP09 「볼륨 볼텍스」 전체
    sets: ['hBP08', 'hEB01', 'hBP09'],
    // 위 세트에 재록된 이전 세트 카드 — 같은 카드 번호라 개별 허용(번호 // 이름).
    cards: [
      'hBP01-021', // 토키노 소라
      'hBP01-026', // 베스티아 제타
      'hBP01-028', // IRyS
      'hBP01-031', // IRyS
      'hBP01-039', // 우사다 페코라
      'hBP01-041', // 우사다 페코라
      'hBP01-050', // 카자마 이로하
      'hBP01-051', // 카자마 이로하
      'hBP01-054', // 아이라니 이오피프틴
      'hBP01-055', // 아이라니 이오피프틴
      'hBP01-056', // 타카네 루이
      'hBP01-060', // 타카네 루이
      'hBP01-061', // 타카네 루이
      'hBP01-062', // 타카나시 키아라
      'hBP01-065', // 타카나시 키아라
      'hBP01-067', // 타카나시 키아라
      'hBP01-070', // 오마루 폴카
      'hBP01-072', // 하코스 벨즈
      'hBP01-074', // 하코스 벨즈
      'hBP01-081', // 호시마치 스이세이
      'hBP01-088', // 무나 호시노바
      'hBP01-090', // 무나 호시노바
      'hBP01-094', // 오로 크로니
      'hBP01-104', // 보통 컴퓨터
      'hBP01-107', // 앙코르
      'hBP01-118', // 안키모
      'hBP02-011', // 시라카미 후부키
      'hBP02-014', // 시로가네 노엘
      'hBP02-016', // 시로가네 노엘
      'hBP02-017', // 시로가네 노엘
      'hBP02-018', // 파볼리아 레이네
      'hBP02-022', // 파볼리아 레이네
      'hBP02-023', // 파볼리아 레이네
      'hBP02-024', // 오오카미 미오
      'hBP02-026', // 오오카미 미오
      'hBP02-027', // 오오카미 미오
      'hBP02-028', // 호쇼 마린
      'hBP02-033', // 호쇼 마린
      'hBP02-058', // 모리 칼리오페
      'hBP02-059', // 모리 칼리오페
      'hBP02-061', // 니노마에 이나니스
      'hBP02-065', // 네리사 레이븐크로프트
      'hBP02-067', // 네리사 레이븐크로프트
      'hBP02-079', // 폭발 마법
      'hBP02-095', // 도쿠로 군
      'hBP03-023', // 우사다 페코라
      'hBP03-029', // 사쿠라 미코
      'hBP03-034', // 아카이 하아토
      'hBP03-036', // 타카나시 키아라
      'hBP03-037', // 모코코 어비스가드
      'hBP03-040', // 후와와 어비스가드
      'hBP03-044', // 호시마치 스이세이
      'hBP03-050', // FUWAMOCO
      'hBP03-051', // 토코야미 토와
      'hBP03-059', // 로보코 씨
      'hBP03-060', // 로보코 씨
      'hBP03-065', // 이누가미 코로네
      'hBP03-070', // 츠노마키 와타메
      'hBP03-080', // 오토노세 카나데
      'hBP03-088', // 도츠마치
      'hBP04-008', // 하쿠이 코요리
      'hBP04-012', // 하쿠이 코요리
      'hBP04-028', // 세실리아 이머그린
      'hBP04-039', // 카엘라 코발스키아
      'hBP04-043', // 유키하나 라미
      'hBP04-047', // 유키하나 라미
      'hBP04-067', // 오오조라 스바루
      'hBP04-071', // 오오조라 스바루
      'hBP04-072', // 오오조라 스바루
      'hBP04-079', // 나츠이로 마츠리
      'hBP04-085', // 모모스즈 네네
      'hBP04-105', // 코요리의 조수 군
      'hBP04-106', // 유키민
      'hBP05-016', // 우사다 페코라
      'hBP05-045', // 네코마타 오카유
      'hBP05-060', // 네리사 레이븐크로프트
      'hBP05-074', // 프렌들리 컴퓨터
      'hBP05-075', // 규동
      'hBP05-080', // SorAZ 셀러브레이션
      'hSD01-018', // 서브 컴퓨터
      'hSD02-006', // 나키리 아야메
      'hSD02-007', // 나키리 아야메
      'hSD03-007', // 네코마타 오카유
      'hSD04-007', // 유즈키 초코
      'hSD05-002', // 토도로키 하지메
      'hSD05-007', // 토도로키 하지메
      'hSD06-005', // 카자마 이로하
      'hSD06-011', // 챠키마루
      'hSD08-007', // 츠노마키 와타메
      'hSD09-002', // 호쇼 마린
      'hSD10-007', // 키키라라 비비
      'hSD11-007', // 미즈미야 스우
      'hSD14-010', // holoAN
    ],
  },
];

/** id로 이벤트컵 풀을 찾는다. id가 비어 있으면 undefined. */
export function getEventPool(id: string | null | undefined): EventPool | undefined {
  if (!id) return undefined;
  return EVENT_POOLS.find((p) => p.id === id);
}

/** 카드가 풀에 포함되는지: 세트 전체 허용(setId) 또는 개별 허용(cardNumber). */
export function isCardInPool(card: Card, pool: EventPool): boolean {
  return pool.sets.includes(card.setId) || (pool.cards?.includes(card.cardNumber) ?? false);
}

/**
 * 덱에서 해당 풀에 속하지 않는 카드(오시 + 메인덱)를 카드번호 기준으로 중복 없이 반환.
 * 비어 있으면 덱이 그 대회에서 사용 가능(합법)하다는 뜻이다.
 * 옐(치어)은 카드가 아니라 색상 수량이라 풀 검사 대상이 아니다.
 */
export function getOutOfPoolCards(deck: Deck, pool: EventPool): Card[] {
  const cards: Card[] = [];
  if (deck.oshi) cards.push(deck.oshi);
  for (const e of deck.mainDeck) cards.push(e.card);

  const out: Card[] = [];
  const seen = new Set<string>();
  for (const c of cards) {
    if (isCardInPool(c, pool)) continue;
    if (seen.has(c.cardNumber)) continue;
    seen.add(c.cardNumber);
    out.push(c);
  }
  return out;
}
