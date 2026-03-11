import { useRef, useState } from "react";
import type { Card } from "../types/card";
import { getAccentColor } from "../utils/cardUtils";
import { useDeckStore } from "../store/deckStore";

interface CardItemProps {
  card: Card;
  compact?: boolean;
}

export default function CardItem({ card, compact = false }: CardItemProps) {
  const { addCard, removeCard, getActiveDeck, setOshi } = useDeckStore();
  const activeDeck = getActiveDeck();
  const [previewOpen, setPreviewOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const isTouch = useRef(false);

  const accent = getAccentColor(card);
  const entry = activeDeck?.mainDeck.find((e) => e.card.id === card.id);
  const countInDeck = entry?.count ?? 0;
  const isOshiSelected =
    card.type === "oshi" && activeDeck?.oshi?.id === card.id;
  const highlighted = countInDeck > 0 || isOshiSelected;

  function startLongPress(e: React.PointerEvent) {
    isTouch.current = e.pointerType === 'touch';
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (card.imageUrl) setPreviewOpen(true);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (card.type === "oshi") setOshi(card);
    else addCard(card);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (isTouch.current) return;
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (card.type !== "oshi") removeCard(card);
  }

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800 cursor-pointer border border-transparent hover:border-gray-600 transition-all select-none"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">{card.name}</p>
          <p className="text-[10px] text-gray-500">{card.cardNumber}</p>
        </div>
        {highlighted && (
          <span className="text-xs font-bold text-indigo-400 shrink-0">
            {isOshiSelected ? "★" : `×${countInDeck}`}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewOpen(false)}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            className="max-h-[94vh] max-w-[94vw] w-auto h-auto rounded-xl shadow-2xl"
            draggable={false}
          />
        </div>
      )}
      <div
        className="relative flex flex-col bg-gray-800 rounded-xl border cursor-pointer transition-all hover:shadow-lg overflow-hidden select-none"
        style={{
          borderColor: highlighted ? accent : "#374151",
          boxShadow: highlighted ? `0 0 10px ${accent}44` : undefined,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Color stripe */}
        <div className="h-1 w-full" style={{ background: accent }} />

        {/* Image area */}
        <div
          className="relative w-full aspect-2.5/3.5 flex items-center justify-center overflow-hidden bg-gray-900"
          style={{ minHeight: 50, WebkitTouchCallout: 'none' }}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
        >
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover"
              draggable={false}
              loading="lazy"
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 p-2 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: accent + "33", color: accent }}
              >
                {card.name[0]}
              </div>
              <span className="text-[9px] text-gray-600">
                {card.cardNumber}
              </span>
            </div>
          )}

          {/* Count / Oshi badge */}
          {highlighted && (
            <span className="absolute top-1.5 left-1.5 min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              {isOshiSelected ? "★" : countInDeck}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="px-2 py-2 flex items-baseline justify-between gap-1 w-full">
          <p className="text-[10px] md:text-sm font-semibold text-white leading-tight line-clamp-2 md:truncate min-w-0">
            {card.name}
          </p>
          <span className="hidden md:inline text-xs text-gray-500 shrink-0">
            {card.cardNumber}
          </span>
        </div>
      </div>
    </>
  );
}
