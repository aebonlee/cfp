-- ============================================================
-- cfp 기능 추가 스키마 (schema-recruit.sql 이후 실행)
--   ① 신청 거절 사유       : wp_applications.reject_reason
--   ② 지원자 신청 철회      : wp_applications DELETE RLS 정책
--   ③ 목표 저널·투고 마감일 : wp_papers.target_journal / deadline
-- Supabase SQL Editor 에서 Run.
-- ============================================================

-- ① 거절 사유
alter table public.wp_applications add column if not exists reject_reason text;

-- ② 지원자가 '대기중'인 자기 신청을 철회(삭제)할 수 있도록.
--    (주저자는 논문 소유자로서 언제든 삭제 가능)
drop policy if exists wp_app_delete on public.wp_applications;
create policy wp_app_delete on public.wp_applications for delete
  using (
    (applicant_id = auth.uid() and status = 'pending')
    or exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid())
  );

-- ③ 목표 학술지 + 투고 마감일
alter table public.wp_papers add column if not exists target_journal text;
alter table public.wp_papers add column if not exists deadline date;

-- ============================================================
-- (선택·하드닝) 역할별 권한 분리를 DB 레벨에서도 강제하려면:
--   팀원 추가/변경/삭제를 '소유자'만 허용하도록 wp_paper_members 정책을 좁힌다.
--   기본 코드는 UI 레벨에서 제1저자/교신저자만 관리하도록 이미 제한하므로,
--   이 블록은 필요 시에만 적용(공유 DB이므로 신중히).
-- ------------------------------------------------------------
-- drop policy if exists wp_paper_members_all on public.wp_paper_members;
-- create policy wp_paper_members_select on public.wp_paper_members for select
--   using (public.wp_can_access(paper_id));
-- create policy wp_paper_members_write on public.wp_paper_members for all
--   using (exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid()))
--   with check (exists (select 1 from public.wp_papers p where p.id = paper_id and p.owner_id = auth.uid()));
