import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, CardColor, Deck, DeckEntry, FilterState } from '../types/card';

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

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  filter: FilterState;
  selectedCard: Card | null;

  createDeck: (name?: string) => void;
  deleteDeck: (id: string) => void;
  renameDeck: (id: string, name: string) => void;
  setActiveDeck: (id: string) => void;

  setOshi: (card: Card) => void;
  addCard: (card: Card) => void;
  removeCard: (card: Card) => void;
  addCheer: (color: CardColor) => void;
  removeCheer: (color: CardColor) => void;
  clearDeck: () => void;
  clearCheers: () => void;

  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  setSelectedCard: (card: Card | null) => void;

  reorderMainDeck: (draggedId: string, targetId: string, before: boolean) => void;
  swapMainDeckEntries: (id1: string, id2: string) => void;
  sortMainDeckDefault: () => void;

  exportDeckText: () => string;

  getActiveDeck: () => Deck | null;
  getMainDeckCount: () => number;
  getDeckErrors: () => string[];
}

const defaultFilter: FilterState = {
  searchText: '',
  types: [],
  colors: [],
  holomemSubtypes: [],
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
            decks: s.decks.map((d) =>
              d.id === id ? { ...d, oshi: card, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      addCard: (card) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const activeDeck = s.decks.find((d) => d.id === id);
          if (!activeDeck) return s;

          const entries = activeDeck.mainDeck;
          const cardLimit = card.limit ?? 4;
          const existing = entries.find((e) => e.card.id === card.id);
          if (existing && existing.count >= cardLimit) return s;

          const newEntries = existing
            ? entries.map((e) =>
                e.card.id === card.id ? { ...e, count: e.count + 1 } : e
              )
            : [...entries, { card, count: 1 }];

          return {
            decks: s.decks.map((d) =>
              d.id === id
                ? { ...d, mainDeck: newEntries, updatedAt: Date.now() }
                : d
            ),
          };
        });
      },

      removeCard: (card) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const activeDeck = s.decks.find((d) => d.id === id);
          if (!activeDeck) return s;

          const newEntries = activeDeck.mainDeck
            .map((e) =>
              e.card.id === card.id ? { ...e, count: e.count - 1 } : e
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
              d.id === id ? { ...d, oshi: null, mainDeck: [], cheers: {}, updatedAt: Date.now() } : d
            ),
          };
        });
      },

      reorderMainDeck: (draggedId, targetId, before) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck];
          const fromIdx = mainDeck.findIndex((e) => e.card.id === draggedId);
          const toIdx = mainDeck.findIndex((e) => e.card.id === targetId);
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

      swapMainDeckEntries: (id1, id2) => {
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck];
          const i1 = mainDeck.findIndex((e) => e.card.id === id1);
          const i2 = mainDeck.findIndex((e) => e.card.id === id2);
          if (i1 === -1 || i2 === -1) return s;
          [mainDeck[i1], mainDeck[i2]] = [mainDeck[i2], mainDeck[i1]];
          return { decks: s.decks.map((d) => d.id === id ? { ...d, mainDeck, updatedAt: Date.now() } : d) };
        });
      },

      sortMainDeckDefault: () => {
        const subtypeOrder: Record<string, number> = { debut: 0, '1st': 1, '2nd': 2, spot: 3 };
        const supportOrder: Record<string, number> = { event: 0, limited: 1, fan: 2, mascot: 3, tool: 4, item: 5, staff: 6, '': 7 };
        set((s) => {
          const id = s.activeDeckId ?? s.decks[0]?.id;
          const deck = s.decks.find((d) => d.id === id);
          if (!deck) return s;
          const mainDeck = [...deck.mainDeck].sort((a, b) => {
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
            return a.card.name.localeCompare(b.card.name, 'ko');
          });
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
        return errors;
      },
    }),
    {
      name: 'holo-deck-store',
      partialize: (s) => ({ decks: s.decks, activeDeckId: s.activeDeckId }),
    }
  )
);
