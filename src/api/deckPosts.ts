import { supabase } from '../lib/supabase';
import type { DeckPost, CreatePostInput } from '../types/deckPost';
import { hashPassword } from '../utils/password';

const PAGE_SIZE = 20;

interface DbDeckPost {
  id: string;
  title: string;
  author: string;
  oshi_card_id: string;
  main_deck: Array<{ cardId: string; count: number }>;
  cheers: Record<string, number>;
  created_at: string;
}

function toDeckPost(row: DbDeckPost): DeckPost {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    oshiCardId: row.oshi_card_id,
    mainDeck: row.main_deck ?? [],
    cheers: (row.cheers ?? {}) as DeckPost['cheers'],
    createdAt: row.created_at,
  };
}

export interface ListPostsResult {
  posts: DeckPost[];
  total: number;
  pageSize: number;
}

/** 1-based 페이지 번호. 최신순 고정. */
export async function listDeckPosts(page: number): Promise<ListPostsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from('deck_posts')
    .select('id, title, author, oshi_card_id, main_deck, cheers, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    posts: ((data as DbDeckPost[] | null) ?? []).map(toDeckPost),
    total: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

export async function createDeckPost(input: CreatePostInput): Promise<DeckPost> {
  const passwordHash = await hashPassword(input.password);

  const { data, error } = await supabase
    .from('deck_posts')
    .insert({
      title: input.title,
      author: input.author,
      password_hash: passwordHash,
      oshi_card_id: input.snapshot.oshiCardId,
      main_deck: input.snapshot.mainDeck,
      cheers: input.snapshot.cheers,
    })
    .select('id, title, author, oshi_card_id, main_deck, cheers, created_at')
    .single();

  if (error) throw error;
  return toDeckPost(data as DbDeckPost);
}

/**
 * RPC delete_deck_post(post_id, password) → boolean.
 * true: 삭제 성공. false: 비번 불일치 또는 글 없음.
 */
export async function deleteDeckPost(
  postId: string,
  password: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_deck_post', {
    post_id: postId,
    password,
  });
  if (error) throw error;
  return data === true;
}

export { PAGE_SIZE };
