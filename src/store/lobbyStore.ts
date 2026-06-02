import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LobbyState {
  /** 대기실/방에서 사용할 플레이어 이름. 기본값 'player'. */
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      playerName: 'player',
      setPlayerName: (name) => set({ playerName: name }),
    }),
    { name: 'holo-lobby' },
  ),
);
