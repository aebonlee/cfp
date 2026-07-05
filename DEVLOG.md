# Call for Papers (cfp) 개발 일지

> 사람 1~3인 + AI 팀원이 한 팀이 되어 학술지 게재까지 완성하는 협업 논문 작성 플랫폼
> https://cfp.dreamitbiz.com · `aebonlee/cfp`

## 개요
- **스택**: React 19 · Vite 7 · TypeScript · Tailwind v4 · Supabase · GitHub Actions(gh-pages)
- **도메인**: cfp.dreamitbiz.com (커스텀, Cloudflare 프록시)
- **인증**: 구글 이메일 · 카카오 (Supabase Auth)
- **DB**: 공유 Supabase 프로젝트, 테이블 접두사 `wp_`
- **AI**: Supabase Edge Function 경유 — OpenAI(gpt-4o) 우선, Claude 대체, 참고문헌은 웹검색

---

## 개발 타임라인 (2026-07-02 ~ 07-05)

### 1. 스캐폴딩 & 랜딩 (07-02)
- React19/Vite7/TS/Tailwind v4 프로젝트 구성, 커스텀 도메인 CNAME, SPA 404 폴백
- GitHub Actions Pages 자동배포, 브랜드(딥네이비+게재 앰버), 랜딩 페이지
- 방향 확정: 하이브리드 팀(사람+AI) · Claude API(Edge Function) · 한/영(KCI/IMRaD)

### 2. 주제 등록 & 팀 구성
- Notion 익스포트 논문 주제 **10편**을 시드로 등록 (교육·훈련교사 역량 / 가족기업·ESG / AI 교육 3갈래)
- 대시보드(내 논문), 팀 빌더(사람 1~3인 + AI 집필가·리뷰어·에디터)

### 3. Supabase & 인증 & AI
- `wp_` 스키마(papers·members·sections·comments·references·ai_runs) + RLS(auth.uid, auth.users 트리거 금지)
- 구글/카카오 OAuth, Claude Edge Function(집필·검토·교정)
- OG 이미지(sharp 생성) + 메타태그

### 4. 협업 기능
- 섹션 에디터 + AI 집필/검토/교정
- 원본 초안 자동 로드 + **마크다운 렌더링**(표·이미지·헤딩, 줄단위 파싱)
- **단락별 코멘트/리뷰 스레드**, 버전 히스토리, 본문 인용 `[n]` ↔ 참고문헌 자동 연결
- 참고문헌 관리, 공동저자 **이메일 초대**(RLS 이메일 매칭)

### 5. 완성도 & 게재 준비
- 유사도/표절 사전 점검(내부 중복 + AI 연구윤리)
- 게재 준비 체크리스트 + 투고본 내보내기(Word/PDF/Markdown)
- 저널별 투고 양식 프리셋(KCI·교육학·학위논문·IMRaD·IEEE·Nature)
- 대시보드 진행률, 통합 상단 헤더

### 6. 리브랜딩 (07-03)
- `withpaper` → **Call for Papers(cfp)**: 리포·폴더·로고·OG·도메인(cfp.dreamitbiz.com) 전환
- 히어로 2단 레이아웃 + 종이·만년필 SVG(부유 애니메이션)
- 1600px 와이드 + 반응형 줄바꿈(min-w-0)

### 7. 멀티프로바이더 & 관리자 (07-04)
- Edge Function 멀티프로바이더(OpenAI/Claude), **AI 편집 도우미**(자유 지시)
- **관리자 대시보드**(`withpaper-admin`, service_role 집계): 사이드바(개요·논문·사용자·AI사용량비용·추이), 논문 열람/삭제, AI 사용량·비용 로깅
- 회원목록은 cfp 참여자만 필터(공유 auth 풀에서 wp_ 활동 기준)

### 8. 팀원 모집 & 참고문헌 강화 (07-04~05)
- **팀원 공개 모집**: 공개 논문(비로그인 열람) → 신청 → **주저자 승인**(수락/거절), 시드 10편 공개
- 참고문헌 **AI 웹검색 추천**(gpt-4o-search-preview / Claude web_search), 각 논문 자동 등록(86건) + 형식 통일

---

## 아키텍처 메모

### Edge Functions
| 함수 | 역할 |
|---|---|
| `withpaper-ai` | AI 집필/검토/교정/윤리점검/편집도우미/참고문헌추천. OpenAI 우선, Claude 대체, 참고문헌은 웹검색. `wp_ai_runs` 로깅 |
| `withpaper-admin` | 관리자 이메일 게이트 후 service_role 전체 집계 + 논문 삭제 + 참여자 필터 |

### 시크릿 (Supabase Edge Functions)
- `OPENAI_API_KEY` (설정됨) · `ANTHROPIC_API_KEY`(선택, 있으면 Claude/웹검색 우선)
- `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`(자동 주입) · `ADMIN_EMAILS`(선택)

### 마이그레이션 (SQL Editor, 모두 실행 완료)
`schema.sql` → `schema-invites.sql` → `schema-comments.sql` → `schema-airuns.sql` → `schema-recruit.sql` → `schema-recruit-seeds.sql`

---

## 트러블슈팅 기록

- **GitHub Pages 배포 반복 실패** (`Deployment failed, try again later`, error_count:10)
  - 원인: `concurrency: cancel-in-progress: true` → 배포 겹칠 때 취소되며 github-pages 환경이 errored로 손상
  - 해결: **`cancel-in-progress: false`**(GitHub 공식 권장). errored 시엔 쿨다운 후 재실행
- **커스텀 도메인 이전**: withpaper→cfp 시 CNAME·OG·VITE_SITE_URL·OAuth redirect 모두 cfp로 정합 필요
- **마크다운 표 렌더링**: 표가 텍스트와 한 블록에 섞이면 raw 노출 → 줄단위 파싱(renderLines)으로 해결
- **한글 파일명 fetch**: 원본 원고 이미지 참조를 `/topics/NN/*.png` 절대경로로 재작성
- **AI 참고문헌 환각**: 지식기반은 지어냄 → 웹검색 모델(gpt-4o-search-preview)로 실재 문헌 확보, "검증 필요/확정" 절차 유지

---

## 배포
- **웹**: main push → GitHub Actions → gh-pages (자동)
- **Edge Function**: `supabase functions deploy <name> --project-ref hcmgdztsgjvzcyxyayaj` (login 또는 SUPABASE_ACCESS_TOKEN 필요)

_최종 업데이트: 2026-07-05_
