import { supabase } from '../lib/supabase';
import type { DeckPost, CreatePostInput } from '../types/deckPost';
import { hashPassword } from '../utils/password';

const PAGE_SIZE = 20;

interface DbDeckPost {
  id: string;
  title: string;
  author: string;
  oshi_card_id: string;
  oshi_image_url: string | null;
  main_deck: Array<{ cardId: string; count: number; imageUrl?: string }>;
  cheers: Record<string, number>;
  is_award: boolean | null;
  tournament_name: string | null;
  recommend_count: number | null;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, title, author, oshi_card_id, oshi_image_url, main_deck, cheers, is_award, tournament_name, recommend_count, created_at';

function toDeckPost(row: DbDeckPost): DeckPost {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    oshiCardId: row.oshi_card_id,
    oshiImageUrl: row.oshi_image_url ?? undefined,
    mainDeck: row.main_deck ?? [],
    cheers: (row.cheers ?? {}) as DeckPost['cheers'],
    isAward: row.is_award ?? false,
    tournamentName: row.tournament_name ?? null,
    recommendCount: row.recommend_count ?? 0,
    createdAt: row.created_at,
  };
}

export interface ListPostsFilter {
  /** 오시 카드 ID 정확 일치 */
  oshiCardId?: string;
  /** 메인덱에 해당 cardId가 포함된 게시글 */
  containsCardId?: string;
  /** 입상덱만 표시 */
  awardOnly?: boolean;
  /** 정렬 기준 (기본: recent) */
  sort?: 'recent' | 'popular';
}

export interface ListPostsResult {
  posts: DeckPost[];
  total: number;
  pageSize: number;
}

/** 1-based 페이지 번호. 최신순 고정. */
export async function listDeckPosts(
  page: number,
  filter?: ListPostsFilter,
): Promise<ListPostsResult> {
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('deck_posts')
    .select(SELECT_COLUMNS, { count: 'exact' });

  if (filter?.oshiCardId) {
    query = query.eq('oshi_card_id', filter.oshiCardId);
  } else if (filter?.containsCardId) {
    // jsonb @> 연산자: main_deck 배열에 {cardId: X}를 포함하는 row 매칭.
    // postgrest-js의 .contains()는 배열 인자를 PG 배열 리터럴(cs.{...})로
    // 직렬화하므로 jsonb 배열엔 JSON 문자열을 넘겨 cs.<json> 분기를 태운다.
    query = query.contains(
      'main_deck',
      JSON.stringify([{ cardId: filter.containsCardId }]),
    );
  }

  if (filter?.awardOnly) {
    query = query.eq('is_award', true);
  }

  const sort = filter?.sort === 'popular' ? 'popular' : 'recent';
  let ordered = query;
  if (sort === 'popular') {
    ordered = ordered.order('recommend_count', { ascending: false });
  }
  ordered = ordered.order('created_at', { ascending: false });

  const { data, count, error } = await ordered.range(from, to);

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
      oshi_image_url: input.snapshot.oshiImageUrl ?? null,
      main_deck: input.snapshot.mainDeck,
      cheers: input.snapshot.cheers,
      is_award: input.isAward,
      tournament_name: input.tournamentName,
    })
    .select(SELECT_COLUMNS)
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

/** 추천 +1, 새 카운트 반환. */
export async function recommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'increment_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** 추천 -1 (0 이하로 내려가지 않음), 새 카운트 반환. */
export async function unrecommendDeckPost(postId: string): Promise<number> {
  const { data, error } = await supabase.rpc(
    'decrement_deck_post_recommends',
    { post_id: postId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

export { PAGE_SIZE };
