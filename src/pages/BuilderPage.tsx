import { useState } from 'react';
import CardGrid from '../components/CardGrid';
import DeckPanel, { DeckMobileFab } from '../components/DeckPanel';
import Footer from '../components/Footer';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useDeckStore } from '../store/deckStore';

export default function BuilderPage() {
  const [deckOpen, setDeckOpen] = useState(false);
  const deckName = useDeckStore((s) => s.getActiveDeck()?.name);
  const mainCount = useDeckStore((s) => s.getMainDeckCount());
  // 데스크톱/모바일 레이아웃 중 하나만 마운트 — CSS로 숨기면 카드 1000여 장이 두 벌 렌더된다.
  // Tailwind md(48rem)와 같은 단위여야 브라우저 글꼴 크기를 키운 경우에도 DeckPanel의 md: 분기와 어긋나지 않는다.
  const isDesktop = useMediaQuery('(min-width: 48rem)');
  // 시트를 연 채 펼쳤다가(Fold) 다시 접으면 시트가 되살아나지 않게 닫아 둔다
  if (isDesktop && deckOpen) setDeckOpen(false);

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#0f0f1a' }}>
      <div className="h-dvh relative overflow-hidden">
        {isDesktop ? (
          <div className="flex h-full overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardGrid />
            </div>
            <div className="w-105 shrink-0 border-l border-gray-800 overflow-hidden">
              <DeckPanel />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <CardGrid />
            </div>
            <button
              onClick={() => setDeckOpen(true)}
              className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-700 active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4-4m4 4l-4 4" />
                </svg>
                <span className="text-sm font-semibold text-white">{deckName ?? '덱'}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mainCount === 50 ? 'bg-green-900/60 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                  {mainCount} / 50
                </span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* 좌측 하단 + FAB: 평소엔 보이고, 덱 시트를 올리면 숨긴다 */}
            {!deckOpen && <DeckMobileFab />}
          </div>
        )}

        {!isDesktop && deckOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDeckOpen(false)} />
            <div className="relative flex flex-col h-[92dvh] bg-gray-950 rounded-t-2xl overflow-hidden border-t border-gray-700 shadow-2xl">
              <div
                className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-pointer border-b border-gray-800"
                onClick={() => setDeckOpen(false)}
              >
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>
              <div className="flex-1 overflow-hidden">
                <DeckPanel />
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
