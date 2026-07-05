// 논문 데이터 파사드: 로그인(userId 있음) → Supabase(wp_), 비로그인 → localStorage
import type { Paper, TeamMember, Reference, Comment, Application } from '../types'
import { findPreset } from '../data/presets'
import { resolveSections } from '../data/sections'
import { getPresetId } from './store'
import * as db from './db'
import * as local from './store'

export async function loadPapers(userId?: string): Promise<Paper[]> {
  const papers = userId ? await db.listPapers(userId) : local.getPapers()

  // 진행률 계산: 채워진 섹션 / 예상 섹션 수
  let counts: Record<string, number> = {}
  if (userId) {
    counts = await db.sectionFilledCounts(papers.map((p) => p.id))
  } else {
    for (const p of papers) {
      counts[p.id] = Object.values(local.getSectionContent(p.id)).filter((v) => v.trim()).length
    }
  }
  for (const p of papers) {
    const preset = findPreset(getPresetId(p.id))
    const expected = resolveSections(preset?.format ?? p.format, preset?.sections).length || 8
    p.progress = Math.min(100, Math.round(((counts[p.id] ?? 0) / expected) * 100))
  }
  return papers
}

export async function loadPaper(id: string, userId?: string): Promise<Paper | undefined> {
  if (userId) return db.getPaper(id, userId)
  return local.getPaper(id)
}

export async function saveTeam(paperId: string, members: TeamMember[], userId?: string): Promise<void> {
  if (userId) return db.saveTeam(paperId, members)
  local.setTeam(paperId, members)
}

export async function createPaper(
  input: Partial<Paper> & { title: string },
  userId?: string,
): Promise<Paper | undefined> {
  if (userId) return db.createPaper(input, userId)
  return local.createPaper(input)
}

export async function setRecruiting(paperId: string, recruiting: boolean, userId?: string): Promise<void> {
  if (userId) return db.setRecruiting(paperId, recruiting)
  local.setRecruitingLocal(paperId, recruiting)
}

/** 공개 모집 게시판 (항상 DB 조회, 비로그인 포함) */
export async function loadRecruiting(): Promise<Paper[]> {
  return db.listRecruiting()
}

export async function applyToRecruiting(
  paperId: string,
  applicant: { id: string; name: string; email?: string },
  message: string,
): Promise<{ error?: string }> {
  return db.applyToPaper(paperId, applicant, message)
}
export async function loadMyApplications(userId: string): Promise<Record<string, string>> {
  return db.myApplications(userId)
}
export async function loadApplications(paperId: string): Promise<Application[]> {
  return db.listApplications(paperId)
}
export async function acceptApplication(app: Application): Promise<{ error?: string }> {
  return db.acceptApplication(app)
}
export async function rejectApplication(id: string): Promise<void> {
  return db.rejectApplication(id)
}

export async function loadSections(paperId: string, userId?: string): Promise<Record<string, string>> {
  if (userId) return db.getSections(paperId)
  return local.getSectionContent(paperId)
}

export async function saveSection(
  paperId: string,
  kind: string,
  title: string,
  content: string,
  userId?: string,
): Promise<void> {
  if (userId) return db.saveSection(paperId, kind, title, content, userId)
  local.setSectionContent(paperId, kind, content)
}

// ---- 참고문헌 ----
export async function loadReferences(paperId: string, userId?: string): Promise<Reference[]> {
  if (userId) return db.listReferences(paperId)
  return local.getReferences(paperId)
}

export async function addReference(paperId: string, apa: string, userId?: string): Promise<Reference | undefined> {
  if (userId) return db.addReference(paperId, apa)
  return local.addReference(paperId, apa)
}

export async function updateReference(paperId: string, id: string, apa: string, userId?: string): Promise<void> {
  if (userId) return db.updateReference(id, apa)
  local.updateReference(paperId, id, apa)
}

export async function deleteReference(paperId: string, id: string, userId?: string): Promise<void> {
  if (userId) return db.deleteReference(id)
  local.deleteReference(paperId, id)
}

// ---- 코멘트 ----
export async function loadComments(paperId: string, userId?: string): Promise<Comment[]> {
  if (userId) return db.listComments(paperId)
  return local.getComments(paperId)
}

export async function addComment(
  paperId: string,
  sectionKind: string,
  anchor: string,
  body: string,
  author: { id?: string; name: string },
): Promise<Comment | undefined> {
  if (author.id) return db.addComment(paperId, sectionKind, anchor, body, author.id, author.name)
  return local.addComment(paperId, sectionKind, anchor, body, author.name)
}

export async function resolveComment(
  paperId: string,
  id: string,
  resolved: boolean,
  userId?: string,
): Promise<void> {
  if (userId) return db.setCommentResolved(id, resolved)
  local.setCommentResolved(paperId, id, resolved)
}

export async function removeComment(paperId: string, id: string, userId?: string): Promise<void> {
  if (userId) return db.deleteComment(id)
  local.deleteComment(paperId, id)
}
