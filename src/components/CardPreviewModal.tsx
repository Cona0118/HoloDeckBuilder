import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Card, CardAbility, OshiAbility } from "../types/card";
import { isBuzz } from "../utils/cardUtils";
import { getCardImageVariants } from "../data/cardImageVariants";
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

interface CardPreviewModalProps {
  card: Card;
  onClose: () => void;
  /** 일러스트 선택 콜백. 제공되면 다중 일러스트 카드일 때 "이 일러스트로 변경" 버튼 노출. */
  onSelectImage?: (imageUrl: string) => void;
  /** 1장만 분리 콜백. 제공되면 "1장만 분리" 버튼이 추가로 노출된다. */
  onSplitToImage?: (imageUrl: string) => void;
  /** 현재 활성화된 일러스트 URL. 일치하면 "현재 일러스트" 비활성 상태로 표시. */
  selectedImageUrl?: string;
}

export default function CardPreviewModal({ card, onClose, onSelectImage, onSplitToImage, selectedImageUrl }: CardPreviewModalProps) {
  const accent = getAccentColor(card);
  const navigate = useNavigate();

  const variants = getCardImageVariants(card.id, card.imageUrl);
  const hasMultiple = variants.length > 1;

  function pickInitialIndex(): number {
    if (selectedImageUrl) {
      const sel = variants.indexOf(selectedImageUrl);
      if (sel >= 0) return sel;
    }
    if (card.imageUrl) {
      const def = variants.indexOf(card.imageUrl);
      if (def >= 0) return def;
    }
    return 0;
  }

  const [imageIndex, setImageIndex] = useState(pickInitialIndex);

  useEffect(() => {
    setImageIndex(pickInitialIndex());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, selectedImageUrl]);

  useEffect(() => {
    if (!hasMultiple) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setImageIndex((i) => (i - 1 + variants.length) % variants.length);
      } else if (e.key === "ArrowRight") {
        setImageIndex((i) => (i + 1) % variants.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasMultiple, variants.length]);

  const currentImage = variants[imageIndex] ?? card.imageUrl;

  function handlePrev(e: React.MouseEvent) {
    e.stopPropagation();
    setImageIndex((i) => (i - 1 + variants.length) % variants.length);
  }
  function handleNext(e: React.MouseEvent) {
    e.stopPropagation();
    setImageIndex((i) => (i + 1) % variants.length);
  }

  function handleDeckSearch() {
    const param = card.type === "oshi" ? "oshi" : "card";
    onClose();
    navigate(`/board?${param}=${encodeURIComponent(card.id)}`);
  }

  function handleQnaSearch() {
    const url = `https://hololive-official-cardgame.com/rules/question/search/?keyword=${encodeURIComponent(card.cardNumber)}&keyword_type%5B%5D=all&search_type=and&expansion=`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-800/80 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors z-10"
        onClick={onClose}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="flex flex-col md:flex-row gap-3 md:gap-4 max-h-[90vh] max-w-[95vw] md:max-w-[90vw] overflow-y-auto md:overflow-y-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 확대 카드 이미지 */}
        <div className="shrink-0 self-center flex flex-col items-center gap-2">
          <div className="relative">
            <img
              src={currentImage}
              alt={card.name}
              className="max-h-[40vh] md:max-h-[80vh] max-w-full md:max-w-[40vw] w-auto rounded-xl shadow-2xl object-contain block"
              draggable={false}
            />
            {hasMultiple && (
              <>
                <button
                  onClick={handlePrev}
                  aria-label="이전 일러스트"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  aria-label="다음 일러스트"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/70 border border-white/20 text-[11px] text-white font-medium tabular-nums">
                  {imageIndex + 1} / {variants.length}
                </div>
              </>
            )}
          </div>
          {(onSelectImage || onSplitToImage) && hasMultiple && currentImage && (() => {
            const effectiveSelected = selectedImageUrl ?? card.imageUrl;
            const isCurrent = effectiveSelected === currentImage;
            if (isCurrent) {
              return (
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-800 border-gray-700 text-gray-500 cursor-default"
                >
                  ✓ 현재 일러스트
                </button>
              );
            }
            return (
              <div className="flex gap-2 flex-wrap justify-center">
                {onSelectImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectImage(currentImage);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-700 hover:bg-emerald-600 border-emerald-600 text-white transition-colors"
                  >
                    이 일러스트로 변경
                  </button>
                )}
                {onSplitToImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSplitToImage(currentImage);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-indigo-700 hover:bg-indigo-600 border-indigo-600 text-white transition-colors"
                  >
                    1장 분리
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* 카드 정보 패널 */}
        <div
          className="w-full md:w-140 shrink-0 bg-gray-900 rounded-xl border flex flex-col max-h-[50vh] md:max-h-[85vh] overflow-hidden"
          style={{ borderColor: accent }}
        >
          <div className="h-1.5 w-full shrink-0" style={{ background: accent }} />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
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
            {card.type === "support" && card.limited && (
              <div className="rounded-lg bg-red-900 px-3 py-1.5">
                <p className="text-[11px] font-bold text-white tracking-wide text-center">LIMITED : 턴에 1번 밖에 사용할 수 없다.</p>
              </div>
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

            {/* 제한카드 */}
            {card.restricted && (
              <div className="rounded-lg bg-red-900/50 border border-red-700/50 px-3 py-1.5">
                <p className="text-[11px] font-bold text-red-300 text-center">제한카드 ({card.restricted})</p>
              </div>
            )}
          </div>

          {/* 하단 액션 (sticky 하단) */}
          <div className="shrink-0 px-4 py-2 border-t border-gray-800 flex justify-between items-center gap-2">
            <button
              onClick={handleQnaSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              QnA 검색하기
            </button>
            <button
              onClick={handleDeckSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg border border-indigo-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              이 카드를 사용한 덱 검색
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Helper constants & components ──

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
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(홀로아츠 [WGRPBYN])/g);
        return (
          <span key={li}>
            {li > 0 && <br />}
            {parts.map((part, pi) => {
              const m = part.match(/^홀로아츠 ([WGRPBYN])$/);
              if (m && HOLO_ARTS_MAP[m[1]]) {
                return <img key={pi} src={HOLO_ARTS_MAP[m[1]]} alt={part} className="inline-block w-4 h-4 align-text-bottom mx-0.5" draggable={false} />;
              }
              return <span key={pi}>{part}</span>;
            })}
          </span>
        );
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
