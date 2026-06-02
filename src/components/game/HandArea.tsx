import type { CSSProperties } from 'react';
import type { CardInstance } from '../../game/types';
import { isDebut } from '../../game/setup';

interface HandAreaProps {
  hand: CardInstance[];
  /** 강조(선택됨)할 카드 uid 집합. */
  selectedUids: string[];
  /** 카드 클릭. */
  onCardClick: (ci: CardInstance) => void;
  /** 데뷔만 활성(배치 단계)일 때 true → 비데뷔는 흐리게. */
  debutOnly?: boolean;
  emptyText?: string;
}

const handVars = { '--hcw': 'clamp(40px, min(13.5cqw, 14cqh), 120px)' } as CSSProperties;

export default function HandArea({
  hand,
  selectedUids,
  onCardClick,
  debutOnly = false,
  emptyText = '패가 비어 있습니다.',
}: HandAreaProps) {
  return (
    <div className="flex gap-1 overflow-x-auto items-center pt-0.5" style={handVars}>
      {hand.length === 0 ? (
        <p className="text-[11px] text-gray-600 px-1">{emptyText}</p>
      ) : (
        hand.map((ci) => {
          const img = ci.imageUrl ?? ci.card.imageUrl;
          const selected = selectedUids.includes(ci.uid);
          const dimmed = debutOnly && !isDebut(ci.card);
          return (
            <button
              key={ci.uid}
              onClick={() => onCardClick(ci)}
              className={`w-[var(--hcw)] shrink-0 rounded overflow-hidden border transition-all ${
                selected
                  ? 'border-amber-300 ring-2 ring-amber-300 -translate-y-1'
                  : 'border-gray-700 hover:border-gray-500'
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              {img ? (
                <img src={img} alt={ci.card.name} className="w-full block" draggable={false} />
              ) : (
                <div className="w-full aspect-[5/7] flex items-center justify-center text-[8px] text-gray-500 p-0.5 text-center leading-tight">
                  {ci.card.name}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
