import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type RoomRole = 'host' | 'guest';

export interface RoomPlayer {
  clientId: string;
  name: string;
  role: RoomRole;
  deckId: string | null;
  deckName: string | null;
  ready: boolean;
}

export type RoomStatus =
  | 'connecting' // 채널 구독 중
  | 'connected' // 방 참여 완료
  | 'not_found' // (게스트) 호스트가 없는 방
  | 'full' // 정원(2명) 초과
  | 'error'; // 연결 오류

interface UseRoomOptions {
  code: string;
  name: string;
  isHost: boolean;
  /** game_start broadcast 수신 시(시작 버튼) 호출. */
  onGameStart: () => void;
}

interface UseRoomResult {
  status: RoomStatus;
  players: RoomPlayer[];
  me: RoomPlayer;
  opponent: RoomPlayer | null;
  setReady: (ready: boolean) => void;
  setDeck: (deckId: string | null, deckName: string | null) => void;
  startGame: () => void;
  leave: () => void;
}

/** join 순서로 정렬 가능하도록 timestamp 접두사를 가진 clientId. */
function genClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 탭(session) 단위로 고정된 clientId.
 * sessionStorage 에 저장해 StrictMode 의 mount→remount 나 같은 탭 내 재진입에도
 * 동일 presence key 를 재사용 → 유령 참가자(중복 presence) 방지.
 * 서로 다른 탭/브라우저는 sessionStorage 가 분리되어 각자 다른 id 를 가진다.
 */
function getClientId(): string {
  const KEY = 'holo-client-id';
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = genClientId();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return genClientId();
  }
}

/**
 * Supabase Realtime Presence/Broadcast 기반 일시적(ephemeral) 방.
 * DB 테이블 없이 채널 `room:{code}` 의 presence 로 참가자 상태를 공유한다.
 */
export function useRoom({ code, name, isHost, onGameStart }: UseRoomOptions): UseRoomResult {
  // clientId 는 탭 세션 동안 고정값 → state 로 보관(렌더 중 안전하게 읽기 위함).
  const [clientId] = useState(getClientId);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [me, setMe] = useState<RoomPlayer>(() => ({
    clientId,
    name,
    role: isHost ? 'host' : 'guest',
    deckId: null,
    deckName: null,
    // 호스트는 별도 준비 버튼이 없고 시작 권한을 가지므로 항상 ready 로 표시.
    ready: isHost,
  }));

  // 구독 콜백/타이머에서 최신값을 참조하기 위한 ref (갱신은 이펙트 안에서만).
  const onGameStartRef = useRef(onGameStart);
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const setReady = useCallback(
    (ready: boolean) => setMe((prev) => ({ ...prev, ready })),
    [],
  );

  const setDeck = useCallback(
    (deckId: string | null, deckName: string | null) =>
      setMe((prev) => ({ ...prev, deckId, deckName })),
    [],
  );

  const startGame = useCallback(() => {
    // self:true 설정으로 호스트 본인도 동일 핸들러로 game_start 를 수신한다.
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'game_start',
      payload: { code },
    });
  }, [code]);

  const leave = useCallback(() => {
    const ch = channelRef.current;
    if (ch) {
      void ch.untrack();
      void supabase.removeChannel(ch);
      channelRef.current = null;
    }
  }, []);

  // 채널 구독 (code 단위로 1회).
  useEffect(() => {
    const channel = supabase.channel(`room:${code}`, {
      config: {
        broadcast: { self: true },
        presence: { key: clientId },
      },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<RoomPlayer>();
      const byId = new Map<string, RoomPlayer>();
      for (const entries of Object.values(state)) {
        const p = entries[0];
        if (p?.clientId) byId.set(p.clientId, p);
      }
      // clientId(=join 시각 접두사) 오름차순 → 먼저 들어온 순서.
      const sorted = [...byId.values()].sort((a, b) =>
        a.clientId.localeCompare(b.clientId),
      );
      setPlayers(sorted);

      // 정원 2명 초과: 호스트 + 먼저 들어온 게스트만 유지, 나머지 게스트는 full.
      if (!isHost) {
        const guests = sorted.filter((p) => p.role === 'guest');
        const myIdx = guests.findIndex((g) => g.clientId === clientId);
        if (myIdx > 0) {
          void channel.untrack();
          setStatus('full');
        }
      }
    });

    channel.on('broadcast', { event: 'game_start' }, () => {
      onGameStartRef.current();
    });

    channel.subscribe((subStatus) => {
      if (subStatus === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
        setStatus('error');
      }
    });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [code, clientId, isHost]);

  // 내 상태(me)를 presence 로 동기화 (연결 후 최초 1회 + 변경 시마다).
  // 덱 이름은 상대에게 노출하지 않도록 전송 payload 에서 제외(선택 여부만 deckId 로 공유).
  useEffect(() => {
    if (status === 'connected') {
      void channelRef.current?.track({ ...me, deckName: null });
    }
  }, [me, status]);

  // (게스트) 일정 시간 내 호스트가 보이지 않으면 잘못된 방코드로 간주.
  useEffect(() => {
    if (status !== 'connected' || isHost) return;
    const timer = window.setTimeout(() => {
      const hasHost = playersRef.current.some((p) => p.role === 'host');
      if (!hasHost) setStatus('not_found');
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [status, isHost]);

  const opponent = players.find((p) => p.clientId !== clientId) ?? null;

  return { status, players, me, opponent, setReady, setDeck, startGame, leave };
}
