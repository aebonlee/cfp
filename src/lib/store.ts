import type { Paper, TeamMember, Reference, Comment } from '../types'
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

// ---- 섹션 내용 저장 (paperId → { kind → content }) ----
const SECTION_KEY = 'withpaper.sections.v1'

type SectionStore = Record<string, Record<string, string>>

function loadSections(): SectionStore {
  try {
    return JSON.parse(localStorage.getItem(SECTION_KEY) || '{}') as SectionStore
  } catch {
    return {}
  }
}

function saveSections(s: SectionStore) {
  try {
    localStorage.setItem(SECTION_KEY, JSON.stringify(s))
  } catch {
    /* 무시 */
  }
}

export function getSectionContent(paperId: string): Record<string, string> {
  return loadSections()[paperId] ?? {}
}

// ---- 참고문헌 (localStorage) ----
const REF_KEY = 'withpaper.refs.v1'

function loadRefs(): Record<string, Reference[]> {
  try {
    return JSON.parse(localStorage.getItem(REF_KEY) || '{}') as Record<string, Reference[]>
  } catch {
    return {}
  }
}
function saveRefs(r: Record<string, Reference[]>) {
  try {
    localStorage.setItem(REF_KEY, JSON.stringify(r))
  } catch {
    /* 무시 */
  }
}
export function getReferences(paperId: string): Reference[] {
  return loadRefs()[paperId] ?? []
}
export function addReference(paperId: string, apa: string): Reference {
  const ref: Reference = { id: `ref-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, apa }
  const all = loadRefs()
  all[paperId] = [...(all[paperId] ?? []), ref]
  saveRefs(all)
  return ref
}
export function updateReference(paperId: string, id: string, apa: string) {
  const all = loadRefs()
  all[paperId] = (all[paperId] ?? []).map((r) => (r.id === id ? { ...r, apa } : r))
  saveRefs(all)
}
export function deleteReference(paperId: string, id: string) {
  const all = loadRefs()
  all[paperId] = (all[paperId] ?? []).filter((r) => r.id !== id)
  saveRefs(all)
}

// ---- 코멘트 (localStorage) ----
const COMMENT_KEY = 'withpaper.comments.v1'

function loadComments(): Record<string, Comment[]> {
  try {
    return JSON.parse(localStorage.getItem(COMMENT_KEY) || '{}') as Record<string, Comment[]>
  } catch {
    return {}
  }
}
function saveComments(c: Record<string, Comment[]>) {
  try {
    localStorage.setItem(COMMENT_KEY, JSON.stringify(c))
  } catch {
    /* 무시 */
  }
}
export function getComments(paperId: string): Comment[] {
  return loadComments()[paperId] ?? []
}
export function addComment(
  paperId: string,
  sectionKind: string,
  anchor: string,
  body: string,
  authorName: string,
): Comment {
  const c: Comment = {
    id: `c-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    sectionKind,
    anchor,
    body,
    authorName,
    resolved: false,
    createdAt: new Date().toISOString(),
  }
  const all = loadComments()
  all[paperId] = [...(all[paperId] ?? []), c]
  saveComments(all)
  return c
}
export function setCommentResolved(paperId: string, id: string, resolved: boolean) {
  const all = loadComments()
  all[paperId] = (all[paperId] ?? []).map((c) => (c.id === id ? { ...c, resolved } : c))
  saveComments(all)
}
export function deleteComment(paperId: string, id: string) {
  const all = loadComments()
  all[paperId] = (all[paperId] ?? []).filter((c) => c.id !== id)
  saveComments(all)
}

export function setSectionContent(paperId: string, kind: string, content: string) {
  const all = loadSections()
  all[paperId] = { ...(all[paperId] ?? {}), [kind]: content }
  saveSections(all)

  // 내용이 채워지기 시작하면 논문 상태를 '집필 중'으로
  const papers = load()
  const p = papers.find((x) => x.id === paperId)
  if (p && content.trim() && (p.status === 'topic' || p.status === 'team')) {
    p.status = 'writing'
    save(papers)
  }
}
