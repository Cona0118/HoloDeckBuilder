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

  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;

  setSelectedCard: (card: Card | null) => void;

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
          if (getCardCount(entries) >= MAIN_DECK_MAX) return s;

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
          if (getCheerTotal(cheers) >= CHEER_MAX) return s;
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
        if (main !== MAIN_DECK_MAX) errors.push(`메인 덱: ${main}/${MAIN_DECK_MAX}장`);
        return errors;
      },
    }),
    {
      name: 'holo-deck-store',
      partialize: (s) => ({ decks: s.decks, activeDeckId: s.activeDeckId }),
    }
  )
);
