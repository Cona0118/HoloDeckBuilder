import type { CardColor } from './card';

/** 등록 시점에 직렬화한 덱 스냅샷. 카드 메타는 클라이언트 CARDS와 join. */
export interface DeckSnapshot {
  oshiCardId: string;
  /** 메인덱: 등록 순서대로 [{cardId, count}] */
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
}

/** Supabase에서 받아온 게시글 (password_hash 컬럼 제외) */
export interface DeckPost {
  id: string;
  title: string;
  author: string;
  oshiCardId: string;
  mainDeck: Array<{ cardId: string; count: number }>;
  cheers: Partial<Record<CardColor, number>>;
  createdAt: string;
}

export interface CreatePostInput {
  title: string;
  author: string;
  password: string;
  snapshot: DeckSnapshot;
}
