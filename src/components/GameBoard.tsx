import type { CSSProperties } from 'react';
import type { CardColor } from '../types/card';
import type { CardInstance, PlayerState, Slot } from '../game/types';

type Orientation = 'portrait' | 'landscape';

interface GameBoardProps {
  player: PlayerState;
  mirrored?: boolean;
  /** 강조(점멸)할 배치 가능 슬롯들. */
  highlightSlots?: Slot[];
  /** 슬롯 클릭 콜백 (배치/해제). */
  onSlotClick?: (slot: Slot) => void;
}

function slotEq(a: Slot, b: Slot): boolean {
  if (a.zone !== b.zone) return false;
  return a.zone === 'center' || a.index === (b as { index: number }).index;
}

/** 카드 인스턴스(앞면) 또는 빈 zone. */
function CardSlot({
  label,
  card,
  orientation = 'portrait',
  mirrored = false,
  highlighted = false,
  onClick,
  className = '',
}: {
  label: string;
  card?: CardInstance | null;
  orientation?: Orientation;
  mirrored?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const size =
    orientation === 'landscape'
      ? 'w-[calc(var(--cw)*1.4)] aspect-[7/5]'
      : 'w-[var(--cw)] aspect-[5/7]';
  const img = card?.imageUrl ?? card?.card.imageUrl;
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`relative ${size} shrink-0 rounded-md border flex items-center justify-center overflow-hidden ${
        highlighted
          ? 'border-amber-300 ring-2 ring-amber-300/70 animate-pulse cursor-pointer'
          : card
            ? 'border-gray-600'
            : 'border-dashed border-indigo-300/20 bg-indigo-400/[0.04]'
      } ${clickable ? 'cursor-pointer' : ''} ${className}`}
    >
      {card ? (
        img ? (
          <img src={img} alt={card.card.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className={`text-[8px] text-gray-300 p-0.5 text-center leading-tight ${mirrored ? 'rotate-180' : ''}`}>
            {card.card.name}
          </span>
        )
      ) : (
        <span
          className={`select-none text-center leading-tight text-[clamp(7px,1.05vw,11px)] text-gray-500 px-1 ${
            mirrored ? 'rotate-180' : ''
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** 라이프 zone(가로) + 라이프 뒷면 스택(색상 비공개). */
function LifeZone({ life, mirrored }: { life: CardColor[]; mirrored: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[calc(var(--cw)*0.06)]">
      <div className="relative w-[calc(var(--cw)*1.4)] aspect-[7/5] shrink-0 rounded-md border border-dashed border-indigo-300/20 bg-indigo-400/[0.04] flex items-center justify-center">
        <span className={`text-[clamp(7px,1.05vw,11px)] text-gray-500 ${mirrored ? 'rotate-180' : ''}`}>
          라이프 {life.length}
        </span>
      </div>
      <div className="flex flex-col gap-[calc(var(--cw)*0.04)] w-[calc(var(--cw)*1.4)]">
        {life.map((_, i) => (
          <div
            key={i}
            className="h-[calc(var(--cw)*0.1)] rounded-sm border border-rose-300/15 bg-gradient-to-br from-rose-900/40 to-purple-900/30"
          />
        ))}
      </div>
    </div>
  );
}

/** 덱/옐덱 등 카드 더미(뒷면 + 장수). */
function PileZone({ label, count, mirrored }: { label: string; count: number; mirrored: boolean }) {
  return (
    <div className="relative w-[var(--cw)] aspect-[5/7] shrink-0 rounded-md border border-gray-600 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 flex flex-col items-center justify-center gap-0.5">
      <span className={`text-[clamp(7px,1.05vw,11px)] text-gray-400 ${mirrored ? 'rotate-180' : ''}`}>{label}</span>
      <span className={`text-[clamp(8px,1.2vw,13px)] font-bold text-gray-200 ${mirrored ? 'rotate-180' : ''}`}>{count}</span>
    </div>
  );
}

const BACK_COLS = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5'];

/**
 * 한 플레이어의 게임판. mirrored=true 면 180° 회전(상대 판), 라벨은 내부에서 보정.
 */
export default function GameBoard({ player, mirrored = false, highlightSlots = [], onSlotClick }: GameBoardProps) {
  const cellGap = 'gap-x-[calc(var(--cw)*0.12)]';
  const isHi = (slot: Slot) => highlightSlots.some((h) => slotEq(h, slot));
  const click = (slot: Slot) => (onSlotClick ? () => onSlotClick(slot) : undefined);

  return (
    <div
      className={`flex items-stretch justify-center gap-[calc(var(--cw)*0.2)] h-[calc(var(--cw)*3.6)] ${
        mirrored ? 'rotate-180' : ''
      }`}
      style={{ '--cw': 'clamp(20px, min(11.5cqw, 11.5cqh), 150px)' } as CSSProperties}
    >
      {/* 좌측 열: 라이프(상) / 옐 덱(하) */}
      <div className="flex flex-col justify-between items-center h-full">
        <LifeZone life={player.life} mirrored={mirrored} />
        <PileZone label="옐 덱" count={player.cheerDeck.length} mirrored={mirrored} />
      </div>

      {/* 중앙: 전열(콜라보·센터·오시) + 후열(백1~5) */}
      <div className={`grid grid-cols-[repeat(5,var(--cw))] grid-rows-2 content-between ${cellGap} h-full`}>
        <CardSlot label="콜라보 포지션" mirrored={mirrored} className="col-start-1 row-start-1" />
        <CardSlot
          label="센터 포지션"
          card={player.center}
          mirrored={mirrored}
          highlighted={isHi({ zone: 'center' })}
          onClick={click({ zone: 'center' })}
          className="col-start-3 row-start-1"
        />
        <CardSlot
          label="오시 포지션"
          card={player.oshi ? { uid: 'oshi', card: player.oshi, imageUrl: player.oshiImageUrl } : null}
          mirrored={mirrored}
          className="col-start-5 row-start-1"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <CardSlot
            key={i}
            label={`백 포지션 ${i + 1}`}
            card={player.back[i]}
            mirrored={mirrored}
            highlighted={isHi({ zone: 'back', index: i })}
            onClick={click({ zone: 'back', index: i })}
            className={`${BACK_COLS[i]} row-start-2`}
          />
        ))}
      </div>

      {/* 우측 열: 홀로 파워(상) / 덱(중) / 아카이브(하) */}
      <div className="flex flex-col justify-between items-center h-full">
        <CardSlot label="홀로 파워" orientation="landscape" mirrored={mirrored} />
        <PileZone label="덱" count={player.deck.length} mirrored={mirrored} />
        <CardSlot label="아카이브" orientation="landscape" mirrored={mirrored} />
      </div>
    </div>
  );
}
