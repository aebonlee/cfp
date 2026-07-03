// 논문 데이터 파사드: 로그인(userId 있음) → Supabase(wp_), 비로그인 → localStorage
import type { Paper, TeamMember, Reference, Comment } from '../types'
import * as db from './db'
import * as local from './store'

export async function loadPapers(userId?: string): Promise<Paper[]> {
  if (userId) return db.listPapers(userId)
  return local.getPapers()
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
