-- ============================================================
-- withpaper/cfp 팀원 공개 모집 + 참여 신청 (schema.sql 이후 실행)
-- 공개(recruiting) 논문은 누구나 열람 · 신청은 주저자가 승인.
-- Supabase SQL Editor 에서 Run.
-- ============================================================

-- 1) 공개 모집 여부
alter table public.wp_papers add column if not exists recruiting boolean default false;

-- 2) 공개 논문은 비로그인 포함 누구나 SELECT (기존 소유자/팀원 정책과 OR)
--    ※ 본문(wp_sections)은 여전히 wp_can_access 로만 접근 → 참여 전엔 주제·초록만 공개
drop policy if exists wp_papers_public_select on public.wp_papers;
create policy wp_papers_public_select on public.wp_papers for select
  using (recruiting = true);

-- (구버전 셀프 조인 정책 제거 — 이제 주저자 승인 방식)
drop policy if exists wp_members_self_join on public.wp_paper_members;

create index if not exists wp_papers_recruiting_idx on public.wp_papers(recruiting) where recruiting = true;

-- 3) 참여 신청 테이블
create table if not exists public.wp_applications (
  id             uuid primary key default gen_random_uuid(),
  paper_id       uuid not null references public.wp_papers(id) on delete cascade,
  applicant_id   uuid references auth.users(id) on delete cascade,
  applicant_name text,
  applicant_email text,
  message        text,
  status         text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at     timestamptz not null default now()
);
create index if not exists wp_applications_paper_idx on public.wp_applications(paper_id);

alter table public.wp_applications enable row level security;

-- 신청 등록: 로그인 사용자가 공개 논문에 본인 명의로
drop policy if exists wp_app_insert on public.wp_applications;
create policy wp_app_insert on public.wp_applications for insert
  with check (
    applicant_id = auth.uid()
    and exists (select 1 from public.wp_papers p where p.id = paper_id and p.recruiting = true)
  );

-- 조회: 신청자 본인 또는 해당 논문 주저자(소유자)
drop policy if exists wp_app_select on public.wp_applications;
create policy wp_app_select on public.wp_applications for select
  using (
    applicant_id = auth.uid()
    or exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid())
  );

-- 수락/거절(상태 변경): 논문 주저자만
drop policy if exists wp_app_update on public.wp_applications;
create policy wp_app_update on public.wp_applications for update
  using (exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid()));
