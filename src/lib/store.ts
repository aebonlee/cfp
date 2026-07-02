import type { Paper, TeamMember } from '../types'
import { SEED_TOPICS } from '../data/topics'

// 논문 프로젝트 로컬 스토어.
// 지금은 localStorage 기반(브라우저 지속). 이후 Supabase wp_papers/wp_members 로 승격 예정.

const KEY = 'withpaper.papers.v1'

function load(): Paper[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedInitial()
    const parsed = JSON.parse(raw) as Paper[]
    // 시드가 새로 늘어난 경우 병합(사용자 데이터 보존)
    const ids = new Set(parsed.map((p) => p.id))
    const merged = [...parsed, ...SEED_TOPICS.filter((s) => !ids.has(s.id))]
    return merged
  } catch {
    return seedInitial()
  }
}

function seedInitial(): Paper[] {
  const seeded = SEED_TOPICS.map((p) => ({ ...p }))
  save(seeded)
  return seeded
}

function save(papers: Paper[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(papers))
  } catch {
    /* 저장 실패는 무시(비영구 모드) */
  }
}

export function getPapers(): Paper[] {
  return load()
}

export function getPaper(id: string): Paper | undefined {
  return load().find((p) => p.id === id)
}

export function upsertPaper(paper: Paper) {
  const papers = load()
  const i = papers.findIndex((p) => p.id === paper.id)
  if (i >= 0) papers[i] = paper
  else papers.unshift(paper)
  save(papers)
}

/** 팀원 목록을 교체하고, 팀이 생기면 상태를 team/writing 으로 올린다 */
export function setTeam(paperId: string, members: TeamMember[]) {
  const papers = load()
  const p = papers.find((x) => x.id === paperId)
  if (!p) return
  p.members = members
  if (members.length > 0 && (p.status === 'topic' || p.status === 'team')) {
    p.status = 'team'
  }
  save(papers)
}

export function createPaper(input: Partial<Paper> & { title: string }): Paper {
  const paper: Paper = {
    id: `paper-${Date.now()}`,
    title: input.title,
    titleEn: input.titleEn,
    cluster: input.cluster ?? '직접 등록',
    lang: input.lang ?? 'ko',
    format: input.format ?? 'kci',
    summary: input.summary ?? '',
    keywords: input.keywords ?? [],
    method: input.method,
    status: 'topic',
    members: [],
    seed: false,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  upsertPaper(paper)
  return paper
}

export function newMemberId() {
  return `m-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
}
