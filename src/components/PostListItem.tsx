import { useEffect, useState } from 'react';
import type { DeckPost } from '../types/deckPost';
import { CARDS } from '../data/cards';
import { getAccentColor } from '../utils/cardUtils';
import PostDeckView from './PostDeckView';
import {
  hasRecommended,
  addRecommended,
  removeRecommended,
} from '../utils/recommendStorage';
import { recommendDeckPost, unrecommendDeckPost } from '../api/deckPosts';

interface Props {
  post: DeckPost;
  onLoadIntoDeck: (post: DeckPost) => void;
  onDeleteRequest: (post: DeckPost) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function PostListItem({ post, onLoadIntoDeck, onDeleteRequest }: Props) {
  const [open, setOpen] = useState(false);
  const oshi = CARDS.find((c) => c.id === post.oshiCardId);
  const oshiAccent = oshi ? getAccentColor(oshi) : '#6b7280';
  const oshiThumbUrl = post.oshiImageUrl ?? oshi?.imageUrl;

  const [recommendCount, setRecommendCount] = useState(post.recommendCount);
  const [recommended, setRecommended] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setRecommended(hasRecommended(post.id));
  }, [post.id]);

  useEffect(() => {
    setRecommendCount(post.recommendCount);
  }, [post.recommendCount]);

  async function handleToggleRecommend(e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    setPending(true);

    const willRecommend = !recommended;
    setRecommended(willRecommend);
    setRecommendCount((c) => Math.max(0, c + (willRecommend ? 1 : -1)));

    try {
      const newCount = willRecommend
        ? await recommendDeckPost(post.id)
        : await unrecommendDeckPost(post.id);
      setRecommendCount(newCount);
      if (willRecommend) addRecommended(post.id);
      else removeRecommended(post.id);
    } catch (err) {
      setRecommended(!willRecommend);
      setRecommendCount((c) => Math.max(0, c + (willRecommend ? -1 : 1)));
      alert(
        err instanceof Error
          ? `추천 처리에 실패했습니다: ${err.message}`
          : '추천 처리에 실패했습니다.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-800/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* 오시 썸네일 */}
        <div
          className="w-10 h-14 sm:w-12 sm:h-16 shrink-0 rounded overflow-hidden border bg-gray-800"
          style={{ borderColor: oshiAccent + '88' }}
        >
          {oshi && oshiThumbUrl ? (
            <img src={oshiThumbUrl} alt={oshi.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 text-center px-0.5">
              {oshi ? oshi.name : '카드 없음'}
            </div>
          )}
        </div>

        {/* 제목 + 입상덱 마크 */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="min-w-0 text-base sm:text-lg font-semibold text-white truncate">
            {post.title}
          </p>
          {post.isAward && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-900/60 text-amber-300 border border-amber-700/50">
              <span>🏆</span>
              {post.tournamentName && (
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {post.tournamentName}
                </span>
              )}
            </span>
          )}
        </div>

        {recommendCount > 0 && (
          <div
            className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-pink-900/40 text-pink-200 border border-pink-800/40"
            aria-label={`추천 ${recommendCount}`}
            title={`추천 ${recommendCount}`}
          >
            <span aria-hidden>👍</span>
            <span>{recommendCount}</span>
          </div>
        )}

        {/* 작성자 / 날짜 (오른쪽) */}
        <div className="flex flex-col items-end shrink-0 text-[10px] sm:text-[11px] text-gray-400 leading-tight">
          <span className="truncate max-w-[100px] sm:max-w-none">by {post.author}</span>
          <span className="text-gray-500">{formatDate(post.createdAt)}</span>
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(post);
            }}
            className="px-2 py-1 text-[11px] text-gray-500 hover:text-red-300 hover:bg-red-900/40 rounded border border-gray-700"
          >
            삭제
          </button>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <>
          {post.isAward && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/40 border-t border-amber-900/40">
              <span className="text-amber-300 text-sm shrink-0" aria-hidden>🏆</span>
              <span className="text-[11px] uppercase tracking-wider text-amber-400/80 shrink-0">
                입상덱
              </span>
              {post.tournamentName && (
                <span className="text-xs sm:text-sm text-amber-100 font-medium truncate">
                  {post.tournamentName}
                </span>
              )}
            </div>
          )}
          <PostDeckView
            oshiCardId={post.oshiCardId}
            oshiImageUrl={post.oshiImageUrl}
            mainDeck={post.mainDeck}
            cheers={post.cheers}
          />
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-800 bg-gray-950">
            <button
              onClick={handleToggleRecommend}
              disabled={pending}
              aria-pressed={recommended}
              className={
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ' +
                (recommended
                  ? 'bg-pink-700 hover:bg-pink-600 text-white border-pink-600'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700') +
                (pending ? ' opacity-60 cursor-wait' : '')
              }
            >
              <span aria-hidden>👍</span>{' '}
              {recommended ? `추천됨 · 취소 (${recommendCount})` : `추천 (${recommendCount})`}
            </button>
            <button
              onClick={() => onLoadIntoDeck(post)}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border border-indigo-600"
            >
              내 덱으로 불러오기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
