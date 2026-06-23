import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { listDeckPosts, PAGE_SIZE, type ListPostsFilter } from '../api/deckPosts';
import type { DeckPost } from '../types/deckPost';
import PostListItem from '../components/PostListItem';
import Pagination from '../components/Pagination';
import DeletePostDialog from '../components/DeletePostDialog';
import OshiPickerModal from '../components/OshiPickerModal';
import Footer from '../components/Footer';
import { CARDS } from '../data/cards';
import { useDeckStore } from '../store/deckStore';
import { resolveSnapshot } from '../utils/deckSnapshot';

export default function BoardPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const oshiFilter = params.get('oshi') ?? '';
  const containsFilter = params.get('card') ?? '';
  const awardOnly = params.get('award') === '1';
  const sort: 'recent' | 'popular' =
    params.get('sort') === 'popular' ? 'popular' : 'recent';
  const navigate = useNavigate();
  const createDeckFromSnapshot = useDeckStore((s) => s.createDeckFromSnapshot);

  const [posts, setPosts] = useState<DeckPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<DeckPost | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const filter: ListPostsFilter = useMemo(() => {
    const f: ListPostsFilter = {};
    if (oshiFilter) f.oshiCardId = oshiFilter;
    else if (containsFilter) f.containsCardId = containsFilter;
    if (awardOnly) f.awardOnly = true;
    f.sort = sort;
    return f;
  }, [oshiFilter, containsFilter, awardOnly, sort]);

  const filterCard = useMemo(() => {
    const id = oshiFilter || containsFilter;
    if (!id) return null;
    return CARDS.find((c) => c.id === id) ?? null;
  }, [oshiFilter, containsFilter]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    listDeckPosts(page, filter)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '게시판을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, reloadKey, filter]);

  function handlePageChange(p: number) {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function handlePickOshi(oshiCardId: string) {
    setPickerOpen(false);
    const next: Record<string, string> = { oshi: oshiCardId };
    if (awardOnly) next.award = '1';
    setParams(next, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function clearFilter() {
    const next: Record<string, string> = {};
    if (awardOnly) next.award = '1';
    setParams(next, { replace: false });
  }

  function toggleAwardOnly() {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (awardOnly) next.delete('award');
    else next.set('award', '1');
    setParams(next, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function toggleSort() {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (sort === 'popular') next.delete('sort');
    else next.set('sort', 'popular');
    setParams(next, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function handleLoadIntoDeck(post: DeckPost) {
    const ok = window.confirm(`「${post.title}」을(를) 새 덱으로 추가합니다.`);
    if (!ok) return;

    const resolved = resolveSnapshot({
      oshiCardId: post.oshiCardId,
      oshiImageUrl: post.oshiImageUrl,
      mainDeck: post.mainDeck,
      cheers: post.cheers,
    });

    createDeckFromSnapshot(post.title, {
      oshi: resolved.oshi,
      oshiImageUrl: resolved.oshiImageUrl,
      mainDeck: resolved.mainDeck,
      cheers: resolved.cheers,
    });

    if (resolved.missingCardCount > 0) {
      alert(
        `덱이 추가되었습니다. (${resolved.missingCardCount}장 카드를 불러오지 못했습니다.)`,
      );
    } else {
      alert('덱이 추가되었습니다.');
    }
    navigate('/');
  }

  function handleDeleteRequest(post: DeckPost) {
    setDeleteTarget(post);
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f1a' }}>
      <div className="flex-1">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">덱 공유 게시판</h1>
            <button
              onClick={() => setPickerOpen(true)}
              aria-label="오시 카드로 검색"
              title="오시 카드로 검색"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
            <button
              onClick={toggleAwardOnly}
              aria-pressed={awardOnly}
              title={awardOnly ? '입상덱 필터 해제' : '입상덱만 보기'}
              className={
                'h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium border transition-colors ' +
                (awardOnly
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 hover:bg-amber-500/30'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700')
              }
            >
              <span aria-hidden>🏆</span>
              <span>입상덱만</span>
            </button>
            <button
              onClick={toggleSort}
              aria-pressed={sort === 'popular'}
              title={sort === 'popular' ? '최신순으로 정렬' : '추천순으로 정렬'}
              className={
                'h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium border transition-colors ' +
                (sort === 'popular'
                  ? 'bg-pink-500/20 text-pink-200 border-pink-500/60 hover:bg-pink-500/30'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700')
              }
            >
              <span aria-hidden>{sort === 'popular' ? '👍' : '🕒'}</span>
              <span>{sort === 'popular' ? '추천순' : '최신순'}</span>
            </button>
          </div>
          <Link
            to="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
          >
            ← 빌더
          </Link>
        </div>

        {filterCard && (
          <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-indigo-300">
                {oshiFilter ? '오시 필터' : '카드 필터'}
              </span>
              {filterCard.imageUrl && (
                <img
                  src={filterCard.imageUrl}
                  alt={filterCard.name}
                  className="w-6 h-8 object-cover rounded"
                  draggable={false}
                />
              )}
              <span className="text-sm text-white font-medium truncate">{filterCard.name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{filterCard.cardNumber}</span>
            </div>
            <button
              onClick={clearFilter}
              className="shrink-0 px-2 py-1 text-[11px] text-gray-300 hover:text-white hover:bg-indigo-800/50 rounded border border-indigo-800/50"
            >
              필터 해제 ✕
            </button>
          </div>
        )}

        {loading && <div className="text-gray-500 text-sm py-8 text-center">불러오는 중...</div>}

        {!loading && error && (
          <div className="text-red-400 text-sm py-4 px-3 bg-red-950/40 border border-red-900 rounded">
            {error}
            <button onClick={reload} className="ml-2 underline">다시 시도</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-gray-500 text-sm py-12 text-center">
            {filterCard || awardOnly ? '조건에 맞는 덱이 없습니다.' : '아직 공유된 덱이 없습니다.'}
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {posts.map((p) => (
                <PostListItem
                  key={p.id}
                  post={p}
                  onLoadIntoDeck={handleLoadIntoDeck}
                  onDeleteRequest={handleDeleteRequest}
                />
              ))}
            </div>
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
            />
          </>
        )}
      </div>
      </div>

      <Footer />

      {deleteTarget && (
        <DeletePostDialog
          post={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            reload();
            alert('삭제되었습니다.');
          }}
        />
      )}

      {pickerOpen && (
        <OshiPickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickOshi}
        />
      )}
    </div>
  );
}
