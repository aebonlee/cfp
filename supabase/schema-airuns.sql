-- ============================================================
-- withpaper/cfp AI 사용량 집계용 컬럼 (schema.sql 이후 실행)
-- wp_ai_runs 에 프로바이더·토큰 세부 컬럼 추가. SQL Editor 에서 Run.
-- ============================================================

alter table public.wp_ai_runs add column if not exists provider text;
alter table public.wp_ai_runs add column if not exists input_tokens int;
alter table public.wp_ai_runs add column if not exists output_tokens int;

create index if not exists wp_ai_runs_created_idx on public.wp_ai_runs(created_at);
