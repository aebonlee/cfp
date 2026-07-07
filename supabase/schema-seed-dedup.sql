-- ============================================================
-- 시드(제공 주제) 사본 정리 — 카운트 폭증 버그 사후 정리 (1회 실행)
--
-- 원인: 과거 listPapers()가 사용자가 대시보드를 열 때마다 시드 10건을
--   그 사용자 소유로 복사 생성 → 사용자 수만큼 논문 수 폭증.
-- 조치: 코드에서 시드 임포트를 관리자 1인에게로 제한(isAdmin)했고,
--   여기서는 관리자 이외 사용자가 소유한 시드 사본을 삭제한다.
--
-- ⚠️ 삭제는 wp_papers ON DELETE CASCADE 로 하위(팀원·섹션·참고문헌·코멘트)까지 정리됨.
--    비관리자 사용자가 시드 사본에 직접 작성한 내용이 있으면 함께 삭제되니,
--    실행 전 아래 SELECT 로 대상을 먼저 확인할 것.
-- Supabase SQL Editor 에서 Run.
-- ============================================================

-- 0) 관리자 uuid (admin.ts 의 ADMIN_EMAILS 와 일치)
with admins as (
  select id from auth.users
   where lower(email) in ('aebon@kyonggi.ac.kr', 'aebon@kakao.com')
)

-- 1) [먼저 확인] 삭제 대상 미리보기 — 아래 SELECT 를 먼저 실행해 건수/소유자 점검
select p.owner_id, count(*) as seed_copies
  from public.wp_papers p
 where p.seed = true
   and p.owner_id not in (select id from admins)
 group by p.owner_id
 order by seed_copies desc;

-- 2) [확인 후 주석 해제하여 실행] 관리자 이외 소유의 시드 사본 삭제
-- delete from public.wp_papers p
--  where p.seed = true
--    and p.owner_id not in (
--      select id from auth.users
--       where lower(email) in ('aebon@kyonggi.ac.kr', 'aebon@kakao.com')
--    );

-- 3) 남은 시드는 모두 공개 모집 상태 보장(선택)
-- update public.wp_papers set recruiting = true where seed = true;
