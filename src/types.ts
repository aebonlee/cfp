// withpaper 공통 타입

export type PaperLang = 'ko' | 'en'
export type PaperFormat = 'kci' | 'imrad'
export type PaperStatus = 'topic' | 'team' | 'writing' | 'review' | 'ready' | 'published'

export type MemberType = 'human' | 'ai'
export type MemberRole =
  | 'first_author' // 제1저자 (사람)
  | 'corresponding' // 교신저자 (사람)
  | 'coauthor' // 공동저자 (사람)
  | 'ai_writer' // AI 집필가
  | 'ai_reviewer' // AI 리뷰어
  | 'ai_editor' // AI 에디터

export interface TeamMember {
  id: string
  type: MemberType
  role: MemberRole
  name: string
  note?: string
  email?: string // 사람 팀원 초대 이메일 (이 이메일로 로그인하면 공동저자 접근)
}

/** 논문 프로젝트 (주제 등록 단위) */
export interface Paper {
  id: string
  title: string
  titleEn?: string
  cluster: string // 주제 갈래
  lang: PaperLang
  format: PaperFormat
  summary: string
  keywords: string[]
  method?: string // 핵심 방법론 (예: AHP)
  status: PaperStatus
  members: TeamMember[]
  seed?: boolean // 시드(제공 주제) 여부
  sourceFile?: string // reference/topics 원본
  createdAt: string
  shared?: boolean // 다른 사람이 나를 공동저자로 초대한 논문
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  first_author: '제1저자',
  corresponding: '교신저자',
  coauthor: '공동저자',
  ai_writer: 'AI 집필가',
  ai_reviewer: 'AI 리뷰어',
  ai_editor: 'AI 에디터',
}

export const HUMAN_ROLES: MemberRole[] = ['first_author', 'coauthor', 'corresponding']
export const AI_ROLES: MemberRole[] = ['ai_writer', 'ai_reviewer', 'ai_editor']

export const AI_ROLE_DESC: Record<string, string> = {
  ai_writer: '섹션 초안 작성과 문장 다듬기를 맡습니다.',
  ai_reviewer: '논리·근거·형식을 학술지 기준으로 검토합니다.',
  ai_editor: '참고문헌 정리와 표절·일관성 점검을 담당합니다.',
}

export const FORMAT_LABEL: Record<PaperFormat, string> = {
  kci: '국내 학술지 · KCI (한글)',
  imrad: '국제 저널 · IMRaD (영문)',
}

export const STATUS_LABEL: Record<PaperStatus, string> = {
  topic: '주제 등록',
  team: '팀 구성',
  writing: '집필 중',
  review: '검토 중',
  ready: '게재 준비',
  published: '게재 완료',
}
