import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';
import { useDeckStore } from '../store/deckStore';

// 헷갈리는 문자(0/O/1/I) 제외한 방코드 문자셋.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function genRoomCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const playerName = useLobbyStore((s) => s.playerName);
  const setPlayerName = useLobbyStore((s) => s.setPlayerName);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  const name = playerName.trim() || 'player';
  const decks = useDeckStore((s) => s.decks);
  const [p1DeckId, setP1DeckId] = useState('');
  const [p2DeckId, setP2DeckId] = useState('');

  function startSolo() {
    const p1 = decks.find((d) => d.id === p1DeckId);
    const p2 = decks.find((d) => d.id === p2DeckId);
    if (!p1 || !p2) {
      setError('P1/P2 덱을 모두 선택하세요.');
      return;
    }
    if (!p1.oshi || !p2.oshi) {
      setError('오시 카드가 없는 덱은 사용할 수 없습니다.');
      return;
    }
    setError('');
    navigate('/game/solo', { state: { p1DeckId, p2DeckId } });
  }

  function createRoom() {
    const code = genRoomCode();
    // 새로고침 시에도 호스트 역할이 유지되도록 sessionStorage 에 기록.
    sessionStorage.setItem(`holo-room-host:${code}`, '1');
    navigate(`/room/${code}`, { state: { isHost: true, name } });
  }

  function joinRoom() {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setError('방코드를 입력하세요.');
      return;
    }
    setError('');
    navigate(`/room/${code}`, { state: { isHost: false, name } });
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-6 mobile-landscape:py-4"
      style={{ background: '#0f0f1a' }}
    >
      <div className="w-full max-w-sm mobile-landscape:max-w-3xl">
        <div className="mobile-landscape:flex mobile-landscape:items-center mobile-landscape:gap-8">
          {/* 로고 / 타이틀 */}
          <div className="flex flex-col items-center mb-8 mobile-landscape:mb-0 mobile-landscape:flex-1">
            <img src="/logo.png" alt="홀로 덱빌더" className="h-16 w-16 mobile-landscape:h-12 mobile-landscape:w-12 rounded-2xl shadow-lg mb-3 mobile-landscape:mb-2" />
            <h1 className="text-xl font-bold text-white">대기실</h1>
            <p className="text-xs text-gray-500 mt-1">방을 만들거나 방코드로 입장하세요</p>
          </div>

          <div className="flex flex-col gap-5 mobile-landscape:gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-5 mobile-landscape:p-4 shadow-xl mobile-landscape:flex-1">
          {/* 이름 설정 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400">플레이어 이름</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="player"
              maxLength={16}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 방 만들기 */}
          <button
            onClick={createRoom}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold text-white transition-colors"
          >
            방 만들기
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600">또는</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* 방 입장 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-400">방코드</label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder="예: ABCXYZ"
              maxLength={8}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white tracking-widest uppercase placeholder-gray-500 placeholder:tracking-normal focus:outline-none focus:border-indigo-500"
            />
            {error && <span className="text-xs text-rose-400">{error}</span>}
            <button
              onClick={joinRoom}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold text-white transition-colors"
            >
              방 입장
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600">혼자 연습</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={p1DeckId}
                onChange={(e) => setP1DeckId(e.target.value)}
                className="flex-1 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">P1 덱 선택</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.oshi ? '' : ' (오시 없음)'}</option>
                ))}
              </select>
              <select
                value={p2DeckId}
                onChange={(e) => setP2DeckId(e.target.value)}
                className="flex-1 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">P2 덱 선택</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.oshi ? '' : ' (오시 없음)'}</option>
                ))}
              </select>
            </div>
            <button
              onClick={startSolo}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white transition-colors"
            >
              혼자 대전 시작
            </button>
          </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-5 mobile-landscape:mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← 덱 빌더로 돌아가기
        </button>
      </div>
    </div>
  );
}
