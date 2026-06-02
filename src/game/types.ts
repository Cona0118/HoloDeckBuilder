import type { Card, CardColor } from '../types/card';

export type PlayerId = 'p1' | 'p2';

/** 메인덱 카드 인스턴스 — 같은 카드 여러 장을 uid로 구분. */
export interface CardInstance {
  uid: string;
  card: Card;
  imageUrl?: string;
}

/** 데뷔 배치 대상 슬롯. */
export type Slot = { zone: 'center' } | { zone: 'back'; index: number };

export interface PlayerState {
  name: string;
  oshi: Card | null;
  oshiImageUrl?: string;
  deck: CardInstance[]; // 셔플된 메인덱, index 0 = 맨 위
  hand: CardInstance[];
  cheerDeck: CardColor[]; // 셔플된 옐덱, index 0 = 맨 위
  life: CardColor[]; // 라이프(뒷면). cheerDeck 위에서 oshi.life장
  center: CardInstance | null; // 센터 (데뷔 필수)
  back: (CardInstance | null)[]; // 백 1~5 (길이 5, null = 빈 슬롯)
  mulliganUsed: boolean; // 임의 멀리건으로 다시 뽑았는지
  mulliganDecided: boolean; // 임의 멀리건 단계(유지/다시)를 마쳤는지
  forcedMulligans: number; // 데뷔 없음으로 강제 재멀리건한 횟수 (페널티 카운트)
  penaltyDone: boolean; // 페널티 카드 반납 완료
  ready: boolean; // 데뷔 배치 확정
}

export type Phase =
  | 'idle' // 게임 시작 전 (init 대기)
  | 'firstPlayer' // 시스템이 무작위 지목한 플레이어가 선/후공 결정
  | 'mulligan' // activeActor 임의 멀리건(유지/다시) 결정
  | 'debutCheck' // activeActor 데뷔 없으면 공개 + 강제 재멀리건 반복
  | 'penalty' // activeActor 강제 멀리건 횟수만큼 패 → 덱 맨 아래
  | 'placeDebut' // activeActor 센터(필수) + 백(선택) 데뷔 배치
  | 'ready' // 셋업 완료
  | 'gameover'; // 승패 결정 (현재: 강제 멀리건 6회 패배)

export type GameMode = 'solo' | 'dev' | 'online';

export interface GameState {
  phase: Phase;
  mode: GameMode;
  players: Record<PlayerId, PlayerState>;
  randomlyPicked: PlayerId | null; // 선후공 결정권자 (시스템 무작위)
  firstPlayer: PlayerId | null; // 선공 확정
  activeActor: PlayerId; // 핫시트: 지금 조작 대상
  winner: PlayerId | null; // 승자 (gameover phase에서 설정)
  seed: number;
}

export const OTHER: Record<PlayerId, PlayerId> = { p1: 'p2', p2: 'p1' };
