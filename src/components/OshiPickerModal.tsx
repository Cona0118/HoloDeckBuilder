import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CARDS } from '../data/cards';
import { getAccentColor } from '../utils/cardUtils';

interface Props {
  onClose: () => void;
  onSelect: (oshiCardId: string) => void;
}

export default function OshiPickerModal({ onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const oshiCards = useMemo(
    () =>
      CARDS.filter((c) => c.type === 'oshi').sort((a, b) =>
        a.cardNumber.localeCompare(b.cardNumber),
      ),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return oshiCards;
    return oshiCards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nameJp ?? '').toLowerCase().includes(q) ||
        c.cardNumber.toLowerCase().includes(q),
    );
  }, [oshiCards, search]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white">오시 카드로 검색</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-800">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 / 카드번호 검색"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">결과가 없습니다.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {filtered.map((card) => {
                const accent = getAccentColor(card);
                return (
                  <button
                    key={card.id}
                    onClick={() => onSelect(card.id)}
                    className="flex flex-col items-stretch rounded-lg border bg-gray-800 hover:bg-gray-700 transition-colors overflow-hidden"
                    style={{ borderColor: accent + '66' }}
                  >
                    <div className="aspect-2.5/3.5 w-full bg-gray-900 overflow-hidden">
                      {card.imageUrl ? (
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          draggable={false}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center p-2"
                          style={{ background: accent + '22' }}
                        >
                          <span className="text-xs text-center text-gray-300 leading-tight">
                            {card.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-1.5 py-1 flex flex-col items-start">
                      <span className="text-[11px] sm:text-xs text-white font-medium truncate w-full text-left">
                        {card.name}
                      </span>
                      <span className="text-[10px] text-gray-500">{card.cardNumber}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
