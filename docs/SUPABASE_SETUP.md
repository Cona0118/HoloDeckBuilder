# Supabase 셋업 가이드

덱 공유 게시판을 사용하려면 Supabase 프로젝트가 필요합니다.

## 1. 프로젝트 생성
1. https://supabase.com 접속 → Sign in → New project
2. Region은 `Northeast Asia (Seoul)` 권장
3. DB password는 안전하게 보관

## 2. SQL 실행 (SQL Editor → + New query)

```sql
create extension if not exists pgcrypto;

create table deck_posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text not null default '익명',
  password_hash   text not null,
  oshi_card_id    text not null,
  main_deck       jsonb not null,
  cheers          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index deck_posts_created_at_idx on deck_posts (created_at desc);

alter table deck_posts enable row level security;

create policy "deck_posts_select_all"
  on deck_posts for select
  to anon, authenticated
  using (true);

create policy "deck_posts_insert_all"
  on deck_posts for insert
  to anon, authenticated
  with check (true);

-- DELETE / UPDATE 정책 없음 → RLS에 의해 차단

revoke select (password_hash) on deck_posts from anon, authenticated;

create or replace function delete_deck_post(post_id uuid, password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_hash text;
begin
  select password_hash into stored_hash from deck_posts where id = post_id;
  if stored_hash is null then return false; end if;
  if crypt(password, stored_hash) = stored_hash then
    delete from deck_posts where id = post_id;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function delete_deck_post(uuid, text) to anon, authenticated;
```

## 3. 환경변수
1. Project Settings → API
2. `Project URL` → `.env.local`의 `VITE_SUPABASE_URL`
3. `anon public` key → `.env.local`의 `VITE_SUPABASE_ANON_KEY`
4. 프로젝트 루트의 `.env.local.example`을 복사해서 `.env.local`을 만든 뒤 위 값 입력

## 4. 검증
- 개발 서버 재시작 (`npm run dev`)
- 브라우저 콘솔에 supabase 관련 경고가 없으면 OK
