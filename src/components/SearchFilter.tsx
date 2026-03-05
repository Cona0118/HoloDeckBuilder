import { useDeckStore } from '../store/deckStore';
import { SETS } from '../data/cards';
import {
  COLOR_LABELS,
  TYPE_LABELS,
  HOLOMEM_SUBTYPE_LABELS,
  SUPPORT_SUBTYPE_LABELS,
} from '../utils/cardUtils';
import type { CardColor, CardType, HolomemSubtype, SupportSubtype } from '../types/card';

const TYPES: CardType[] = ['oshi', 'holomem', 'support'];
const COLORS: CardColor[] = ['white', 'green', 'red', 'blue', 'purple', 'yellow'];
const HOLOMEM_SUBTYPES: HolomemSubtype[] = ['debut', '1st', '2nd', 'spot'];
const SUPPORT_SUBTYPES: SupportSubtype[] = ['item', 'event', 'tool', 'mascot', 'fan', 'staff'];

const COLOR_DOT: Record<CardColor, string> = {
  white:  '#e5e7eb',
  green:  '#16a34a',
  red:    '#dc2626',
  blue:   '#2563eb',
  purple: '#9333ea',
  yellow: '#ca8a04',
};

function ToggleChip<T extends string>({
  value, label, active, onToggle, dot,
}: {
  value: T; label: string; active: boolean; onToggle: (v: T) => void; dot?: string;
}) {
  return (
    <button
      onClick={() => onToggle(value)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? 'bg-indigo-600 border-indigo-500 text-white'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
      }`}
    >
      {dot && (
        <span
          className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
          style={{ background: dot }}
        />
      )}
      {label}
    </button>
  );
}

export default function SearchFilter() {
  const { filter, setFilter, resetFilter } = useDeckStore();

  function toggleType(t: CardType) {
    const has = filter.types.includes(t);
    const newTypes = has ? filter.types.filter((x) => x !== t) : [...filter.types, t];
    const hasColor = newTypes.includes('oshi') || newTypes.includes('holomem');
    const extra = hasColor ? {} : { colors: [] };
    if (has && t === 'holomem') setFilter({ types: newTypes, holomemSubtypes: [], ...extra });
    else if (has && t === 'support') setFilter({ types: newTypes, supportSubtypes: [], limitedFilter: null, ...extra });
    else setFilter({ types: newTypes, ...extra });
  }
  function toggleColor(c: CardColor) {
    const has = filter.colors.includes(c);
    setFilter({ colors: has ? filter.colors.filter((x) => x !== c) : [...filter.colors, c] });
  }
  function toggleHolomemSubtype(s: HolomemSubtype) {
    const has = filter.holomemSubtypes.includes(s);
    setFilter({ holomemSubtypes: has ? filter.holomemSubtypes.filter((x) => x !== s) : [...filter.holomemSubtypes, s] });
  }
  function toggleSupportSubtype(s: SupportSubtype) {
    const has = filter.supportSubtypes.includes(s);
    setFilter({ supportSubtypes: has ? filter.supportSubtypes.filter((x) => x !== s) : [...filter.supportSubtypes, s] });
  }
  function toggleLimitedFilter(val: boolean) {
    setFilter({ limitedFilter: filter.limitedFilter === val ? null : val });
  }
  function toggleSet(s: string) {
    const has = filter.sets.includes(s);
    setFilter({ sets: has ? filter.sets.filter((x) => x !== s) : [...filter.sets, s] });
  }

  const colorDisabled =
    filter.types.length > 0 && !filter.types.includes('oshi') && !filter.types.includes('holomem');

  const hasAnyFilter =
    filter.searchText ||
    filter.types.length ||
    filter.colors.length ||
    filter.holomemSubtypes.length ||
    filter.supportSubtypes.length ||
    filter.limitedFilter !== null ||
    filter.sets.length;

  return (
    <div className="flex flex-col gap-2.5 p-3 bg-gray-900 border-b border-gray-800">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="카드 이름, 번호 검색..."
            value={filter.searchText}
            onChange={(e) => setFilter({ searchText: e.target.value })}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {hasAnyFilter ? (
          <button
            onClick={resetFilter}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
          >
            초기화
          </button>
        ) : null}
      </div>

      {/* 카드 타입 */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-500 shrink-0">타입:</span>
        {TYPES.map((t) => (
          <ToggleChip key={t} value={t} label={TYPE_LABELS[t]} active={filter.types.includes(t)} onToggle={toggleType} />
        ))}
      </div>

      {/* 색상 (오시/홀로멤) */}
      <div className={`flex flex-wrap gap-1.5 items-center transition-opacity ${colorDisabled ? 'opacity-30 pointer-events-none' : ''}`}>
        <span className="text-xs text-gray-500 shrink-0">색상:</span>
        {COLORS.map((c) => (
          <ToggleChip key={c} value={c} label={COLOR_LABELS[c]} active={filter.colors.includes(c)} onToggle={toggleColor} dot={COLOR_DOT[c]} />
        ))}
      </div>

      {/* 홀로멤 세부 분류 — 홀로멤 타입 선택 시에만 표시 */}
      {filter.types.includes('holomem') && (
        <div className="flex flex-wrap gap-1.5 items-center pl-2 border-l-2 border-emerald-700">
          <span className="text-xs text-gray-500 shrink-0">세부:</span>
          {HOLOMEM_SUBTYPES.map((s) => (
            <ToggleChip key={s} value={s} label={HOLOMEM_SUBTYPE_LABELS[s]} active={filter.holomemSubtypes.includes(s)} onToggle={toggleHolomemSubtype} />
          ))}
        </div>
      )}

      {/* 서포트 세부 분류 — 서포트 타입 선택 시에만 표시 */}
      {filter.types.includes('support') && (
        <div className="flex flex-wrap gap-1.5 items-center pl-2 border-l-2 border-sky-700">
          <span className="text-xs text-gray-500 shrink-0">세부:</span>
          {SUPPORT_SUBTYPES.map((s) => (
            <ToggleChip key={s} value={s} label={SUPPORT_SUBTYPE_LABELS[s]} active={filter.supportSubtypes.includes(s)} onToggle={toggleSupportSubtype} />
          ))}
          <span className="text-xs text-gray-600 mx-0.5">|</span>
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              onClick={() => toggleLimitedFilter(val)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter.limitedFilter === val
                  ? 'bg-rose-700 border-rose-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {val ? '리미티드' : '일반'}
            </button>
          ))}
        </div>
      )}

      {/* 세트 */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-gray-500 shrink-0">세트:</span>
        {[...SETS].sort((a, b) => a.id.localeCompare(b.id)).map((s) => (
          <ToggleChip key={s.id} value={s.id} label={s.id} active={filter.sets.includes(s.id)} onToggle={toggleSet} />
        ))}
      </div>
    </div>
  );
}
