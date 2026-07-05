-- ============================================================
-- 이미 등록된 제공 주제(seed) 10건을 팀원 공개 모집으로 전환 (1회 실행)
-- schema-recruit.sql 이후 실행. SQL Editor 에서 Run.
-- ============================================================

update public.wp_papers
   set recruiting = true
 where seed = true;
