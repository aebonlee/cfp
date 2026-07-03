# Call for Papers (cfp)

사람과 AI가 팀을 이뤄 학술지 게재까지 완성하는 협업 논문 작성 플랫폼.

- 주소: https://withpaper.dreamitbiz.com
- 스택: React 19 · Vite 7 · TypeScript · Tailwind v4 · Supabase · GitHub Actions
- 로그인: 구글 이메일 · 카카오
- 기능: 주제 등록 · 팀 구성(사람 1~3 + AI 팀원) · 섹션 집필 + AI 집필/검토/교정(Claude) · 단락별 코멘트/리뷰 · 참고문헌 관리 · 공동저자 초대

## 개발

```bash
npm install
npm run dev
npm run build
```

## Supabase 마이그레이션 (SQL Editor)

1. `supabase/schema.sql` — wp_ 테이블 + RLS
2. `supabase/schema-invites.sql` — 공동저자 이메일 초대
3. `supabase/schema-comments.sql` — 코멘트 컬럼

Edge Function: `supabase functions deploy withpaper-ai` + `ANTHROPIC_API_KEY`
