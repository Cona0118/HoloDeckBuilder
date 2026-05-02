import { Link } from 'react-router-dom';

export default function BoardPage() {
  return (
    <div className="h-dvh overflow-y-auto" style={{ background: '#0f0f1a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-white">덱 공유 게시판</h1>
          <Link
            to="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700"
          >
            ← 빌더
          </Link>
        </div>
        <div className="text-gray-500 text-sm">아직 공유된 덱이 없습니다.</div>
      </div>
    </div>
  );
}
