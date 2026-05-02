import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DeckPost } from '../types/deckPost';
import { deleteDeckPost } from '../api/deckPosts';

interface Props {
  post: DeckPost;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeletePostDialog({ post, onClose, onDeleted }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await deleteDeckPost(post.id, password);
      if (ok) {
        onDeleted();
      } else {
        setError('비밀번호가 일치하지 않습니다.');
        setSubmitting(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.');
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
          <h3 className="text-sm font-bold text-white">게시글 삭제</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs text-gray-400">
            「{post.title}」을(를) 삭제하려면 작성 시 입력한 비밀번호를 입력하세요.
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && password) handleDelete();
            }}
            placeholder="비밀번호"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
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
            onClick={handleDelete}
            disabled={!password || submitting}
            className="flex-1 py-2 rounded-lg text-sm bg-red-700 hover:bg-red-600 text-white disabled:opacity-40"
          >
            {submitting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
