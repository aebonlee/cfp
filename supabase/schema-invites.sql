-- ============================================================
-- withpaper 공동저자 초대 마이그레이션 (schema.sql 이후 실행)
-- 이메일로 초대하면, 그 이메일로 로그인한 사용자가 공동저자로 접근한다.
-- Supabase SQL Editor 에 붙여넣고 Run.
-- ============================================================

-- 1) 초대 이메일 컬럼
alter table public.wp_paper_members
  add column if not exists invite_email text;

-- 2) 접근 판정 함수 확장: 소유자 · user_id 일치 · 초대 이메일 일치
create or replace function public.wp_can_access(p_paper uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.wp_papers p
    where p.id = p_paper and p.owner_id = auth.uid()
  ) or exists (
    select 1 from public.wp_paper_members m
    where m.paper_id = p_paper
      and (
        m.user_id = auth.uid()
        or lower(m.invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

-- 3) 로그인 시 본인 이메일로 온 초대에 user_id 를 연결(선택적, 정리용)
create or replace function public.wp_claim_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.wp_paper_members
     set user_id = auth.uid()
   where user_id is null
     and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.wp_claim_invites() to authenticated;
