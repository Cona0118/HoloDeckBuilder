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
    // hBP07 전체 + hBP08 전체 + hSD14~hSD19 전체
    sets: ['hBP07', 'hBP08', ...setRange('hSD', 14, 19)],
    // 위 세트 밖이지만 개별 허용되는 카드(번호 // 이름).
    cards: [
      'hBP01-104', // 보통 컴퓨터
      'hBP02-077', // 레트로 컴퓨터
      'hBP02-084', // 밋코로네 24
      'hSD01-017', // 마네쨩
      'hSD01-019', // 굉장한 컴퓨터
      'hBP02-088', // 모리 칼리오페의 낫
      'hBP03-107', // 35P
      'hBP01-028', // IRyS
      'hBP01-056', // 타카네 루이
      'hBP01-062', // 타카나시 키아라
      'hBP02-018', // 파볼리아 레이네
      'hBP02-061', // 니노마에 이나니스
      'hBP03-037', // 모코코 어비스가드
      'hBP03-040', // 후와와 어비스가드
      'hBP03-080', // 오토노세 카나데
      'hBP04-028', // 세실리아 이머그린
      'hSD11-007', // 미즈미야 스우
      'hBP01-024', // 베스티아 제타
      'hBP01-044', // AZKi
      'hBP01-092', // 오로 크로니
      'hBP02-024', // 오오카미 미오
      'hBP03-025', // 사쿠라 미코
      'hBP03-031', // 아카이 하아토
      'hBP03-067', // 츠노마키 와타메
      'hBP04-050', // 시오리 노벨라
      'hBP04-054', // 라플라스 다크니스
      'hBP04-083', // 모모스즈 네네
      'hSD10-002', // 린도 치하야
      'hSD11-002', // 코가네이 니코
      'hSD10-013', // 후구타로
      'hBP01-124', // 개척자
      'hBP02-101', // 미오파
      'hBP03-112', // 와타메이트
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
