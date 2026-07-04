-- ============================================================
-- withpaper/cfp 팀원 공개 모집 (schema.sql 이후 실행)
-- 공개(recruiting) 논문은 누구나 열람, 로그인 사용자는 셀프 조인 가능.
-- Supabase SQL Editor 에서 Run.
-- ============================================================

-- 1) 공개 모집 여부
alter table public.wp_papers add column if not exists recruiting boolean default false;

-- 2) 공개 논문은 비로그인 포함 누구나 SELECT (기존 소유자/팀원 정책과 OR)
--    ※ 본문(wp_sections)은 여전히 wp_can_access 로만 접근 → 참여 전엔 주제·초록만 공개
drop policy if exists wp_papers_public_select on public.wp_papers;
create policy wp_papers_public_select on public.wp_papers for select
  using (recruiting = true);

-- 3) 로그인 사용자는 공개 논문에 본인(user_id=auth.uid())으로 팀원 추가(셀프 조인)
drop policy if exists wp_members_self_join on public.wp_paper_members;
create policy wp_members_self_join on public.wp_paper_members for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.wp_papers p where p.id = paper_id and p.recruiting = true)
  );

create index if not exists wp_papers_recruiting_idx on public.wp_papers(recruiting) where recruiting = true;
