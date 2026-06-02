import { create } from 'zustand';
import type { Deck } from '../types/card';
import type { GameMode, GameState, PlayerId, PlayerState, Slot } from '../game/types';
import { OTHER } from '../game/types';
import { mulberry32, randomSeed, type Rng } from '../game/rng';
import * as rules from '../game/setup';

interface InitOpts {
  mode: GameMode;
  p1Name?: string;
  p2Name?: string;
  seed?: number;
}

interface GameStore extends GameState {
  initGame: (p1Deck: Deck, p2Deck: Deck, opts: InitOpts) => void;
  decideFirstPlayer: (first: PlayerId) => void;
  mulligan: (redraw: boolean) => void; // activeActor 대상
  forcedMulligan: () => void; // activeActor 대상 (데뷔 없을 때 다시 뽑기)
  applyPenalty: (uids: string[]) => void; // activeActor 대상
  placeDebut: (uid: string, slot: Slot) => void; // activeActor 대상
  unplaceDebut: (slot: Slot) => void; // activeActor 대상
  confirmReady: () => void; // activeActor 대상
  reset: () => void;
}

const EMPTY: GameState = {
  phase: 'idle',
  mode: 'dev',
  players: {
    p1: emptyPlayer('P1'),
    p2: emptyPlayer('P2'),
  },
  randomlyPicked: null,
  firstPlayer: null,
  activeActor: 'p1',
  seed: 0,
};

function emptyPlayer(name: string): PlayerState {
  return {
    name,
    oshi: null,
    deck: [],
    hand: [],
    cheerDeck: [],
    life: [],
    center: null,
    back: [null, null, null, null, null],
    mulliganUsed: false,
    mulliganDecided: false,
    forcedMulligans: 0,
    penaltyDone: false,
    ready: false,
  };
}

/** 멀리건/데뷔체크/페널티를 마친 activeActor 다음의 phase·actor를 계산. */
function advanceAfterMulliganDone(s: GameState): Partial<GameState> {
  const other = OTHER[s.activeActor];
  if (!s.players[other].mulliganDecided) {
    // 상대 멀리건 차례
    return { phase: 'mulligan', activeActor: other };
  }
  // 양쪽 멀리건 완료 → 데뷔 배치(선공부터)
  const first = s.firstPlayer ?? 'p1';
  return { phase: 'placeDebut', activeActor: first };
}

/** activeActor의 멀리건 결정 직후: 데뷔 유무에 따라 debutCheck/penalty/다음으로. */
function afterMulliganDecision(s: GameState): Partial<GameState> {
  const p = s.players[s.activeActor];
  if (!rules.handHasDebut(p.hand)) {
    return { phase: 'debutCheck' }; // 공개 + 다시 뽑기 (UI가 forcedMulligan 호출)
  }
  if (p.forcedMulligans > 0 && !p.penaltyDone) {
    return { phase: 'penalty' };
  }
  return advanceAfterMulliganDone(s);
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...EMPTY,

  initGame: (p1Deck, p2Deck, opts) => {
    const seed = opts.seed ?? randomSeed();
    const rng: Rng = mulberry32(seed);
    const p1 = rules.buildPlayerState(p1Deck, opts.p1Name ?? 'P1', rng);
    const p2 = rules.buildPlayerState(p2Deck, opts.p2Name ?? 'P2', rng);
    const picked: PlayerId = rng() < 0.5 ? 'p1' : 'p2';
    set({
      phase: 'firstPlayer',
      mode: opts.mode,
      players: { p1, p2 },
      randomlyPicked: picked,
      firstPlayer: null,
      activeActor: picked,
      seed,
    });
  },

  decideFirstPlayer: (first) => {
    set({ firstPlayer: first, phase: 'mulligan', activeActor: first });
  },

  mulligan: (redraw) => {
    const s = get();
    const pid = s.activeActor;
    const rng = mulberry32(s.seed + 1 + s.players[pid].forcedMulligans);
    const updated = redraw
      ? rules.mulliganRedraw(s.players[pid], rng)
      : { ...s.players[pid], mulliganDecided: true };
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    set({ players: next.players, ...afterMulliganDecision(next) });
  },

  forcedMulligan: () => {
    const s = get();
    const pid = s.activeActor;
    const rng = mulberry32(s.seed + 100 + s.players[pid].forcedMulligans);
    const updated = rules.forcedRedraw(s.players[pid], rng);
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    if (!rules.handHasDebut(updated.hand)) {
      set({ players: next.players, phase: 'debutCheck' });
      return;
    }
    if (updated.forcedMulligans > 0 && !updated.penaltyDone) {
      set({ players: next.players, phase: 'penalty' });
      return;
    }
    set({ players: next.players, ...advanceAfterMulliganDone(next) });
  },

  applyPenalty: (uids) => {
    const s = get();
    const pid = s.activeActor;
    const updated = rules.applyPenalty(s.players[pid], uids);
    const next: GameState = { ...s, players: { ...s.players, [pid]: updated } };
    set({ players: next.players, ...advanceAfterMulliganDone(next) });
  },

  placeDebut: (uid, slot) => {
    const s = get();
    const pid = s.activeActor;
    set({ players: { ...s.players, [pid]: rules.placeDebut(s.players[pid], uid, slot) } });
  },

  unplaceDebut: (slot) => {
    const s = get();
    const pid = s.activeActor;
    set({ players: { ...s.players, [pid]: rules.unplaceDebut(s.players[pid], slot) } });
  },

  confirmReady: () => {
    const s = get();
    const pid = s.activeActor;
    if (!rules.canConfirmReady(s.players[pid])) return;
    const players = { ...s.players, [pid]: { ...s.players[pid], ready: true } };
    const other = OTHER[pid];
    if (!players[other].ready) {
      set({ players, activeActor: other }); // 상대 데뷔 배치 차례
    } else {
      set({ players, phase: 'ready' });
    }
  },

  reset: () => set({ ...EMPTY }),
}));
