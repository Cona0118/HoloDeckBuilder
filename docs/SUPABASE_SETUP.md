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

## 4. 마이그레이션: 입상덱 컬럼 추가

이미 `deck_posts` 테이블이 만들어져 있는 경우, 입상덱 정보를 담을 컬럼을 추가하기 위해 SQL Editor에서 다음을 한 번 더 실행:

```sql
alter table deck_posts
  add column if not exists is_award boolean not null default false,
  add column if not exists tournament_name text;
```

신규 프로젝트라면 `2.` 단계에 이 두 컬럼을 추가해서 한 번에 만들어도 무방.

## 5. 마이그레이션: bcrypt 해시 prefix 정규화

`bcryptjs` 3.x는 기본적으로 `$2b$` prefix 해시를 만들지만, Supabase의 `pgcrypto.crypt()`는 `$2a$` prefix만 인식합니다. 이 때문에 비밀번호가 맞아도 `delete_deck_post` RPC가 항상 false를 반환해 삭제가 실패합니다. 이미 저장된 `$2b$`/`$2y$` 해시를 `$2a$`로 한 번 변환하세요 (표준 ASCII 비번에선 알고리즘이 동일하므로 검증 결과가 동일):

```sql
update deck_posts
set password_hash = '$2a$' || substring(password_hash from 5)
where password_hash like '$2b$%' or password_hash like '$2y$%';
```

신규 게시글은 클라이언트가 자동으로 `$2a$`로 저장하므로 이 마이그레이션은 일회성입니다.

## 6. 검증
- 개발 서버 재시작 (`npm run dev`)
- 브라우저 콘솔에 supabase 관련 경고가 없으면 OK
