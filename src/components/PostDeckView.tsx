import { CARDS } from '../data/cards';
import type { CardColor } from '../types/card';
import { COLOR_ACCENT, COLOR_LABELS, getAccentColor } from '../utils/cardUtils';

const CHEER_IMAGE: Record<CardColor, string> = {
  white: '/images/hY/hY01.png',
  green: '/images/hY/hY02.png',
  red: '/images/hY/hY03.png',
  blue: '/images/hY/hY04.png',
  purple: '/images/hY/hY05.png',
  yellow: '/images/hY/hY06.png',
};

interface Props {
  oshiCardId: string;
  oshiImageUrl?: string;
  mainDeck: Array<{ cardId: string; count: number; imageUrl?: string }>;
  cheers: Partial<Record<CardColor, number>>;
}

function getCard(id: string) {
  return CARDS.find((c) => c.id === id);
}

function CardSlot({
  imageUrl,
  name,
  count,
  accent,
  missing,
}: {
  imageUrl?: string;
  name: string;
  count: number;
  accent: string;
  missing?: boolean;
}) {
  return (
    <div
      className="relative aspect-2.5/3.5 rounded overflow-hidden border bg-gray-900"
      style={{ borderColor: accent + '66' }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center p-1"
          style={{ background: accent + '22' }}
        >
          <span className="text-[9px] text-center text-gray-400 leading-tight">
            {missing ? '카드 없음' : name}
          </span>
        </div>
      )}
      <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold flex items-center justify-center shadow">
        ×{count}
      </span>
    </div>
  );
}

export default function PostDeckView({ oshiCardId, oshiImageUrl, mainDeck, cheers }: Props) {
  const oshi = getCard(oshiCardId);
  const oshiAccent = oshi ? getAccentColor(oshi) : '#6b7280';
  const oshiResolvedUrl = oshiImageUrl ?? oshi?.imageUrl;

  const cheerEntries = (
    Object.entries(cheers) as Array<[CardColor, number | undefined]>
  ).filter(([, n]) => (n ?? 0) > 0);

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 bg-gray-950 border-t border-gray-800">
      {/* 오시 (왼쪽 큰 사이즈) */}
      <div className="md:w-48 shrink-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">오시</p>
        <div
          className="aspect-2.5/3.5 rounded-lg overflow-hidden border-2 max-w-40 md:max-w-none mx-auto md:mx-0"
          style={{ borderColor: oshiAccent + 'aa' }}
        >
          {oshi && oshiResolvedUrl ? (
            <img src={oshiResolvedUrl} alt={oshi.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <span className="text-xs text-gray-500 text-center px-1">
                {oshi ? oshi.name : '카드 없음'}
              </span>
            </div>
          )}
        </div>
        {oshi && (
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="text-xs text-amber-200 font-semibold truncate">
              {oshi.name}
            </p>
            <span className="text-[10px] text-gray-500 shrink-0">
              {oshi.cardNumber}
            </span>
          </div>
        )}
      </div>

      {/* 메인덱 그리드 + 엘 덱 */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
            메인 덱{' '}
            <span className="text-gray-600">
              ({mainDeck.reduce((s, e) => s + e.count, 0)})
            </span>
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {mainDeck.map((e, idx) => {
              const card = getCard(e.cardId);
              const accent = card ? getAccentColor(card) : '#6b7280';
              const imageUrl = e.imageUrl ?? card?.imageUrl;
              return (
                <CardSlot
                  key={`${e.cardId}-${e.imageUrl ?? ''}-${idx}`}
                  imageUrl={imageUrl}
                  name={card?.name ?? e.cardId}
                  count={e.count}
                  accent={accent}
                  missing={!card}
                />
              );
            })}
          </div>
        </div>

        {cheerEntries.length > 0 && (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">엘 덱</p>
            <div className="flex flex-wrap gap-2">
              {cheerEntries.map(([color, count]) => (
                <div
                  key={color}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-900 border"
                  style={{ borderColor: COLOR_ACCENT[color] + '66' }}
                >
                  <img src={CHEER_IMAGE[color]} alt={color} className="w-4 h-5 object-cover rounded-sm" />
                  <span className="text-xs text-gray-300">{COLOR_LABELS[color]} ×{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
