export type CardType = 'oshi' | 'holomem' | 'support';

// Oshi와 Holomem만 색상 보유
export type CardColor = 'white' | 'green' | 'red' | 'blue' | 'purple' | 'yellow';

export type HolomemSubtype = 'debut' | '1st' | '2nd' | 'spot';

export type SupportSubtype = 'event' | 'fan' | 'mascot' | 'tool' | 'item' | 'staff' | '';

export interface CardAbility {
  name: string;
  cost?: string;
  description: string;
  timing?: string;
}

export interface Card {
  id: string;
  name: string;
  nameJp?: string;
  type: CardType;
  color?: CardColor[];        // Oshi / Holomem만 색상 보유
  setId: string;
  cardNumber: string;
  imageUrl?: string;

  // Holomem
  hp?: number;
  holomemSubtype?: HolomemSubtype;
  tags?: string[];
  abilities?: CardAbility[];

  // Oshi
  oshiAbility?: CardAbility;
  spAbility?: CardAbility;

  // Support
  supportSubtype?: SupportSubtype;
  limited?: boolean;

  limit?: number;
}

export interface DeckEntry {
  card: Card;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  oshi: Card | null;
  mainDeck: DeckEntry[];
  cheers: Partial<Record<CardColor, number>>;
  createdAt: number;
  updatedAt: number;
}

export interface FilterState {
  searchText: string;
  types: CardType[];
  colors: CardColor[];
  holomemSubtypes: HolomemSubtype[];
  supportSubtypes: SupportSubtype[];
  limitedFilter: boolean | null;  // null=전체, true=리미티드만, false=일반만
  tags: string[];
  sets: string[];
}
