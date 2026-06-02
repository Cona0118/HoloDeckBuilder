import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useRoom, type RoomPlayer } from '../hooks/useRoom';
import { useDeckStore } from '../store/deckStore';
import { useLobbyStore } from '../store/lobbyStore';
import { validateDeck } from '../game/setup';

function PlayerSlot({
  player,
  isMe,
  empty,
}: {
  player: RoomPlayer | null;
  isMe: boolean;
  empty?: boolean;
}) {
  if (empty || !player) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-36 mobile-landscape:h-28 bg-gray-900/50 border border-dashed border-gray-700 rounded-xl text-gray-600">
        <svg className="w-6 h-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span className="text-xs">상대방 대기 중...</span>
      </div>
    );
  }

  const isHost = player.role === 'host';
  return (
    <div
      className={`flex flex-col gap-2 h-36 mobile-landscape:h-28 p-3 rounded-xl border transition-colors ${
        player.ready
          ? 'bg-emerald-950/40 border-emerald-700'
          : 'bg-gray-800/60 border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isHost ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'
          }`}
        >
          {isHost ? '방장' : '게스트'}
        </span>
        {isMe && <span className="text-[10px] text-gray-500">나</span>}
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-sm font-semibold text-white truncate">{player.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {isMe
            ? player.deckName
              ? `덱: ${player.deckName}`
              : '덱 미선택'
            : player.deckId
              ? '덱 선택 완료'
              : '덱 미선택'}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {isHost ? (
          <span className="text-[11px] text-indigo-300">시작 권한</span>
        ) : player.ready ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
            </svg>
            준비 완료
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">준비 안 됨</span>
        )}
      </div>
    </div>
  );
}

export default function RoomPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const decks = useDeckStore((s) => s.decks);
  const storedName = useLobbyStore((s) => s.playerName);

  const navState = location.state as { isHost?: boolean; name?: string } | null;
  const isHost =
    navState?.isHost ?? sessionStorage.getItem(`holo-room-host:${code}`) === '1';
  const name = navState?.name ?? (storedName.trim() || 'player');

  const [copied, setCopied] = useState(false);

  const onGameStart = useCallback(() => {
    navigate(`/game/${code}`, { state: { isHost } });
  }, [navigate, code, isHost]);

  const room = useRoom({ code, name, isHost, onGameStart });
  const { status, me, opponent } = room;

  function leaveRoom() {
    room.leave();
    sessionStorage.removeItem(`holo-room-host:${code}`);
    navigate('/lobby');
  }

  function copyCode() {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function onSelectDeck(e: React.ChangeEvent<HTMLSelectElement>) {
    const deck = decks.find((d) => d.id === e.target.value);
    if (!deck) {
      room.setDeck(null, null);
      if (me.ready) room.setReady(false);
    } else {
      room.setDeck(deck.id, deck.name);
      // 올바르지 않은 덱으로 바꾸면 준비 해제
      if (me.ready && !validateDeck(deck).valid) room.setReady(false);
    }
  }

  // 비정상 상태(방 없음 / 정원 초과 / 오류) 화면
  if (status === 'not_found' || status === 'full' || status === 'error') {
    const msg =
      status === 'not_found'
        ? '존재하지 않는 방이거나 방장이 나갔습니다.'
        : status === 'full'
          ? '방 정원(2명)이 가득 찼습니다.'
          : '연결에 문제가 발생했습니다.';
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 text-center"
        style={{ background: '#0f0f1a' }}
      >
        <p className="text-sm text-gray-300">{msg}</p>
        <button
          onClick={leaveRoom}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold text-white transition-colors"
        >
          대기실로 돌아가기
        </button>
      </div>
    );
  }

  const myDeck = decks.find((d) => d.id === me.deckId);
  const myDeckValid = validateDeck(myDeck).valid;
  const canStart = !!opponent && opponent.ready && myDeckValid;

  return (
    <div
      className="min-h-dvh flex flex-col items-center px-4 py-8 mobile-landscape:py-3"
      style={{ background: '#0f0f1a' }}
    >
      <div className="w-full max-w-md mobile-landscape:max-w-3xl">
        {/* 헤더: 방코드 */}
        <div className="flex items-center justify-between mb-6 mobile-landscape:mb-3">
          <button
            onClick={leaveRoom}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            나가기
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">방코드</span>
            <button
              onClick={copyCode}
              title="복사"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-lg hover:border-indigo-500 transition-colors"
            >
              <span className="text-sm font-bold tracking-widest text-white">{code}</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {copied && (
          <p className="text-[11px] text-emerald-400 text-right -mt-4 mb-3">방코드가 복사되었습니다</p>
        )}

        {status === 'connecting' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 mobile-landscape:py-10 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">방에 연결하는 중...</span>
          </div>
        ) : (
          <div className="mobile-landscape:flex mobile-landscape:gap-5 mobile-landscape:items-start">
            {/* 플레이어 슬롯 */}
            <div className="grid grid-cols-2 gap-3 mb-6 mobile-landscape:mb-0 mobile-landscape:flex-1">
              <PlayerSlot player={me} isMe />
              <PlayerSlot player={opponent} isMe={false} empty={!opponent} />
            </div>

            {/* 우측: 덱 선택 + 준비/시작 (가로모드에서 옆으로 배치) */}
            <div className="mobile-landscape:w-72 mobile-landscape:shrink-0">
              {/* 내 사용덱 선택 */}
              <div className="flex flex-col gap-1.5 mb-5 mobile-landscape:mb-3">
              <label className="text-xs font-medium text-gray-400">내 사용덱</label>
              {decks.length === 0 ? (
                <div className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-500">
                  저장된 덱이 없습니다.{' '}
                  <button onClick={() => navigate('/')} className="text-indigo-400 hover:underline">
                    덱 빌더에서 만들기
                  </button>
                </div>
              ) : (
                <select
                  value={me.deckId ?? ''}
                  onChange={onSelectDeck}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">덱 선택...</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}{validateDeck(d).valid ? '' : ' (사용 불가)'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 준비 / 시작 버튼 (같은 위치, 역할별 렌더링) */}
            {isHost ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={room.startGame}
                  disabled={!canStart}
                  className={`w-full py-3.5 rounded-lg text-sm font-bold transition-colors ${
                    canStart
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  게임 시작
                </button>
                {!canStart && (
                  <p className="text-[11px] text-gray-500 text-center">
                    {!me.deckId
                      ? '사용할 덱을 선택하세요.'
                      : !myDeckValid
                        ? '올바른 덱이 아닙니다 (메인 50·옐 20·오시 1·데뷔 1+).'
                        : !opponent
                          ? '상대방의 입장을 기다리는 중...'
                          : '상대방의 준비를 기다리는 중...'}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => room.setReady(!me.ready)}
                  disabled={!myDeckValid}
                  className={`w-full py-3.5 rounded-lg text-sm font-bold transition-colors ${
                    !myDeckValid
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : me.ready
                        ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {me.ready ? '준비 완료 (해제)' : '준비'}
                </button>
                {!myDeckValid && (
                  <p className="text-[11px] text-gray-500 text-center">
                    {!me.deckId ? '사용할 덱을 선택하세요.' : '올바른 덱이 아닙니다 (메인 50·옐 20·오시 1·데뷔 1+).'}
                  </p>
                )}
                {me.ready && (
                  <p className="text-[11px] text-gray-500 text-center">방장이 시작하기를 기다리는 중...</p>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
