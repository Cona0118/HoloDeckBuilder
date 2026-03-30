import { useRef, useState } from "react";
import type { Card, CardAbility, OshiAbility } from "../types/card";
import { isBuzz } from "../utils/cardUtils";
import {
  getAccentColor,
  COLOR_LABELS,
  COLOR_ACCENT,
  TYPE_LABELS,
  TYPE_BG,
  HOLOMEM_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_BG,
} from "../utils/cardUtils";
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="flex gap-4 max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 확대 카드 이미지 */}
            <img
              src={card.imageUrl}
              alt={card.name}
              className="max-h-[85vh] max-w-[40vw] w-auto rounded-xl shadow-2xl object-contain shrink-0"
              draggable={false}
            />

            {/* 카드 정보 패널 */}
            <div
              className="w-104 shrink-0 bg-gray-900 rounded-xl border overflow-y-auto flex flex-col"
              style={{ borderColor: accent }}
            >
              <div className="h-1.5 w-full shrink-0" style={{ background: accent }} />

              <div className="p-4 flex flex-col gap-3">
                {/* 타입 + 서브타입 + 색상 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_BG[card.type]}`}>
                    {TYPE_LABELS[card.type]}
                  </span>
                  {card.type === "holomem" && card.holomemSubtype && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-600 text-white">
                      {HOLOMEM_SUBTYPE_LABELS[card.holomemSubtype]}
                    </span>
                  )}
                  {isBuzz(card) && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white">
                      Buzz
                    </span>
                  )}
                  {card.type === "support" && card.supportSubtype && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${SUPPORT_SUBTYPE_BG[card.supportSubtype]}`}>
                      {SUPPORT_SUBTYPE_LABELS[card.supportSubtype]}
                    </span>
                  )}
                  {card.type === "support" && card.limited && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-700 text-white">
                      리미티드
                    </span>
                  )}
                  {card.color && card.color.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {card.color.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{ color: COLOR_ACCENT[c], borderColor: COLOR_ACCENT[c] + "88" }}
                        >
                          {COLOR_LABELS[c]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 이름 + HP/LIFE */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-white min-w-0 truncate">{card.name}</h2>
                    {card.hp !== undefined && (
                      <span className="text-base font-bold text-red-400 shrink-0">HP {card.hp}</span>
                    )}
                    {card.life !== undefined && (
                      <span className="text-base font-bold text-amber-400 shrink-0">LIFE {card.life}</span>
                    )}
                  </div>
                  {card.nameJp && <p className="text-xs text-gray-500">{card.nameJp}</p>}
                </div>

                <p className="text-xs text-gray-500">{card.cardNumber}</p>

                {/* 효과 */}
                {card.oshiStageAbility && (
                  <PreviewOshiAbility label="스테이지 효과" ability={card.oshiStageAbility} color={accent} />
                )}
                {card.oshiAbility && (
                  <PreviewOshiAbility label="오시 효과" ability={card.oshiAbility} color={accent} />
                )}
                {card.spAbility && (
                  <PreviewOshiAbility label="SP 효과" ability={card.spAbility} color="#f59e0b" />
                )}
                {card.abilities?.map((ab, i) => (
                  <PreviewAbility key={i} label={ab.damage !== undefined ? "아츠" : (ab.timing ?? "효과")} ability={ab} color={TIMING_COLOR[ab.timing ?? ''] ?? accent} />
                ))}

                {/* 엑스트라 룰 */}
                {card.extraRule && (
                  <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 p-3">
                    <span className="text-[10px] font-bold text-yellow-400 block mb-1">엑스트라 룰</span>
                    <p className="text-xs text-yellow-200 leading-relaxed"><RichText text={card.extraRule} /></p>
                  </div>
                )}

                {/* 태그 */}
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* 바톤터치 */}
                {card.batonPass !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-cyan-400">바톤터치</span>
                    <div className="flex items-center gap-1">
                      {card.batonPass === 0 ? (
                        <span className="text-xs text-gray-500">-</span>
                      ) : (
                        Array.from({ length: card.batonPass }, (_, i) => (
                          <img key={i} src="/images/cost/cost.png" alt="코스트" className="w-5 h-5" draggable={false} />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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

const TIMING_COLOR: Record<string, string> = {
  collab: '#ef4444',
  bloom: '#3b82f6',
  gift: '#22c55e',
};

const COST_IMAGE: Record<string, string> = {
  white: '/images/cost/cost_w.png',
  green: '/images/cost/cost_g.png',
  red: '/images/cost/cost_r.png',
  blue: '/images/cost/cost_b.png',
  purple: '/images/cost/cost_p.png',
  yellow: '/images/cost/cost_y.png',
  colorless: '/images/cost/cost.png',
};

const HOLO_ARTS_MAP: Record<string, string> = {
  W: '/images/cost/cost_w.png',
  G: '/images/cost/cost_g.png',
  R: '/images/cost/cost_r.png',
  B: '/images/cost/cost_b.png',
  P: '/images/cost/cost_p.png',
  Y: '/images/cost/cost_y.png',
  N: '/images/cost/cost.png',
};

function RichText({ text }: { text: string }) {
  const parts = text.split(/(홀로아츠 [WGRPBYN])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^홀로아츠 ([WGRPBYN])$/);
        if (m && HOLO_ARTS_MAP[m[1]]) {
          return <img key={i} src={HOLO_ARTS_MAP[m[1]]} alt={part} className="inline-block w-4 h-4 align-text-bottom mx-0.5" draggable={false} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const timingLabels: Record<string, string> = {
  bloom: '블룸',
  collab: '콜라보',
  gift: '기프트',
  special: '스페셜',
};

function PreviewAbility({ label, ability, color }: {
  label: string;
  ability: CardAbility;
  color: string;
}) {
  const isArts = label === "아츠";

  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded border"
          style={{ color, borderColor: color + '88' }}
        >
          {timingLabels[label] ?? label}
        </span>
        {isArts && ability.cost && (
          <div className="flex items-center gap-0.5">
            {ability.cost.map((c, i) => (
              <img key={i} src={COST_IMAGE[c]} alt={c} className="w-5 h-5" draggable={false} />
            ))}
          </div>
        )}
        <span className="text-sm font-semibold text-white">{ability.name}</span>
        {isArts && ability.damage !== undefined && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-sm font-bold text-red-400">{ability.damage}</span>
            {ability.specialDamage && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                style={{
                  color: COLOR_ACCENT[ability.specialDamage.color],
                  borderColor: COLOR_ACCENT[ability.specialDamage.color] + '88',
                  background: COLOR_ACCENT[ability.specialDamage.color] + '20',
                }}
              >
                {COLOR_LABELS[ability.specialDamage.color]} +{ability.specialDamage.value}
              </span>
            )}
          </div>
        )}
        {!isArts && ability.cost && (
          <span className="ml-auto text-xs bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-700/50">
            {ability.cost.join(', ')}
          </span>
        )}
      </div>
      {ability.description && (
        <p className="text-xs text-gray-300 leading-relaxed"><RichText text={ability.description} /></p>
      )}
    </div>
  );
}

function PreviewOshiAbility({ label, ability, color }: {
  label: string;
  ability: OshiAbility;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded border"
          style={{ color, borderColor: color + '88' }}
        >
          {label}
        </span>
        <span className="text-sm font-semibold text-white">{ability.name}</span>
        {ability.cost && (
          <span className="ml-auto text-xs bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-700/50">
            {ability.cost}
          </span>
        )}
      </div>
      {ability.description && (
        <p className="text-xs text-gray-300 leading-relaxed"><RichText text={ability.description} /></p>
      )}
    </div>
  );
}
