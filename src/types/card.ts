export type CardType = 'oshi' | 'holomem' | 'support';

// Oshi와 Holomem만 색상 보유
export type CardColor = 'white' | 'green' | 'red' | 'blue' | 'purple' | 'yellow';

export type HolomemSubtype = 'debut' | '1st' | '2nd' | 'spot';

export type SupportSubtype = 'event' | 'fan' | 'mascot' | 'tool' | 'item' | 'staff' | '';

export type CostColor = 'white' | 'green' | 'red' | 'blue' | 'purple' | 'yellow' | 'colorless';

export interface CardAbility {
  name: string;
  cost?: CostColor[];     // 코스트 색상 배열 (이미지로 표시)
  description: string;
  timing?: string;         // bloom, collab, gift 등
  damage?: number;         // 아츠 데미지
  specialDamage?: { color: CardColor; value: number };  // 특공 (색 + 데미지)
}

export interface OshiAbility {
  name: string;
  cost?: string;           // "홀로 파워 -N" 형태
  description: string;
}

export interface Card {
  id: string;
  name: string;
  nameJp?: string;
  keywords?: string[];     // 검색 전용 별칭 (UI 미노출)
  type: CardType;
  color?: CardColor[];        // Oshi / Holomem만 색상 보유
  setId: string;
  cardNumber: string;
  imageUrl?: string;

  // Holomem
  hp?: number;
  holomemSubtype?: HolomemSubtype;
  batonPass?: number;           // 바톤터치 비용 (컬러리스 옐 수)
  extraRule?: string;           // 엑스트라 룰 텍스트
  tags?: string[];
  abilities?: CardAbility[];

  // Oshi
  life?: number;
  oshiStageAbility?: OshiAbility;  // 오시 스테이지 스킬
  oshiAbility?: OshiAbility;
  spAbility?: OshiAbility;

  // Support
  supportSubtype?: SupportSubtype;
  limited?: boolean;

  limit?: number;
  restricted?: string;          // 제한카드 표시 (예: "2025.04.21~")
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
  buzzOnly: boolean;                 // true=버즈(1st)만 필터
  supportSubtypes: SupportSubtype[];
  limitedFilter: boolean | null;  // null=전체, true=리미티드만, false=일반만
  tags: string[];
  tagFilterMode: 'and' | 'or';
  sets: string[];
}
