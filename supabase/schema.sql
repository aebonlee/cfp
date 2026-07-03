-- ============================================================
-- withpaper 스키마 (공유 Supabase 프로젝트 · 접두사 wp_)
-- 실행: Supabase SQL Editor 에 붙여넣고 Run
--
-- ⚠️ 주의: 이 프로젝트는 111+ 사이트가 공유하는 단일 auth 풀이다.
--   auth.users 에 트리거를 절대 걸지 않는다(과거 search_path 미고정
--   트리거가 전체 회원가입을 마비시킨 사고 있음). 사용자 식별은
--   RLS 의 auth.uid() 로만 처리한다.
-- ============================================================

-- 확장(있으면 통과)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- 1) 논문 프로젝트
-- ----------------------------------------------------------------
create table if not exists public.wp_papers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  title_en    text,
  cluster     text default '직접 등록',
  lang        text not null default 'ko' check (lang in ('ko','en')),
  format      text not null default 'kci' check (format in ('kci','imrad')),
  summary     text default '',
  keywords    text[] default '{}',
  method      text,
  status      text not null default 'topic'
              check (status in ('topic','team','writing','review','ready','published')),
  seed        boolean default false,
  source_file text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 2) 팀원 (사람 + AI)
-- ----------------------------------------------------------------
create table if not exists public.wp_paper_members (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid not null references public.wp_papers(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,  -- AI/미가입 초대는 null
  type       text not null default 'human' check (type in ('human','ai')),
  role       text not null
             check (role in ('first_author','corresponding','coauthor','ai_writer','ai_reviewer','ai_editor')),
  name       text not null default '',
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists wp_members_paper_idx on public.wp_paper_members(paper_id);

-- ----------------------------------------------------------------
-- 3) 섹션 (초록/서론/…/참고문헌)
-- ----------------------------------------------------------------
create table if not exists public.wp_sections (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid not null references public.wp_papers(id) on delete cascade,
  kind       text not null,           -- abstract, intro, method ...
  title      text not null,
  ord        int  not null default 0,
  content    text default '',
  assignee   uuid references public.wp_paper_members(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists wp_sections_paper_idx on public.wp_sections(paper_id);

-- ----------------------------------------------------------------
-- 4) 코멘트
-- ----------------------------------------------------------------
create table if not exists public.wp_comments (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid not null references public.wp_papers(id) on delete cascade,
  section_id uuid references public.wp_sections(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  resolved   boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists wp_comments_paper_idx on public.wp_comments(paper_id);

-- ----------------------------------------------------------------
-- 5) 참고문헌
-- ----------------------------------------------------------------
create table if not exists public.wp_references (
  id           uuid primary key default gen_random_uuid(),
  paper_id     uuid not null references public.wp_papers(id) on delete cascade,
  citation_key text,
  apa          text,
  bibtex       text,
  meta         jsonb default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists wp_references_paper_idx on public.wp_references(paper_id);

-- ----------------------------------------------------------------
-- 6) AI 실행 로그 (Claude 호출 기록)
-- ----------------------------------------------------------------
create table if not exists public.wp_ai_runs (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid references public.wp_papers(id) on delete cascade,
  section_id uuid references public.wp_sections(id) on delete set null,
  role       text,                    -- ai_writer / ai_reviewer / ai_editor
  prompt     text,
  output     text,
  model      text,
  tokens     int,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS: 소유자(owner) 또는 팀원(user_id)만 접근
-- ============================================================
alter table public.wp_papers        enable row level security;
alter table public.wp_paper_members enable row level security;
alter table public.wp_sections      enable row level security;
alter table public.wp_comments      enable row level security;
alter table public.wp_references    enable row level security;
alter table public.wp_ai_runs       enable row level security;

-- 접근 권한 판정 함수 (search_path 고정 필수)
create or replace function public.wp_can_access(p_paper uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wp_papers p where p.id = p_paper and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.wp_paper_members m where m.paper_id = p_paper and m.user_id = auth.uid()
  );
$$;

-- wp_papers
drop policy if exists wp_papers_select on public.wp_papers;
create policy wp_papers_select on public.wp_papers for select
  using (owner_id = auth.uid() or public.wp_can_access(id));
drop policy if exists wp_papers_insert on public.wp_papers;
create policy wp_papers_insert on public.wp_papers for insert
  with check (owner_id = auth.uid());
drop policy if exists wp_papers_update on public.wp_papers;
create policy wp_papers_update on public.wp_papers for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists wp_papers_delete on public.wp_papers;
create policy wp_papers_delete on public.wp_papers for delete
  using (owner_id = auth.uid());

-- 하위 테이블 공통: 해당 논문 접근 권한이 있으면 CRUD 허용
do $$
declare t text;
begin
  foreach t in array array['wp_paper_members','wp_sections','wp_comments','wp_references','wp_ai_runs']
  loop
    execute format('drop policy if exists %I_all on public.%I;', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (public.wp_can_access(paper_id)) with check (public.wp_can_access(paper_id));',
      t, t);
  end loop;
end $$;

-- updated_at 자동 갱신
create or replace function public.wp_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists wp_papers_touch on public.wp_papers;
create trigger wp_papers_touch before update on public.wp_papers
  for each row execute function public.wp_touch_updated_at();

drop trigger if exists wp_sections_touch on public.wp_sections;
create trigger wp_sections_touch before update on public.wp_sections
  for each row execute function public.wp_touch_updated_at();
