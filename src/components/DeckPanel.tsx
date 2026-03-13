import { useState, useEffect, useRef } from 'react';
import { useDeckStore } from '../store/deckStore';
import { COLOR_ACCENT, getAccentColor } from '../utils/cardUtils';
import type { CardColor, Deck, DeckEntry, HolomemSubtype } from '../types/card';
import { CARDS } from '../data/cards';

const CHEER_MAX = 20;

/** 저장된 카드 객체가 구버전일 수 있으므로 CARDS에서 최신 limit를 조회 */
function getLiveLimit(cardId: string, fallbackLimit?: number): number {
  return CARDS.find(c => c.id === cardId)?.limit ?? fallbackLimit ?? 4;
}
const CHEER_COLORS: CardColor[] = ['white', 'green', 'red', 'blue', 'purple', 'yellow'];
const CHEER_IMAGE: Record<CardColor, string> = {
  white:  '/images/hY/hY01.png',
  green:  '/images/hY/hY02.png',
  red:    '/images/hY/hY03.png',
  blue:   '/images/hY/hY04.png',
  purple: '/images/hY/hY05.png',
  yellow: '/images/hY/hY06.png',
};

// ──────────────────────────────
// Drag types
// ──────────────────────────────
type DragPhase =
  | { phase: 'idle' }
  | { phase: 'potential'; cardId: string; imageUrl?: string; x: number; y: number; w: number; h: number }
  | { phase: 'dragging'; cardId: string; imageUrl?: string; x: number; y: number; w: number; h: number };

