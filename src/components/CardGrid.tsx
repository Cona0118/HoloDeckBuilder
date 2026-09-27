import { useDeferredValue, useMemo, useState } from 'react';
import { CARDS } from '../data/cards';
import { useDeckStore } from '../store/deckStore';
import { filterCards } from '../utils/cardUtils';
import CardItem from './CardItem';
import SearchFilter from './SearchFilter';

type CardSize = 'sm' | 'md' | 'lg';

// 열 수는 뷰포트가 아니라 카드 목록 영역 폭(@container) 기준 — 데스크톱은 우측 덱 패널만큼 좁아지고,
// Fold 커버(344px)·펼침(882px, 덱 패널 표시) 모두에서 카드가 지나치게 작아지지 않게 한다.
// 목록 폭 576px(@xl) 이상에서는 기존 데스크톱과 동일한 열 수.
const SIZE_COLS: Record<CardSize, string> = {
  sm: 'grid-cols-5 @md:grid-cols-8 @xl:grid-cols-10',
  md: 'grid-cols-4 @md:grid-cols-5 @xl:grid-cols-6',
  lg: 'grid-cols-3 @md:grid-cols-4',
};

const SIZE_LABELS: Record<CardSize, string> = { sm: 'S', md: 'M', lg: 'L' };

export default function CardGrid() {
  const filter = useDeckStore((s) => s.filter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cardSize, setCardSize] = useState<CardSize>('md');

  // 입력은 즉시 반영하고, 1000장 넘는 목록 재필터·재렌더는 뒤로 미룬다 (모바일 타이핑 끊김 방지)
  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(
    () =>
      filterCards(CARDS, deferredFilter).sort((a, b) => {
        const aIsHBD = /^hBD\d/.test(a.cardNumber);
        const bIsHBD = /^hBD\d/.test(b.cardNumber);
        if (aIsHBD !== bIsHBD) return aIsHBD ? 1 : -1;
        return a.cardNumber.localeCompare(b.cardNumber);
      }),
    [deferredFilter],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SearchFilter />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
        <span className="min-w-0 truncate text-xs text-gray-400">
          {filtered.length}장 / 전체 {CARDS.length}장
          <span className="ml-2 text-gray-600 pointer-coarse:hidden">좌클릭 추가 · 우클릭 제거</span>
          {/* 길게 눌러 상세는 그리드 카드에만 있다 (리스트 행에는 없음) */}
          {viewMode === 'grid' && (
            <span className="ml-2 text-gray-600 hidden pointer-coarse:inline">탭 추가 · 길게 눌러 상세</span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {/* Card size selector (grid mode only) */}
          {viewMode === 'grid' && (
            <div className="flex gap-0.5 border border-gray-700 rounded overflow-hidden">
              {(['sm', 'md', 'lg'] as CardSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setCardSize(s)}
                  className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                    cardSize === s ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white bg-gray-800'
                  }`}
                >
                  {SIZE_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="그리드 보기"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-indigo-700 text-white' : 'text-gray-400 hover:text-white'}`}
              title="리스트 보기"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Card list */}
      <div className="@container flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">검색 결과가 없습니다</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${SIZE_COLS[cardSize]} gap-1`}>
            {filtered.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map((card) => (
              <CardItem key={card.id} card={card} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
