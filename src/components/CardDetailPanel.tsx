import type { Card } from '../types/card';
import { getCardImageVariants } from '../data/cardImageVariants';
import {
  getAccentColor,
  COLOR_LABELS,
  COLOR_ACCENT,
  TYPE_LABELS,
  TYPE_BG,
  HOLOMEM_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_BG,
  isBuzz,
} from '../utils/cardUtils';

export interface SelectedCard {
  card: Card;
  imageUrl?: string;
}

const timingLabels: Record<string, string> = {
  bloom: '블룸',
  collab: '콜라보',
  gift: '기프트',
  special: '스페셜',
};

function AbilityText({ label, name, desc }: { label: string; name: string; desc?: string }) {
  return (
    <div className="rounded bg-gray-800 border border-gray-700 p-2">
      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-700 text-indigo-300">{label}</span>
        <span className="text-xs font-semibold text-white">{name}</span>
      </div>
      {desc && <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-line">{desc}</p>}
    </div>
  );
}

/** 게임 화면 좌측: 클릭한 카드의 일러스트 + 상세 정보 패널. */
export default function CardDetailPanel({ selected }: { selected: SelectedCard | null }) {
  if (!selected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-3 gap-2 text-gray-600">
        <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
        </svg>
        <p className="text-[11px] leading-relaxed">카드를 클릭하면<br />여기에 크게 표시됩니다</p>
      </div>
    );
  }

  const { card } = selected;
  const accent = getAccentColor(card);
  const variants = getCardImageVariants(card.id, card.imageUrl);
  const image = selected.imageUrl ?? card.imageUrl ?? variants[0];

  return (
    <div className="h-full overflow-y-auto p-2 flex flex-col gap-2">
      {image ? (
        <img
          src={image}
          alt={card.name}
          className="w-full rounded-lg shadow-lg object-contain block"
          draggable={false}
        />
      ) : (
        <div className="w-full aspect-[5/7] rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-500">
          이미지 없음
        </div>
      )}

      <div
        className="flex flex-col gap-2 bg-gray-900 rounded-lg border p-2.5"
        style={{ borderColor: accent }}
      >
        {/* 타입 / 서브타입 / 색상 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_BG[card.type]}`}>
            {TYPE_LABELS[card.type]}
          </span>
          {card.type === 'holomem' && card.holomemSubtype && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-600 text-white">
              {HOLOMEM_SUBTYPE_LABELS[card.holomemSubtype]}
            </span>
          )}
          {isBuzz(card) && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white">Buzz</span>
          )}
          {card.type === 'support' && card.supportSubtype && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SUPPORT_SUBTYPE_BG[card.supportSubtype]}`}>
              {SUPPORT_SUBTYPE_LABELS[card.supportSubtype]}
            </span>
          )}
          {card.type === 'support' && card.limited && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-700 text-white">리미티드</span>
          )}
          {card.color?.map((c) => (
            <span
              key={c}
              className="text-[9px] px-1.5 py-0.5 rounded-full border"
              style={{ color: COLOR_ACCENT[c], borderColor: COLOR_ACCENT[c] + '88' }}
            >
              {COLOR_LABELS[c]}
            </span>
          ))}
        </div>

        {/* 이름 + HP/LIFE */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white break-words">{card.name}</h3>
            {card.nameJp && <p className="text-[10px] text-gray-500 truncate">{card.nameJp}</p>}
            <p className="text-[10px] text-gray-500">{card.cardNumber}</p>
          </div>
          <div className="shrink-0 text-right">
            {card.hp !== undefined && <div className="text-xs font-bold text-red-400">HP {card.hp}</div>}
            {card.life !== undefined && <div className="text-xs font-bold text-amber-400">LIFE {card.life}</div>}
          </div>
        </div>

        {/* 효과 */}
        {card.oshiStageAbility && (
          <AbilityText label="스테이지" name={card.oshiStageAbility.name} desc={card.oshiStageAbility.description} />
        )}
        {card.oshiAbility && (
          <AbilityText label="오시 효과" name={card.oshiAbility.name} desc={card.oshiAbility.description} />
        )}
        {card.spAbility && (
          <AbilityText label="SP 효과" name={card.spAbility.name} desc={card.spAbility.description} />
        )}
        {card.abilities?.map((ab, i) => (
          <AbilityText
            key={i}
            label={
              ab.damage !== undefined
                ? `아츠 · ${ab.damage}`
                : timingLabels[ab.timing ?? ''] ?? '효과'
            }
            name={ab.name}
            desc={ab.description}
          />
        ))}

        {card.extraRule && (
          <div className="rounded bg-yellow-900/30 border border-yellow-700/50 p-2 text-[11px] text-yellow-200 leading-relaxed whitespace-pre-line">
            {card.extraRule}
          </div>
        )}

        {card.batonPass !== undefined && (
          <p className="text-[10px] text-cyan-400">바톤터치: {card.batonPass === 0 ? '-' : card.batonPass}</p>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
