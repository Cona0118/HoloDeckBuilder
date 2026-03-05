import { useState } from 'react';
import CardGrid from './components/CardGrid';
import DeckPanel from './components/DeckPanel';
import { useDeckStore } from './store/deckStore';

export default function App() {
  const [deckOpen, setDeckOpen] = useState(false);
  const { getActiveDeck, getMainDeckCount } = useDeckStore();
  const deck = getActiveDeck();
  const mainCount = getMainDeckCount();

  return (
    <div className="h-screen overflow-hidden" style={{ background: '#0f0f1a' }}>

      {/* ── Desktop (md+) ── */}
      <div className="hidden md:flex h-full overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CardGrid />
        </div>
        <div className="w-105 shrink-0 border-l border-gray-800 overflow-hidden">
          <DeckPanel />
        </div>
      </div>

      {/* ── Mobile (<md) ── */}
      <div className="flex md:hidden flex-col h-full overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <CardGrid />
        </div>

        {/* Bottom tab bar */}
        <button
          onClick={() => setDeckOpen(true)}
          className="shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-700 active:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4-4m4 4l-4 4" />
            </svg>
            <span className="text-sm font-semibold text-white">{deck?.name ?? '덱'}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mainCount === 50 ? 'bg-green-900/60 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {mainCount} / 50
            </span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* ── Mobile bottom sheet overlay ── */}
      {deckOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDeckOpen(false)}
          />

          {/* Sheet */}
          <div className="relative flex flex-col h-[92vh] bg-gray-950 rounded-t-2xl overflow-hidden border-t border-gray-700 shadow-2xl">
            {/* Handle bar — tap to close */}
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
  );
}
