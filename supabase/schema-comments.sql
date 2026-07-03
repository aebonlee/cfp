-- ============================================================
-- withpaper 코멘트/리뷰 스레드 마이그레이션 (schema.sql 이후 실행)
-- 섹션·단락 단위 코멘트. Supabase SQL Editor 에 붙여넣고 Run.
-- (wp_comments 테이블·RLS 는 schema.sql 에서 이미 생성됨)
-- ============================================================

alter table public.wp_comments
  add column if not exists section_kind text;

-- 단락 앵커(단락 인덱스 문자열). '' 이면 섹션 전체 코멘트
alter table public.wp_comments
  add column if not exists anchor text default '';

-- 작성자 표시명(auth.users 조회 없이 표시하기 위해 저장)
alter table public.wp_comments
  add column if not exists author_name text;

create index if not exists wp_comments_section_idx
  on public.wp_comments(paper_id, section_kind);