// ──────────────────────────────
// Image card thumbnail
// ──────────────────────────────
function DeckEntryCard({ entry, onAdd, onRemove, overlayVisible, onShowOverlay, onHideOverlay, isDragging, dropIndicator, onDragStart, onTap, editMode, isSelected }: {
  entry: DeckEntry; onAdd: () => void; onRemove: () => void;
  overlayVisible: boolean; onShowOverlay: () => void; onHideOverlay: () => void;
  isDragging: boolean;
  dropIndicator: 'before' | 'after' | null;
  onDragStart: (imageUrl: string | undefined, x: number, y: number, w: number, h: number) => void;
  onTap: () => void;
  editMode: boolean;
  isSelected: boolean;
}) {
  const accent = getAccentColor(entry.card);
  const cardLimit = getLiveLimit(entry.card.id, entry.card.limit);
  const atLimit = entry.count >= cardLimit;
  const isTouch = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const wasDrag = useRef(false);

  function handlePointerDown(e: React.PointerEvent) {
    isTouch.current = e.pointerType === 'touch';
    startPos.current = { x: e.clientX, y: e.clientY };
    wasDrag.current = false;
    if (!editMode) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    onDragStart(entry.card.imageUrl, e.clientX, e.clientY, rect.width, rect.height);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 8) wasDrag.current = true;
  }

  const boxShadow = isSelected
    ? '0 0 0 2px #22c55e'
    : dropIndicator === 'before'
    ? '-3px 0 0 0 #6366f1'
    : dropIndicator === 'after'
    ? '3px 0 0 0 #6366f1'
    : undefined;

  return (
    <div className="relative group" data-deck-card-id={entry.card.id}>
      <div
        className={`relative w-full aspect-2.5/3.5 rounded overflow-hidden bg-gray-900 border ${editMode ? 'cursor-pointer' : 'cursor-pointer'}`}
        style={{
          borderColor: isSelected ? '#22c55e' : editMode ? '#6366f1aa' : accent + '66',
          WebkitTouchCallout: 'none',
          opacity: isDragging ? 0.3 : 1,
          boxShadow,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={(e) => {
          if (editMode) {
            if (wasDrag.current) return;
            onTap();
            return;
          }
          const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
          if (touch) {
            e.stopPropagation();
            onShowOverlay();
          } else {
            if (!atLimit) onAdd();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (editMode) return;
          if (isTouch.current) return;
          onRemove();
        }}
      >
        {entry.card.imageUrl ? (
          <img
            src={entry.card.imageUrl}
            alt={entry.card.name}
            className="w-full h-full object-cover"
            draggable={false}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-1"
            style={{ background: accent + '22' }}
          >
            <span className="text-[9px] text-center text-gray-400 leading-tight">{entry.card.name}</span>
          </div>
        )}

        {/* Count badge */}
        <span className="absolute top-0.5 left-0.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold flex items-center justify-center shadow">
          ×{entry.count}
        </span>

        {/* Selected indicator in edit mode */}
        {isSelected && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Hover overlay (desktop) / tap overlay (mobile) — hidden in edit mode */}
        {!editMode && (
          <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-1.5 ${
            overlayVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); onHideOverlay(); }}
              className="w-6 h-6 rounded bg-red-700 hover:bg-red-600 text-white text-base font-bold flex items-center justify-center"
            >−</button>
            <button
              onClick={(e) => { e.stopPropagation(); if (!atLimit) onAdd(); onHideOverlay(); }}
              disabled={atLimit}
              className="w-6 h-6 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-base font-bold flex items-center justify-center"
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────
// Deck selector
// ──────────────────────────────
function DeckSelector() {
  const { decks, activeDeckId, setActiveDeck, createDeck, deleteDeck, renameDeck, getActiveDeck, clearDeck } = useDeckStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const activeDeck = getActiveDeck();

  function startRename() {
    setNewName(activeDeck?.name ?? '');
    setRenaming(true);
  }
  function confirmRename() {
    if (activeDeck && newName.trim()) renameDeck(activeDeck.id, newName.trim());
    setRenaming(false);
  }

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-gray-800">
      <div className="flex gap-2">
        <select
          value={activeDeckId ?? decks[0]?.id ?? ''}
          onChange={(e) => setActiveDeck(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white px-2 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          {decks.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button
          onClick={() => createDeck()}
          className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs rounded-lg transition-colors"
        >+ 새 덱</button>
      </div>

      <div className="flex gap-1">
        {renaming ? (
          <>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenaming(false); }}
              className="flex-1 bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
            />
            <button onClick={confirmRename} className="px-2 py-1 bg-green-700 text-white text-xs rounded">저장</button>
            <button onClick={() => setRenaming(false)} className="px-2 py-1 bg-gray-700 text-white text-xs rounded">취소</button>
          </>
        ) : (
          <>
            <button onClick={startRename} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 transition-colors">
              이름 변경
            </button>
            {activeDeck && (
              <button
                onClick={() => {
                  if (confirm(`"${activeDeck.name}" 덱을 초기화하시겠습니까?\n오시와 모든 카드가 제거됩니다.`)) {
                    clearDeck();
                  }
                }}
                className="px-2 py-1 bg-gray-800 hover:bg-amber-900 text-gray-400 hover:text-amber-300 text-xs rounded border border-gray-700 transition-colors"
              >초기화</button>
            )}
            {decks.length > 1 && activeDeck && (
              <button
                onClick={() => {
                  if (confirm(`"${activeDeck.name}" 덱을 삭제하시겠습니까?`)) {
                    deleteDeck(activeDeck.id);
                  }
                }}
                className="px-2 py-1 bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-300 text-xs rounded border border-gray-700 transition-colors"
              >삭제</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────
// Cheer deck
// ──────────────────────────────
function CheerCard({ color, count, onAdd, onRemove, overlayVisible, onShowOverlay, onHideOverlay }: {
  color: CardColor; count: number;
  onAdd: () => void; onRemove: () => void;
  overlayVisible: boolean; onShowOverlay: () => void; onHideOverlay: () => void;
}) {
  return (
    <div className="relative group">
      <div
        className="relative w-full aspect-2.5/3.5 rounded overflow-hidden border cursor-pointer"
        style={{ borderColor: COLOR_ACCENT[color] + '66' }}
        onClick={(e) => {
          const isTouch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
          if (isTouch) {
            e.stopPropagation();
            onShowOverlay();
          } else {
            onAdd();
          }
        }}
        onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
      >
        <img src={CHEER_IMAGE[color]} alt={color} className="w-full h-full object-cover" draggable={false} />
        {count > 0 && (
          <span className="absolute top-0.5 left-0.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
            ×{count}
          </span>
        )}

        {/* Hover overlay (desktop) / tap overlay (mobile) */}
        <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-1.5 ${
          overlayVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); onHideOverlay(); }}
            className="w-6 h-6 rounded bg-red-700 hover:bg-red-600 text-white text-base font-bold flex items-center justify-center"
          >−</button>
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); onHideOverlay(); }}
            className="w-6 h-6 rounded bg-green-700 hover:bg-green-600 text-white text-base font-bold flex items-center justify-center"
          >+</button>
        </div>
      </div>
    </div>
  );
}

function CheerSection() {
  const { getActiveDeck, addCheer, removeCheer, clearCheers } = useDeckStore();
  const [open, setOpen] = useState(true);
  const [activeColor, setActiveColor] = useState<CardColor | null>(null);
  const deck = getActiveDeck();

  useEffect(() => {
    if (!activeColor) return;
    const close = () => setActiveColor(null);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [activeColor]);

  if (!deck) return null;

  const cheers = deck.cheers ?? {};
  const total = Object.values(cheers).reduce((s, v) => s + (v ?? 0), 0);

  return (
    <div className="border-t border-gray-800">
      <div className="w-full flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1"
        >
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">엘 덱</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${total === CHEER_MAX ? 'text-green-400' : total > CHEER_MAX ? 'text-red-400' : 'text-gray-400'}`}>
              {total} / {CHEER_MAX}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {total > 0 && (
          <button
            onClick={() => clearCheers()}
            className="ml-2 px-2 py-0.5 text-[10px] text-gray-500 hover:text-amber-300 hover:bg-amber-900/40 rounded border border-gray-700 transition-colors"
          >
            초기화
          </button>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-6 gap-1 px-3 pb-3">
          {CHEER_COLORS.map((color) => (
            <CheerCard
              key={color}
              color={color}
              count={cheers[color] ?? 0}
              onAdd={() => addCheer(color)}
              onRemove={() => removeCheer(color)}
              overlayVisible={activeColor === color}
              onShowOverlay={() => setActiveColor(color)}
              onHideOverlay={() => setActiveColor(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────
// Image export
// ──────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function exportDeckAsImage(deck: Deck, mode: 'expanded' | 'compact' = 'expanded') {
  // Use user's custom order (no sort)
  const holomem = deck.mainDeck.filter(e => e.card.type === 'holomem');
  const support = deck.mainDeck.filter(e => e.card.type === 'support');
  const cheers = deck.cheers ?? {};

  // Preload all images
  const urlSet = new Set<string>();
  if (deck.oshi?.imageUrl) urlSet.add(deck.oshi.imageUrl);
  deck.mainDeck.forEach((e) => { if (e.card.imageUrl) urlSet.add(e.card.imageUrl); });
  CHEER_COLORS.forEach((c) => urlSet.add(CHEER_IMAGE[c]));
  const cache = new Map<string, HTMLImageElement>();
  await Promise.all([...urlSet].map(async (url) => {
    try { cache.set(url, await loadImage(url)); } catch { /* skip */ }
  }));

  // Canvas size (compact height is computed dynamically below)
  const W = mode === 'compact' ? 1200 : 1600;
  const H = mode === 'compact' ? 0 : 900;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  function drawSlot(imageUrl: string | undefined, label: string, x: number, y: number, w: number, h: number, accent = '#6b7280') {
    ctx.save();
    rrect(ctx, x, y, w, h, 3);
    ctx.clip();
    const img = imageUrl ? cache.get(imageUrl) : undefined;
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.fillStyle = accent + '33';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${Math.max(6, Math.floor(w * 0.12))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.slice(0, 8), x + w / 2, y + h / 2);
    }
    ctx.restore();
    ctx.strokeStyle = accent + '88';
    ctx.lineWidth = 1;
    rrect(ctx, x, y, w, h, 3);
    ctx.stroke();
  }

  function drawBadge(x: number, y: number, count: number) {
    const text = `×${count}`;
    const fontSize = 20;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const padX = 9, padY = 5;
    const tw = ctx.measureText(text).width;
    const bw = Math.ceil(tw + padX * 2);
    const bh = fontSize + padY * 2;
    const br = bh / 2;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Background
    ctx.fillStyle = 'rgba(17,10,60,0.95)';
    rrect(ctx, x, y, bw, bh, br);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1.5;
    rrect(ctx, x, y, bw, bh, br);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#e0e7ff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + bw / 2, y + bh / 2 + 0.5);
  }

  if (mode === 'expanded') {
    // ── 16:9 expanded layout ──────────────────────────────────────────
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H);
    const PAD = 12;
    const GAP = 8;
    const CARD_COLS = 10;
    const CARD_GAP = 4;
    const CARD_H = Math.floor((H - 2 * PAD - CARD_GAP * 4) / 5);
    const CARD_W = Math.floor(CARD_H / 1.4);
    const DECK_TOTAL_W = CARD_COLS * CARD_W + CARD_GAP * 9;
    const DECK_X = W - PAD - DECK_TOTAL_W;

    const LEFT_W = DECK_X - PAD - GAP;
    const OSHI_W = LEFT_W;
    const OSHI_H = Math.round(OSHI_W * 1.4);

    const CHEER_COLS = 5;
    const CHEER_GAP = 4;
    const CHEER_W = Math.floor((LEFT_W - CHEER_GAP * (CHEER_COLS - 1)) / CHEER_COLS);
    const CHEER_H = Math.round(CHEER_W * 1.4);

    const cheerList: CardColor[] = [];
    CHEER_COLORS.forEach((c) => { for (let i = 0; i < (cheers[c] ?? 0); i++) cheerList.push(c); });
    const cheerRows = cheerList.length > 0 ? Math.ceil(cheerList.length / CHEER_COLS) : 0;
    const cheerTotalH = cheerRows > 0 ? cheerRows * CHEER_H + (cheerRows - 1) * CHEER_GAP : 0;
    const leftTotalH = OSHI_H + (cheerTotalH > 0 ? GAP + cheerTotalH : 0);
    const LEFT_START_Y = Math.floor((H - leftTotalH) / 2);
    const CHEER_START_Y = LEFT_START_Y + OSHI_H + GAP;

    drawSlot(deck.oshi?.imageUrl, deck.oshi?.name ?? '?', PAD, LEFT_START_Y, OSHI_W, OSHI_H, deck.oshi ? getAccentColor(deck.oshi) : '#6b7280');
    cheerList.forEach((c, i) => {
      const col = i % CHEER_COLS;
      const row = Math.floor(i / CHEER_COLS);
      drawSlot(CHEER_IMAGE[c], c, PAD + col * (CHEER_W + CHEER_GAP), CHEER_START_Y + row * (CHEER_H + CHEER_GAP), CHEER_W, CHEER_H, COLOR_ACCENT[c]);
    });

    const expanded: { imageUrl?: string; name: string; accent: string }[] = [];
    [...holomem, ...support].forEach(({ card, count }) => {
      for (let i = 0; i < count; i++) expanded.push({ imageUrl: card.imageUrl, name: card.name, accent: getAccentColor(card) });
    });
    expanded.slice(0, 50).forEach((c, i) => {
      const col = i % CARD_COLS;
      const row = Math.floor(i / CARD_COLS);
      drawSlot(c.imageUrl, c.name, DECK_X + col * (CARD_W + CARD_GAP), PAD + row * (CARD_H + CARD_GAP), CARD_W, CARD_H, c.accent);
    });

  } else {
    // ── compact layout (dynamic height) ───────────────────────────────
    const PAD = 24;
    const CARD_GAP = 8;
    const SECTION_GAP = 20;
    const CARD_COLS = 5;
    const AVAIL_W = W - 2 * PAD;
    const CARD_W = Math.floor((AVAIL_W - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS);
    const CARD_H = Math.round(CARD_W * 1.4);

    // Oshi: 2×2 card slots
    const OSHI_W = 2 * CARD_W + CARD_GAP;
    const OSHI_H = 2 * CARD_H + CARD_GAP;

    // Unique deck cards in user order
    const unique: { imageUrl?: string; name: string; accent: string; count: number }[] = [];
    [...holomem, ...support].forEach(({ card, count }) => {
      unique.push({ imageUrl: card.imageUrl, name: card.name, accent: getAccentColor(card), count });
    });

    // Compute deck rows and dynamic canvas height
    const DECK_Y = PAD + OSHI_H + SECTION_GAP;
    const ROWS = unique.length > 0 ? Math.max(1, Math.ceil(unique.length / CARD_COLS)) : 0;
    const DECK_H = ROWS > 0 ? ROWS * CARD_H + (ROWS - 1) * CARD_GAP : 0;
    const H_compact = DECK_Y + DECK_H + PAD;

    // Set canvas dimensions and fill background
    canvas.height = H_compact;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, H_compact);

    // Oshi
    drawSlot(deck.oshi?.imageUrl, deck.oshi?.name ?? '?', PAD, PAD, OSHI_W, OSHI_H, deck.oshi ? getAccentColor(deck.oshi) : '#6b7280');

    // Cheers: 3 cols × 2 rows — all 6 colors shown, 0-count grayed out
    const CHEER_COLS = 3;
    const CHEER_X = PAD + OSHI_W + CARD_GAP;
    CHEER_COLORS.forEach((c, i) => {
      const cnt = cheers[c] ?? 0;
      const col = i % CHEER_COLS;
      const row = Math.floor(i / CHEER_COLS);
      const cx = CHEER_X + col * (CARD_W + CARD_GAP);
      const cy = PAD + row * (CARD_H + CARD_GAP);
      if (cnt === 0) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        drawSlot(CHEER_IMAGE[c], c, cx, cy, CARD_W, CARD_H, COLOR_ACCENT[c]);
        ctx.restore();
      } else {
        drawSlot(CHEER_IMAGE[c], c, cx, cy, CARD_W, CARD_H, COLOR_ACCENT[c]);
        drawBadge(cx + 6, cy + 6, cnt);
      }
    });

    // Main deck: consistent CARD_W/CARD_H for all cards
    unique.forEach((c, i) => {
      const col = i % CARD_COLS;
      const row = Math.floor(i / CARD_COLS);
      const x = PAD + col * (CARD_W + CARD_GAP);
      const y = DECK_Y + row * (CARD_H + CARD_GAP);
      drawSlot(c.imageUrl, c.name, x, y, CARD_W, CARD_H, c.accent);
      drawBadge(x + 6, y + 6, c.count);
    });
  }

  const link = document.createElement('a');
  link.download = `${deck.name.replace(/\s+/g, '_')}-deck.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ──────────────────────────────
// Export
// ──────────────────────────────
function ExportPanel() {
  const { exportDeckText, getActiveDeck } = useDeckStore();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(exportDeckText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImageExport(mode: 'expanded' | 'compact') {
    const deck = getActiveDeck();
    if (!deck) return;
    setExporting(true);
    try { await exportDeckAsImage(deck, mode); } finally { setExporting(false); }
  }

  return (
    <div className="p-3 border-t border-gray-800 flex flex-col gap-2">
      <button
        onClick={handleCopy}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
          copied
            ? 'bg-green-700 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
        }`}
      >
        {copied ? '✓ 복사됨!' : '덱 목록 복사 (공유)'}
      </button>
      <div className="flex gap-2">
        <button
          onClick={() => handleImageExport('expanded')}
          disabled={exporting}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-50"
        >
          {exporting ? '...' : '이미지 (전체)'}
        </button>
        <button
          onClick={() => handleImageExport('compact')}
          disabled={exporting}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 disabled:opacity-50"
        >
          {exporting ? '...' : '이미지 (요약)'}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Main
// ──────────────────────────────
export default function DeckPanel() {
  const { getActiveDeck, addCard, removeCard, getDeckErrors, reorderMainDeck, swapMainDeckEntries } = useDeckStore();
  const deck = getActiveDeck();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Drag state
  const dragRef = useRef<DragPhase>({ phase: 'idle' });
  const [dragRender, setDragRender] = useState<DragPhase>({ phase: 'idle' });
  const [dropTarget, setDropTarget] = useState<{ cardId: string; before: boolean } | null>(null);

  // Stable refs for listeners
  const dropTargetRef = useRef(dropTarget);
  useEffect(() => { dropTargetRef.current = dropTarget; }, [dropTarget]);
  const deckRef = useRef(deck);
  useEffect(() => { deckRef.current = deck; }, [deck]);

  const isDragActive = dragRender.phase !== 'idle';

  // Document-level drag listeners
  useEffect(() => {
    if (!isDragActive) return;

    function onMove(e: PointerEvent) {
      e.preventDefault();
      const d = dragRef.current;
      if (d.phase === 'idle') return;
      const newX = e.clientX;
      const newY = e.clientY;

      if (d.phase === 'potential') {
        const dx = newX - d.x;
        const dy = newY - d.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          const next: DragPhase = { phase: 'dragging', cardId: d.cardId, imageUrl: d.imageUrl, x: newX, y: newY, w: d.w, h: d.h };
          dragRef.current = next;
          setDragRender({ ...next });
          setActiveCardId(null);
        } else {
          dragRef.current = { ...d, x: newX, y: newY };
        }
        return;
      }

      // phase === 'dragging'
      dragRef.current = { ...d, x: newX, y: newY };
      setDragRender({ ...dragRef.current });

      // Find drop target (ghost has pointer-events:none so elementFromPoint works through it)
      const el = document.elementFromPoint(newX, newY);
      const cardEl = el?.closest('[data-deck-card-id]') as HTMLElement | null;
      const targetId = cardEl?.dataset.deckCardId;

      if (targetId && targetId !== d.cardId) {
        // Only allow drop within same card type section
        const currentDeck = deckRef.current;
        const draggedEntry = currentDeck?.mainDeck.find(e => e.card.id === d.cardId);
        const targetEntry = currentDeck?.mainDeck.find(e => e.card.id === targetId);
        if (draggedEntry && targetEntry && draggedEntry.card.type === targetEntry.card.type) {
          const rect = cardEl!.getBoundingClientRect();
          const before = newX < rect.left + rect.width / 2;
          setDropTarget(prev =>
            prev?.cardId === targetId && prev?.before === before ? prev : { cardId: targetId, before }
          );
        } else {
          setDropTarget(prev => prev ? null : prev);
        }
      } else {
        setDropTarget(prev => prev ? null : prev);
      }
    }

    function onUp() {
      const d = dragRef.current;
      const dt = dropTargetRef.current;

      if (d.phase === 'dragging') {
        if (dt) reorderMainDeck(d.cardId, dt.cardId, dt.before);
      }

      dragRef.current = { phase: 'idle' };
      setDragRender({ phase: 'idle' });
      setDropTarget(null);
    }

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [isDragActive, reorderMainDeck]);

  // 외부 클릭 시 오버레이 닫기
  useEffect(() => {
    if (!activeCardId) return;
    const close = () => setActiveCardId(null);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [activeCardId]);

  if (!deck) return null;

  const mainCount = deck.mainDeck.reduce((s, e) => s + e.count, 0);
  const errors = getDeckErrors();
  const holomemCount = deck.mainDeck.filter(e => e.card.type === 'holomem').reduce((s, e) => s + e.count, 0);
  const supportCount = deck.mainDeck.filter(e => e.card.type === 'support').reduce((s, e) => s + e.count, 0);
  const holomemSubtypeCounts: Partial<Record<HolomemSubtype, number>> = {};
  deck.mainDeck.filter(e => e.card.type === 'holomem').forEach(({ card, count }) => {
    if (card.holomemSubtype) holomemSubtypeCounts[card.holomemSubtype] = (holomemSubtypeCounts[card.holomemSubtype] ?? 0) + count;
  });
  const limitedCount = deck.mainDeck.filter(e => e.card.type === 'support' && e.card.limited).reduce((s, e) => s + e.count, 0);

  // Use mainDeck array order (user's custom order, no sort)
  const holomemEntries = deck.mainDeck.filter((e) => e.card.type === 'holomem');
  const supportEntries = deck.mainDeck.filter((e) => e.card.type === 'support');

  const sections = [
    { label: '홀로멤', entries: holomemEntries },
    { label: '서포트', entries: supportEntries },
  ];

  const oshiAccent = deck.oshi ? getAccentColor(deck.oshi) : '#6b7280';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">
      <DeckSelector />

      {/* Oshi slot + Stats */}
      <div className="px-3 py-2 border-b border-gray-800">
        <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wider font-medium">오시</p>
        <div className="flex gap-3 items-start">
          {/* Oshi image */}
          <div
            className="w-16 md:w-24 shrink-0 aspect-2.5/3.5 rounded-lg overflow-hidden border-2"
            style={{ borderColor: oshiAccent + 'aa' }}
          >
            {deck.oshi ? (
              deck.oshi.imageUrl ? (
                <img src={deck.oshi.imageUrl} alt={deck.oshi.name} className="w-full h-full object-cover" draggable={false} style={{ pointerEvents: 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ background: oshiAccent + '33', color: oshiAccent }}>
                  {deck.oshi.name[0]}
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <span className="text-xs text-gray-500 text-center leading-tight px-1">오시 선택</span>
              </div>
            )}
          </div>

          {/* Right: oshi info + stats */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {deck.oshi && (
              <div>
                <p className="text-sm font-semibold text-amber-200 truncate">{deck.oshi.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{deck.oshi.cardNumber}</p>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs text-amber-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">메인 덱</span>
                <span className={mainCount === 50 ? 'text-green-400 font-bold' : 'text-white font-medium'}>{mainCount} / 50</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${mainCount === 50 ? 'bg-green-500' : mainCount > 50 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((mainCount / 50) * 100, 100)}%` }}
                />
              </div>
            </div>

            {mainCount > 0 && (
              <div className="flex flex-col gap-1 text-[11px]">
                {holomemCount > 0 && (
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-emerald-400 font-medium">홀로멤 {holomemCount}</span>
                    {(() => {
                      const parts = (['debut', '1st', '2nd', 'spot'] as HolomemSubtype[])
                        .filter((sub) => holomemSubtypeCounts[sub])
                        .map((sub) => `${sub} : ${holomemSubtypeCounts[sub]}`);
                      return parts.length > 0
                        ? <span className="text-emerald-600">( {parts.join(' / ')} )</span>
                        : null;
                    })()}
                  </div>
                )}
                {supportCount > 0 && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sky-400 font-medium">서포트 {supportCount}</span>
                    {limitedCount > 0 && <span className="text-rose-400">( 리미티드 : {limitedCount} )</span>}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Card image grid */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Edit mode toggle */}
        {deck.mainDeck.length > 0 && (
          <div className="flex justify-end px-3 pb-1.5">
            <button
              onClick={() => { setEditMode((v) => !v); setSelectedCardId(null); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                editMode
                  ? 'bg-indigo-700 border-indigo-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {editMode ? '편집 완료' : '순서 편집'}
            </button>
          </div>
        )}

        {deck.mainDeck.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-gray-600">
            카드를 추가하세요
          </div>
        ) : (
          sections.map((section) =>
            section.entries.length === 0 ? null : (
              <div key={section.label} className="mb-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider px-3 py-1.5">
                  {section.label} <span className="text-gray-500 font-normal">({section.entries.reduce((s, e) => s + e.count, 0)})</span>
                </p>
                <div className="grid grid-cols-5 gap-1 px-2">
                  {section.entries.map((entry) => (
                    <DeckEntryCard
                      key={entry.card.id}
                      entry={entry}
                      onAdd={() => addCard(entry.card)}
                      onRemove={() => removeCard(entry.card)}
                      overlayVisible={activeCardId === entry.card.id}
                      onShowOverlay={() => setActiveCardId(entry.card.id)}
                      onHideOverlay={() => setActiveCardId(null)}
                      isDragging={dragRender.phase !== 'idle' && dragRender.cardId === entry.card.id}
                      dropIndicator={dropTarget?.cardId === entry.card.id ? (dropTarget.before ? 'before' : 'after') : null}
                      editMode={editMode}
                      isSelected={selectedCardId === entry.card.id}
                      onTap={() => {
                        if (selectedCardId === null) {
                          setSelectedCardId(entry.card.id);
                        } else if (selectedCardId === entry.card.id) {
                          setSelectedCardId(null);
                        } else {
                          swapMainDeckEntries(selectedCardId, entry.card.id);
                          setSelectedCardId(null);
                        }
                      }}
                      onDragStart={(imageUrl, x, y, w, h) => {
                        const next: DragPhase = { phase: 'potential', cardId: entry.card.id, imageUrl, x, y, w, h };
                        dragRef.current = next;
                        setDragRender({ ...next });
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          )
        )}
      </div>

      <CheerSection />
      <ExportPanel />

      {/* Drag ghost */}
      {dragRender.phase === 'dragging' && (
        <div
          className="fixed z-50 pointer-events-none rounded overflow-hidden shadow-2xl border-2 border-indigo-400"
          style={{
            width: dragRender.w,
            height: dragRender.h,
            left: dragRender.x - dragRender.w / 2,
            top: dragRender.y - dragRender.h / 2,
            opacity: 0.85,
            transform: 'rotate(3deg) scale(1.06)',
          }}
        >
          {dragRender.imageUrl ? (
            <img src={dragRender.imageUrl} className="w-full h-full object-cover" draggable={false} style={{ pointerEvents: 'none' }} />
          ) : (
            <div className="w-full h-full bg-gray-700" />
          )}
        </div>
      )}


    </div>
  );
}

