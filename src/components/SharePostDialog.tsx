import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Deck } from '../types/card';
import { deckToSnapshot } from '../utils/deckSnapshot';
import { createDeckPost } from '../api/deckPosts';
import { isValidPassword, MIN_PASSWORD_LENGTH } from '../utils/password';

interface Props {
  deck: Deck;
  onClose: () => void;
  onSuccess: () => void;
}

const TITLE_MAX = 50;
const AUTHOR_MAX = 20;

export default function SharePostDialog({ deck, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(deck.name ?? '');
  const [author, setAuthor] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleTrimmed = title.trim();
  const authorFinal = (author.trim() || '익명').slice(0, AUTHOR_MAX);
  const canSubmit =
    !!titleTrimmed &&
    titleTrimmed.length <= TITLE_MAX &&
    isValidPassword(password) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const snapshot = deckToSnapshot(deck);
      await createDeckPost({
        title: titleTrimmed,
        author: authorFinal,
        password,
        snapshot,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '업로드에 실패했습니다.');
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-sm flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">덱 공유하기</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">게시글 제목</span>
            <input
              autoFocus
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 후부키 적색 컨트롤"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">작성자 (기본: 익명)</span>
            <input
              value={author}
              maxLength={AUTHOR_MAX}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="익명"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              비밀번호 (삭제 시 사용, {MIN_PASSWORD_LENGTH}자 이상)
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </label>

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-lg text-sm bg-indigo-700 hover:bg-indigo-600 text-white disabled:opacity-40"
          >
            {submitting ? '업로드 중...' : '공유하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
