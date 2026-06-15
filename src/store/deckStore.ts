import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, CardColor, Deck, DeckEntry, FilterState } from '../types/card';
import { CARDS } from '../data/cards';

const MAIN_DECK_MAX = 50;
const CHEER_MAX = 20;

function generateId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyDeck(name = '새 덱'): Deck {
  return {
    id: generateId(),
    name,
    oshi: null,
    mainDeck: [],
    cheers: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function getCheerTotal(cheers: Partial<Record<CardColor, number>>): number {
  return Object.values(cheers).reduce((s, v) => s + (v ?? 0), 0);
}

function getCardCount(entries: DeckEntry[]): number {
  return entries.reduce((sum, e) => sum + e.count, 0);
}

/** 엔트리 식별자: 같은 cardId라도 imageUrl이 다르면 별개 엔트리로 취급. */
export function entryKey(cardId: string, imageUrl?: string): string {
  return `${cardId}::${imageUrl ?? ''}`;
}

function getEntryKey(entry: DeckEntry): string {
  return entryKey(entry.card.id, entry.imageUrl);
}

function totalCardCount(entries: DeckEntry[], cardId: string): number {
  return entries
    .filter((e) => e.card.id === cardId)
    .reduce((s, e) => s + e.count, 0);
}

const subtypeOrder: Record<string, number> = { debut: 0, '1st': 1, '2nd': 2, spot: 3 };
const supportOrder: Record<string, number> = { staff: 0, item: 1, event: 2, tool: 3, mascot: 4, fan: 5, '': 6 };

function compareEntries(a: DeckEntry, b: DeckEntry): number {
  const typeOrd = (t: string) => t === 'holomem' ? 0 : 1;
  if (typeOrd(a.card.type) !== typeOrd(b.card.type)) return typeOrd(a.card.type) - typeOrd(b.card.type);
  if (a.card.type === 'holomem') {
    const sa = subtypeOrder[a.card.holomemSubtype ?? ''] ?? 9;
    const sb = subtypeOrder[b.card.holomemSubtype ?? ''] ?? 9;
    if (sa !== sb) return sa - sb;
  } else {
    const sa = supportOrder[a.card.supportSubtype ?? ''] ?? 9;
    const sb = supportOrder[b.card.supportSubtype ?? ''] ?? 9;
    if (sa !== sb) return sa - sb;
  }
  const numCmp = a.card.cardNumber.localeCompare(b.card.cardNumber);
  if (numCmp !== 0) return numCmp;
  // 같은 cardId 내에서 imageUrl 별 엔트리는 url 알파벳 순으로 안정 정렬.
  return (a.imageUrl ?? '').localeCompare(b.imageUrl ?? '');
}

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  filter: FilterState;
  selectedCard: Card | null;

  createDeck: (name?: string) => void;
  /** snapshot으로 새 덱을 만들고 active로 설정. 누락 카드는 호출 측에서 미리 스킵. */
  createDeckFromSnapshot: (
    name: string,
    resolved: {
      oshi: Card | null;
      oshiImageUrl?: string;
      mainDeck: DeckEntry[];
      cheers: Partial<Record<CardColor, number>>;
    },
  ) => string;
  deleteDeck: (id: string) => void;
  renameDeck: (id: string, name: string) => void;
  setActiveDeck: (id: string) => void;

  setOshi: (card: Card) => void;
  /** card + imageUrl 조합으로 1장 추가. 같은 cardId 내 총합이 limit 이하일 때만. */
  addCard: (card: Card, imageUrl?: string) => void;
  /** card + imageUrl 조합 엔트리에서 1장 제거. 0이면 엔트리 삭제. */
  removeCard: (card: Card, imageUrl?: string) => void;
  /** 오시 카드의 일러스트 URL 설정. null이면 기본으로 복원. */
  setOshiImage: (imageUrl: string | null) => void;
  /** 메인덱 엔트리의 일러스트를 통째로 변경 (모든 사본에 적용).
   *  대상 imageUrl이 다른 엔트리에 이미 있으면 합쳐진다. */
  setEntryImage: (
    cardId: string,
    fromImageUrl: string | undefined,
    toImageUrl: string | undefined,
  ) => void;
  /** 엔트리에서 1장만 다른 일러스트로 분리. */
  splitEntryImage: (
    cardId: string,
    fromImageUrl: string | undefined,
    toImageUrl: string | undefined,
  ) => void;
  addCheer: (color: CardColor) => void;
  removeCheer: (color: CardColor) => void;
  clearDeck: () => void;
  clearCheers: () => void;
  fillCheers: () => void;

  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  setSelectedCard: (card: Card | null) => void;

  /** 엔트리 composite key 기반 (cardId::imageUrl?). */
  reorderMainDeck: (draggedKey: string, targetKey: string, before: boolean) => void;
  swapMainDeckEntries: (key1: string, key2: string) => void;
  sortMainDeckDefault: () => void;

  exportDeckText: () => string;

  getActiveDeck: () => Deck | null;
  getMainDeckCount: () => number;
  getDeckErrors: () => string[];
}

const defaultFilter: FilterState = {
  searchText: '',
  searchScope: 'all',
  types: [],
  colors: [],
  holomemSubtypes: [],
  holomemAbilities: [],
  buzzOnly: false,
  supportSubtypes: [],
  limitedFilter: null,
  tags: [],
  tagFilterMode: 'or',
  sets: [],
};

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      decks: [createEmptyDeck('My First Deck')],
      activeDeckId: null,
      filter: defaultFilter,
      selectedCard: null,

      createDeck: (name = '새 덱') => {
        const deck = createEmptyDeck(name);
        set((s) => ({ decks: [...s.decks, deck], activeDeckId: deck.id }));
      },

      createDeckFromSnapshot: (name, resolved) => {
        const deck: Deck = {
          ...createEmptyDeck(name),
          oshi: resolved.oshi,
          oshiImageUrl: resolved.oshiImageUrl,
          mainDeck: resolved.mainDeck.map((e) => ({ ...e })),
          cheers: { ...resolved.cheers },
        };
        set((s) => ({ decks: [...s.decks, deck], activeDeckId: deck.id }));
        return deck.id;
      },

      deleteDeck: (id) => {
        set((s) => {
          const decks = s.decks.filter((d) => d.id !== id);
          const activeDeckId =
            s.activeDeckId === id ? (decks[0]?.id ?? null) : s.activeDeckId;
          return { decks, activeDeckId };
        });
      },

      renameDeck: (id, name) => {
        set((s) => ({
          decks: s.decks.map((d) =>
            d.id === id ? { ...d, name, updatedAt: Date.now() } : d
          ),
        }));
      },

      setActiveDeck: (id) => set({ activeDeckId: id }),

      setOshi: (card) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          return {
            decks: s.decks.map((d) => {
              if (d.id !== id) return d;
              // 오시 카드가 바뀌면 이전 오시 일러스트 선택은 무효화.
              const sameOshi = d.oshi?.id === card.id;
              return {
                ...d,
                oshi: card,
                oshiImageUrl: sameOshi ? d.oshiImageUrl : undefined,
                updatedAt: Date.now(),
              };
            }),
          };
        });
      },

      addCard: (card, imageUrl) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const activeDeck = s.decks.find((d) => d.id === id);
          if (!activeDeck) return s;

          const entries = activeDeck.mainDeck;
          const cardLimit = card.limit ?? 4;
          // 같은 cardId 모든 엔트리(다른 일러스트 포함)의 합계로 limit 검사
          if (totalCardCount(entries, card.id) >= cardLimit) return s;

          const targetKey = entryKey(card.id, imageUrl);
          const existing = entries.find((e) => getEntryKey(e) === targetKey);

          let newEntries: DeckEntry[];
          if (existing) {
            newEntries = entries.map((e) =>
              getEntryKey(e) === targetKey ? { ...e, count: e.count + 1 } : e
            );
          } else {
            const newEntry: DeckEntry = { card, count: 1, imageUrl };
            const insertIdx = entries.findIndex(
              (e) => compareEntries(newEntry, e) < 0
            );
            newEntries = [...entries];
            if (insertIdx === -1) {
              newEntries.push(newEntry);
            } else {
              newEntries.splice(insertIdx, 0, newEntry);
            }
          }

          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? { ...d, mainDeck: newEntries, updatedAt: Date.now() }
                : d
            ),
          };
        });
      },

      removeCard: (card, imageUrl) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const activeDeck = s.decks.find((d) => d.id === id);
          if (!activeDeck) return s;

          const targetKey = entryKey(card.id, imageUrl);
          const newEntries = activeDeck.mainDeck
            .map((e) =>
              getEntryKey(e) === targetKey ? { ...e, count: e.count - 1 } : e
            )
            .filter((e) => e.count > 0);

          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? { ...d, mainDeck: newEntries, updatedAt: Date.now() }
                : d
            ),
          };
        });
      },

      setOshiImage: (imageUrl) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? {
                    ...d,
                    oshiImageUrl: imageUrl ?? undefined,
                    updatedAt: Date.now(),
                  }
                : d
            ),
          };
        });
      },

      setEntryImage: (cardId, fromImageUrl, toImageUrl) => {
        if (fromImageUrl === toImageUrl) return;
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const fromKey = entryKey(cardId, fromImageUrl);
          const toKey = entryKey(cardId, toImageUrl);
          const fromIdx = deck.mainDeck.findIndex(
            (e) => getEntryKey(e) === fromKey
          );
          if (fromIdx < 0) return s;
          const fromEntry = deck.mainDeck[fromIdx];
          // 이미 toImageUrl 엔트리가 있으면 합치기, 없으면 imageUrl만 변경
          const existingTo = deck.mainDeck.find(
            (e) => getEntryKey(e) === toKey
          );
          let mainDeck: DeckEntry[];
          if (existingTo) {
            // from 제거, to에 count 합산
            mainDeck = deck.mainDeck
              .map((e) =>
                getEntryKey(e) === toKey
                  ? { ...e, count: e.count + fromEntry.count }
                  : e
              )
              .filter((e) => getEntryKey(e) !== fromKey);
          } else {
            mainDeck = deck.mainDeck.map((e, i) =>
              i === fromIdx ? { ...e, imageUrl: toImageUrl } : e
            );
          }
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      splitEntryImage: (cardId, fromImageUrl, toImageUrl) => {
        if (fromImageUrl === toImageUrl) return;
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const fromKey = entryKey(cardId, fromImageUrl);
          const toKey = entryKey(cardId, toImageUrl);
          const fromIdx = deck.mainDeck.findIndex(
            (e) => getEntryKey(e) === fromKey
          );
          if (fromIdx < 0) return s;
          const fromEntry = deck.mainDeck[fromIdx];
          if (fromEntry.count <= 1) {
            // 1장만 남았으면 split 대신 통째로 이동 (= setEntryImage 동작)
            const existingTo = deck.mainDeck.find(
              (e) => getEntryKey(e) === toKey
            );
            const mainDeck = existingTo
              ? deck.mainDeck
                  .map((e) =>
                    getEntryKey(e) === toKey
                      ? { ...e, count: e.count + 1 }
                      : e
                  )
                  .filter((e) => getEntryKey(e) !== fromKey)
              : deck.mainDeck.map((e, i) =>
                  i === fromIdx ? { ...e, imageUrl: toImageUrl } : e
                );
            return {
              decks: s.decks.map((d) =>
                d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d
              ),
            };
          }

          // count > 1: from에서 1장 빼고 to에 1장 추가
          const existingTo = deck.mainDeck.find(
            (e) => getEntryKey(e) === toKey
          );
          let mainDeck: DeckEntry[];
          if (existingTo) {
            mainDeck = deck.mainDeck.map((e) => {
              const k = getEntryKey(e);
              if (k === fromKey) return { ...e, count: e.count - 1 };
              if (k === toKey) return { ...e, count: e.count + 1 };
              return e;
            });
          } else {
            const newEntry: DeckEntry = {
              card: fromEntry.card,
              count: 1,
              imageUrl: toImageUrl,
            };
            mainDeck = deck.mainDeck.map((e) =>
              getEntryKey(e) === fromKey ? { ...e, count: e.count - 1 } : e
            );
            // 같은 카드 그룹 내에 새 엔트리 삽입 (정렬 기준)
            const insertIdx = mainDeck.findIndex(
              (e) => compareEntries(newEntry, e) < 0
            );
            if (insertIdx === -1) mainDeck.push(newEntry);
            else mainDeck.splice(insertIdx, 0, newEntry);
          }
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      addCheer: (color) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const cheers = deck.cheers ?? {};
          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? { ...d, cheers: { ...cheers, [color]: (cheers[color] ?? 0) + 1 }, updatedAt: Date.now() }
                : d
            ),
          };
        });
      },

      removeCheer: (color) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const cheers = deck.cheers ?? {};
          const cur = cheers[color] ?? 0;
          if (cur <= 0) return s;
          const next = cur - 1;
          const newCheers = { ...cheers, [color]: next };
          if (next === 0) delete newCheers[color];
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, cheers: newCheers, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      clearDeck: () => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? {
                    ...d,
                    oshi: null,
                    oshiImageUrl: undefined,
                    mainDeck: [],
                    cheers: {},
                    updatedAt: Date.now(),
                  }
                : d
            ),
          };
        });
      },

      reorderMainDeck: (draggedKey, targetKey, before) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck];
          const fromIdx = mainDeck.findIndex((e) => getEntryKey(e) === draggedKey);
          const toIdx = mainDeck.findIndex((e) => getEntryKey(e) === targetKey);
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return s;
          const [moved] = mainDeck.splice(fromIdx, 1);
          const adjustedToIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
          mainDeck.splice(before ? adjustedToIdx : adjustedToIdx + 1, 0, moved);
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      swapMainDeckEntries: (key1, key2) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck];
          const i1 = mainDeck.findIndex((e) => getEntryKey(e) === key1);
          const i2 = mainDeck.findIndex((e) => getEntryKey(e) === key2);
          if (i1 === -1 || i2 === -1) return s;
          [mainDeck[i1], mainDeck[i2]] = [mainDeck[i2], mainDeck[i1]];
          return { decks: s.decks.map((d) => d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d) };
        });
      },

      sortMainDeckDefault: () => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck].sort(compareEntries);
          return { decks: s.decks.map((d) => d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d) };
        });
      },

      clearCheers: () => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, cheers: {}, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      fillCheers: () => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck || !deck.oshi) return s;
          const oshiColors = deck.oshi.color ?? [];
          if (oshiColors.length === 0) return s;
          const perColor = Math.floor(CHEER_MAX / oshiColors.length);
          const remainder = CHEER_MAX % oshiColors.length;
          const cheers: Partial<Record<CardColor, number>> = {};
          oshiColors.forEach((c, i) => {
            cheers[c] = perColor + (i < remainder ? 1 : 0);
          });
          return {
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, cheers, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      setFilter: (partial) => {
        set((s) => ({ filter: { ...s.filter, ...partial } }));
      },

      resetFilter: () => set({ filter: defaultFilter }),

      setSelectedCard: (card) => set({ selectedCard: card }),

      exportDeckText: () => {
        const deck = get().getActiveDeck();
        if (!deck) return '';
        const COLOR_KO: Record<string, string> = {
          white: '백', green: '녹', red: '적', blue: '청', purple: '자', yellow: '황',
        };
        const lines: string[] = [`# ${deck.name}`];
        if (deck.oshi) {
          lines.push(`\n## 오시\n${deck.oshi.cardNumber} ${deck.oshi.name}`);
        }
        if (deck.mainDeck.length > 0) {
          lines.push('\n## 메인 덱');
          deck.mainDeck.forEach((e) => {
            lines.push(`${e.card.cardNumber} ${e.card.name} x${e.count}`);
          });
        }
        const cheers = deck.cheers ?? {};
        const cheerTotal = getCheerTotal(cheers);
        if (cheerTotal > 0) {
          lines.push('\n## 엘 덱');
          Object.entries(cheers).forEach(([color, count]) => {
            lines.push(`${COLOR_KO[color] ?? color} x${count}`);
          });
        }
        return lines.join('\n');
      },

      getActiveDeck: () => {
        const s = get();
        const id = s.activeDeckId ?? s.decks[0]?.id;
        return s.decks.find((d) => d.id === id) ?? null;
      },

      getMainDeckCount: () => {
        const deck = get().getActiveDeck();
        return deck ? getCardCount(deck.mainDeck) : 0;
      },

      getDeckErrors: () => {
        const deck = get().getActiveDeck();
        if (!deck) return [];
        const errors: string[] = [];
        if (!deck.oshi) errors.push('오시 카드가 없습니다.');
        const main = getCardCount(deck.mainDeck);
        if (main < MAIN_DECK_MAX) errors.push(`메인 덱: ${main}/${MAIN_DECK_MAX}장`);
        if (main > MAIN_DECK_MAX) errors.push(`메인 덱 초과: ${main}/${MAIN_DECK_MAX}장`);
        const cheerTotal = getCheerTotal(deck.cheers ?? {});
        if (cheerTotal > CHEER_MAX) errors.push(`엘 덱 초과: ${cheerTotal}/${CHEER_MAX}장`);
        // 금지/제한 규칙: 같은 카드 합계가 해당 카드 limit를 초과하면 위반
        const countByCard = new Map<string, { count: number; fallback?: number }>();
        for (const e of deck.mainDeck) {
          const prev = countByCard.get(e.card.id);
          countByCard.set(e.card.id, {
            count: (prev?.count ?? 0) + e.count,
            fallback: prev?.fallback ?? e.card.limit,
          });
        }
        const hasLimitViolation = [...countByCard.entries()].some(([id, info]) => {
          const lim = CARDS.find((c) => c.id === id)?.limit ?? info.fallback ?? 4;
          return info.count > lim;
        });
        if (hasLimitViolation) errors.push('금지/제한 규칙에 적합하지 않습니다');
        return errors;
      },
    }),
    {
      name: 'holo-deck-store',
      // filter도 저장해 새로고침 후 검색/필터 상태 유지. selectedCard는 일시적 상태라 제외.
      partialize: (s) => ({
        decks: s.decks,
        activeDeckId: s.activeDeckId,
        filter: s.filter,
      }),
      // 저장된 filter에 누락 필드가 있어도(추후 스키마 확장 대비) defaultFilter로 채운다.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DeckState>;
        return {
          ...current,
          ...p,
          filter: { ...defaultFilter, ...(p.filter ?? {}) },
        };
      },
    }
  )
);
