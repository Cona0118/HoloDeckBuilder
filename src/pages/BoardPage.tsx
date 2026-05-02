import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listDeckPosts, PAGE_SIZE } from '../api/deckPosts';
import type { DeckPost } from '../types/deckPost';
import PostListItem from '../components/PostListItem';
import Pagination from '../components/Pagination';
import DeletePostDialog from '../components/DeletePostDialog';

export default function BoardPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);

  const [posts, setPosts] = useState<DeckPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<DeckPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listDeckPosts(page)
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
  }, [page, reloadKey]);

  function handlePageChange(p: number) {
    setParams({ page: String(p) }, { replace: false });
    window.scrollTo({ top: 0 });
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  // Task 16에서 본 구현으로 교체
  function handleLoadIntoDeck(post: DeckPost) {
    alert(`불러오기 미구현: ${post.title}`);
  }
  function handleDeleteRequest(post: DeckPost) {
    setDeleteTarget(post);
  }

  return (
    <div className="h-dvh overflow-y-auto" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-white">덱 공유 게시판</h1>
          <Link
            to="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
          >
            ← 빌더
          </Link>
        </div>

        {loading && <div className="text-gray-500 text-sm py-8 text-center">불러오는 중...</div>}

        {!loading && error && (
          <div className="text-red-400 text-sm py-4 px-3 bg-red-950/40 border border-red-900 rounded">
            {error}
            <button onClick={reload} className="ml-2 underline">다시 시도</button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-gray-500 text-sm py-12 text-center">아직 공유된 덱이 없습니다.</div>
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
    </div>
  );
}
