import type { Card, CardAbility, OshiAbility } from '../types/card';
import {
  getAccentColor,
  COLOR_LABELS,
  COLOR_ACCENT,
  TYPE_LABELS,
  TYPE_BG,
  HOLOMEM_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_BG,
} from '../utils/cardUtils';
import { useDeckStore } from '../store/deckStore';

interface CardDetailProps {
  card: Card;
  onClose: () => void;
}

export default function CardDetail({ card, onClose }: CardDetailProps) {
  const { addCard, removeCard, setOshi, getActiveDeck } = useDeckStore();
  const activeDeck = getActiveDeck();

  const accent = getAccentColor(card);

  const entry = activeDeck?.mainDeck.find((e) => e.card.id === card.id);
  const countInDeck = entry?.count ?? 0;
  const cardLimit = card.limit ?? 4;
  const atMax = countInDeck >= cardLimit;
  const isOshiSelected = card.type === 'oshi' && activeDeck?.oshi?.id === card.id;

  function subtypeLabel() {
    if (card.type === 'holomem' && card.holomemSubtype) return HOLOMEM_SUBTYPE_LABELS[card.holomemSubtype];
    if (card.type === 'support' && card.supportSubtype) return SUPPORT_SUBTYPE_LABELS[card.supportSubtype];
    return null;
  }
  function subtypeBg() {
    if (card.type === 'support' && card.supportSubtype) return SUPPORT_SUBTYPE_BG[card.supportSubtype];
    return 'bg-gray-600 text-white';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md bg-gray-900 rounded-2xl border overflow-hidden shadow-2xl"
        style={{ borderColor: accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: accent }} />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10"
        >✕</button>

        {/* Header */}
        <div className="flex gap-4 p-4">
          {/* Image placeholder */}
          <div
            className="w-28 shrink-0 aspect-2.5/3.5 rounded-lg flex items-center justify-center overflow-hidden bg-gray-800 border"
            style={{ borderColor: accent + '88' }}
          >
            {card.imageUrl ? (
              <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: accent + '33', color: accent }}
              >
                {card.name[0]}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
            {/* Type + subtype */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_BG[card.type]}`}>
                {TYPE_LABELS[card.type]}
              </span>
              {subtypeLabel() && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${subtypeBg()}`}>
                  {subtypeLabel()}
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <h2 className="text-base font-bold text-white">{card.name}</h2>
              {card.nameJp && <p className="text-xs text-gray-500">{card.nameJp}</p>}
            </div>

            <p className="text-xs text-gray-500">{card.cardNumber}</p>

            {/* Colors */}
            {card.color && (
              <div className="flex flex-wrap gap-1">
                {card.color.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                    style={{ color: COLOR_ACCENT[c], borderColor: COLOR_ACCENT[c] + '88' }}
                  >
                    {COLOR_LABELS[c]}
                  </span>
                ))}
              </div>
            )}

            {/* HP */}
            {card.hp !== undefined && (
              <div>
                <p className="text-xs text-gray-500">HP</p>
                <p className="text-lg font-bold text-red-400">{card.hp}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="border-t border-gray-800" />

        {/* Abilities */}
        <div className="p-4 flex flex-col gap-3">
          {card.oshiAbility && (
            <AbilityBlock label="오시 능력" ability={card.oshiAbility} color={accent} />
          )}
          {card.spAbility && (
            <AbilityBlock label="SP 능력" ability={card.spAbility} color="#f59e0b" />
          )}
          {card.abilities?.map((ab, i) => (
            <AbilityBlock key={i} label={ab.timing ?? '능력'} ability={ab} color={accent} />
          ))}
        </div>

        <div className="border-t border-gray-800" />

        {/* Deck actions */}
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">덱에 포함:</p>
            <p className="text-sm font-bold text-white">
              {card.type === 'oshi'
                ? (isOshiSelected ? '선택됨' : '미선택')
                : `${countInDeck} / ${cardLimit}장`}
            </p>
          </div>

          {card.type !== 'oshi' && (
            <>
              <button
                onClick={() => removeCard(card)}
                disabled={countInDeck === 0}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >− 제거</button>
              <button
                onClick={() => addCard(card)}
                disabled={atMax}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >+ 추가</button>
            </>
          )}
          {card.type === 'oshi' && (
            <button
              onClick={() => setOshi(card)}
              className={`px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                isOshiSelected ? 'bg-indigo-700 cursor-default' : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {isOshiSelected ? '선택 중' : '오시 선택'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AbilityBlock({ label, ability, color }: {
  label: string;
  ability: CardAbility | OshiAbility;
  color: string;
}) {
  const timingLabels: Record<string, string> = {
    bloom: 'Bloom',
    activate: '액티베이트',
    collab: '콜라보',
    special: '스페셜',
  };

  return (
    <div className="rounded-lg bg-gray-800 border border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded border"
          style={{ color, borderColor: color + '88' }}
        >
          {timingLabels[label] ?? label}
        </span>
        <span className="text-sm font-semibold text-white">{ability.name}</span>
        {ability.cost && (
          <span className="ml-auto text-xs bg-gray-700 text-yellow-400 px-1.5 py-0.5 rounded-full border border-yellow-700/50">
            {typeof ability.cost === 'string' ? ability.cost : ability.cost.join(', ')}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-300 leading-relaxed">{ability.description}</p>
    </div>
  );
}
