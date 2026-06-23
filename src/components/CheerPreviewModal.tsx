import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CardColor } from "../types/card";
import { COLOR_LABELS, COLOR_ACCENT } from "../utils/cardUtils";

interface CheerPreviewModalProps {
  color: CardColor;
  /** 이 색상의 선택 가능한 옐 일러스트 목록(첫 번째가 기본). */
  variants: string[];
  /** 현재 덱에 적용된 옐 이미지 URL. */
  selectedImageUrl: string;
  /** 옐 이미지 선택 콜백. */
  onSelectImage: (imageUrl: string) => void;
  onClose: () => void;
}

export default function CheerPreviewModal({
  color,
  variants,
  selectedImageUrl,
  onSelectImage,
  onClose,
}: CheerPreviewModalProps) {
  const accent = COLOR_ACCENT[color];
  const label = COLOR_LABELS[color];

  // 크게 보여줄 일러스트(미리보기). 기본은 현재 선택된 이미지.
  const initial = Math.max(0, variants.indexOf(selectedImageUrl));
  const [viewIndex, setViewIndex] = useState(initial);

  useEffect(() => {
    setViewIndex(Math.max(0, variants.indexOf(selectedImageUrl)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImageUrl, color]);

  const hasMultiple = variants.length > 1;
  const currentImage = variants[viewIndex] ?? variants[0];

  useEffect(() => {
    if (!hasMultiple) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setViewIndex((i) => (i - 1 + variants.length) % variants.length);
      } else if (e.key === "ArrowRight") {
        setViewIndex((i) => (i + 1) % variants.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasMultiple, variants.length]);

  function handlePrev(e: React.MouseEvent) {
    e.stopPropagation();
    setViewIndex((i) => (i - 1 + variants.length) % variants.length);
  }
  function handleNext(e: React.MouseEvent) {
    e.stopPropagation();
    setViewIndex((i) => (i + 1) % variants.length);
  }

  // PC에서 선택 패널이 확대 이미지보다 길어지지 않도록, 이미지의 실제 렌더
  // 높이를 측정해 패널 높이 상한으로 적용한다(모바일은 세로 배치라 미적용).
  const imgRef = useRef<HTMLImageElement>(null);
  const [panelMaxH, setPanelMaxH] = useState<number | undefined>(undefined);

  const measurePanel = useCallback(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const h = imgRef.current?.offsetHeight ?? 0;
    setPanelMaxH(isDesktop && h > 0 ? h : undefined);
  }, []);

  useEffect(() => {
    measurePanel();
    window.addEventListener("resize", measurePanel);
    return () => window.removeEventListener("resize", measurePanel);
  }, [measurePanel, currentImage]);

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
        className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4 max-h-[90vh] max-w-[95vw] md:max-w-[90vw] overflow-y-auto md:overflow-y-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 확대 이미지 */}
        <div className="shrink-0 self-center">
          <div className="relative">
            <img
              ref={imgRef}
              onLoad={measurePanel}
              src={currentImage}
              alt={`${label} 옐`}
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
                  {viewIndex + 1} / {variants.length}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 옐 이미지 선택 패널 */}
        <div
          className="w-full md:w-96 shrink-0 bg-gray-900 rounded-xl border flex flex-col max-h-[50vh] md:max-h-[80vh] overflow-hidden"
          style={{ borderColor: accent, maxHeight: panelMaxH }}
        >
          <div className="h-1.5 w-full shrink-0" style={{ background: accent }} />
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full border"
                style={{ color: accent, borderColor: accent + "88" }}
              >
                {label}
              </span>
              <h2 className="text-base font-bold text-white">옐 이미지 선택</h2>
            </div>
            <p className="text-xs text-gray-400">
              사용할 옐 일러스트를 선택하세요. 덱의 해당 색상 옐에 적용됩니다.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {variants.map((url, i) => {
                const isSelected = url === selectedImageUrl;
                return (
                  <button
                    key={url}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewIndex(i);
                      onSelectImage(url);
                    }}
                    className="relative rounded-lg overflow-hidden border-2 transition-colors"
                    style={{ borderColor: isSelected ? accent : "#374151" }}
                  >
                    <img
                      src={url}
                      alt={`${label} 옐 ${i + 1}`}
                      className="w-full aspect-2.5/3.5 object-cover bg-gray-800"
                      draggable={false}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center text-white py-0.5">
                      {i === 0 ? "기본" : `일러스트 ${i + 1}`}
                    </span>
                    {isSelected && (
                      <div
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
                        style={{ background: accent }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
