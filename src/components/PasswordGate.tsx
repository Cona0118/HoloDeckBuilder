import { useState } from 'react';

const PASSWORD = import.meta.env.VITE_APP_PASSWORD as string;
const STORAGE_KEY = 'holo-auth';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (authed) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setInput('');
    }
  }

  return (
    <div className="h-dvh flex items-center justify-center" style={{ background: '#0f0f1a' }}>
      <div className="w-full max-w-sm mx-4 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-900/50">
            H
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Holo Deck Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">Hololive Official Card Game</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">비밀번호</label>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              placeholder="비밀번호를 입력하세요"
              autoFocus
              className={`w-full px-4 py-3 bg-gray-800 border rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                error ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-indigo-500'
              }`}
            />
            {error && (
              <p className="text-xs text-red-400">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            입장
          </button>
        </form>
      </div>
    </div>
  );
}
