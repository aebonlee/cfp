import { supabase, TABLES } from './supabase'
import type { Paper, TeamMember, MemberRole, MemberType, PaperStatus, Reference, Comment, Application } from '../types'
import { SEED_TOPICS } from '../data/topics'

// Supabase(wp_) 영구 저장 레이어. 로그인 사용자 기준으로 동작한다.

interface PaperRow {
  id: string
  owner_id: string
  title: string
  title_en: string | null
  cluster: string
  lang: 'ko' | 'en'
  format: 'kci' | 'imrad'
  summary: string
  keywords: string[]
  method: string | null
  status: PaperStatus
  seed: boolean
  source_file: string | null
  created_at: string
  recruiting?: boolean | null
}

interface MemberRow {
  id: string
  paper_id: string
  user_id: string | null
  type: MemberType
  role: MemberRole
  name: string
  note: string | null
  invite_email: string | null
}

function toMember(m: MemberRow): TeamMember {
  return {
    id: m.id,
    type: m.type,
    role: m.role,
    name: m.name,
    note: m.note ?? undefined,
    email: m.invite_email ?? undefined,
  }
}

function toPaper(row: PaperRow, members: TeamMember[], viewerId?: string): Paper {
  return {
    id: row.id,
    title: row.title,
    titleEn: row.title_en ?? undefined,
    cluster: row.cluster,
    lang: row.lang,
    format: row.format,
    summary: row.summary,
    keywords: row.keywords ?? [],
    method: row.method ?? undefined,
    status: row.status,
    members,
    seed: row.seed,
    sourceFile: row.source_file ?? undefined,
    createdAt: (row.created_at ?? '').slice(0, 10),
    shared: viewerId ? row.owner_id !== viewerId : false,
    recruiting: !!row.recruiting,
  }
}

/** 사용자가 아직 등록하지 않은 시드 주제를 본인 소유 논문으로 임포트(제목 기준 멱등)
 *  + 제공 주제에는 이애본을 제1저자로 기본 배정(신규 및 기존 백필) */
export async function syncSeeds(ownerId: string): Promise<void> {
  const { data: existingRows } = await supabase
    .from(TABLES.papers)
    .select('id, title, seed')
    .eq('owner_id', ownerId)
  const existing = new Set((existingRows ?? []).map((r: { title: string }) => r.title))
  const missing = SEED_TOPICS.filter((s) => !existing.has(s.title))

  if (missing.length > 0) {
    await supabase.from(TABLES.papers).insert(
      missing.map((s) => ({
        owner_id: ownerId,
        title: s.title,
        title_en: s.titleEn ?? null,
        cluster: s.cluster,
        lang: s.lang,
        format: s.format,
        summary: s.summary,
        keywords: s.keywords,
        method: s.method ?? null,
        status: 'topic',
        seed: true,
        source_file: s.sourceFile ?? null,
      })),
    )
  }

  // 제공 주제(seed) 중 팀원이 없는 논문에 이애본 제1저자를 백필
  const { data: seedPapers } = await supabase
    .from(TABLES.papers)
    .select('id')
    .eq('owner_id', ownerId)
    .eq('seed', true)
  const seedIds = (seedPapers ?? []).map((r: { id: string }) => r.id)
  if (seedIds.length === 0) return

  const { data: mem } = await supabase.from(TABLES.members).select('paper_id').in('paper_id', seedIds)
  const hasMember = new Set((mem ?? []).map((m: { paper_id: string }) => m.paper_id))
  const needLead = seedIds.filter((id) => !hasMember.has(id))
  if (needLead.length > 0) {
    await supabase.from(TABLES.members).insert(
      needLead.map((paper_id) => ({
        paper_id,
        user_id: ownerId,
        type: 'human',
        role: 'first_author',
        name: '이애본',
      })),
    )
    await supabase.from(TABLES.papers).update({ status: 'team' }).in('id', needLead).eq('status', 'topic')
  }
}

/** 사용자의 논문 목록(+팀원) 로드 — 소유 + 이메일로 초대받은 공유 논문 포함 */
export async function listPapers(ownerId: string): Promise<Paper[]> {
  await supabase.rpc('wp_claim_invites') // 내 이메일로 온 초대 연결(있으면)
  await syncSeeds(ownerId)
  const { data: papers } = await supabase
    .from(TABLES.papers)
    .select('*')
    .order('created_at', { ascending: true })
  const rows = (papers ?? []) as PaperRow[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const { data: members } = await supabase.from(TABLES.members).select('*').in('paper_id', ids)
  const byPaper = new Map<string, TeamMember[]>()
  for (const m of (members ?? []) as MemberRow[]) {
    const list = byPaper.get(m.paper_id) ?? []
    list.push(toMember(m))
    byPaper.set(m.paper_id, list)
  }
  return rows.map((r) => toPaper(r, byPaper.get(r.id) ?? [], ownerId))
}

export async function getPaper(id: string, viewerId?: string): Promise<Paper | undefined> {
  const { data: row } = await supabase.from(TABLES.papers).select('*').eq('id', id).maybeSingle()
  if (!row) return undefined
  const { data: members } = await supabase.from(TABLES.members).select('*').eq('paper_id', id)
  const team = ((members ?? []) as MemberRow[]).map(toMember)
  return toPaper(row as PaperRow, team, viewerId)
}

export async function createPaper(
  input: Partial<Paper> & { title: string },
  ownerId: string,
): Promise<Paper | undefined> {
  const { data } = await supabase
    .from(TABLES.papers)
    .insert({
      owner_id: ownerId,
      title: input.title,
      title_en: input.titleEn ?? null,
      cluster: input.cluster ?? '직접 등록',
      lang: input.lang ?? 'ko',
      format: input.format ?? 'kci',
      summary: input.summary ?? '',
      keywords: input.keywords ?? [],
      method: input.method ?? null,
      status: 'topic',
      seed: false,
      recruiting: input.recruiting ?? false,
    })
    .select('*')
    .single()
  return data ? toPaper(data as PaperRow, []) : undefined
}

/** 공개 모집 여부 토글 */
export async function setRecruiting(paperId: string, recruiting: boolean): Promise<void> {
  await supabase.from(TABLES.papers).update({ recruiting }).eq('id', paperId)
}

/** 공개 모집 중인 논문 목록 (비로그인 포함 누구나) */
export async function listRecruiting(): Promise<Paper[]> {
  const { data } = await supabase
    .from(TABLES.papers)
    .select('*')
    .eq('recruiting', true)
    .order('created_at', { ascending: false })
  return ((data ?? []) as PaperRow[]).map((r) => toPaper(r, []))
}

// ---- 참여 신청 ----
interface AppRow {
  id: string
  paper_id: string
  applicant_id: string | null
  applicant_name: string | null
  applicant_email: string | null
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}
function toApp(r: AppRow): Application {
  return {
    id: r.id,
    paperId: r.paper_id,
    applicantId: r.applicant_id ?? undefined,
    applicantName: r.applicant_name ?? '(이름 없음)',
    applicantEmail: r.applicant_email ?? undefined,
    message: r.message ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  }
}

/** 공개 논문에 참여 신청 */
export async function applyToPaper(
  paperId: string,
  applicant: { id: string; name: string; email?: string },
  message: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from(TABLES.applications).insert({
    paper_id: paperId,
    applicant_id: applicant.id,
    applicant_name: applicant.name,
    applicant_email: applicant.email ?? null,
    message: message || null,
  })
  return error ? { error: error.message } : {}
}

/** 내가 이미 신청한 공개 논문 id 목록 */
export async function myApplications(userId: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from(TABLES.applications)
    .select('paper_id, status')
    .eq('applicant_id', userId)
  const m: Record<string, string> = {}
  for (const r of (data ?? []) as { paper_id: string; status: string }[]) m[r.paper_id] = r.status
  return m
}

/** 특정 논문의 신청 목록(주저자용) */
export async function listApplications(paperId: string): Promise<Application[]> {
  const { data } = await supabase
    .from(TABLES.applications)
    .select('*')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: false })
  return ((data ?? []) as AppRow[]).map(toApp)
}

/** 신청 수락 → 공동저자 추가 + 상태 변경 */
export async function acceptApplication(app: Application): Promise<{ error?: string }> {
  const { error: mErr } = await supabase.from(TABLES.members).insert({
    paper_id: app.paperId,
    user_id: app.applicantId ?? null,
    type: 'human',
    role: 'coauthor',
    name: app.applicantName,
    invite_email: app.applicantEmail ?? null,
  })
  if (mErr) return { error: mErr.message }
  await supabase.from(TABLES.applications).update({ status: 'accepted' }).eq('id', app.id)
  return {}
}

export async function rejectApplication(id: string): Promise<void> {
  await supabase.from(TABLES.applications).update({ status: 'rejected' }).eq('id', id)
}

/** 팀원 전체 교체 + 상태 갱신 */
export async function saveTeam(paperId: string, members: TeamMember[]): Promise<void> {
  await supabase.from(TABLES.members).delete().eq('paper_id', paperId)
  if (members.length > 0) {
    await supabase.from(TABLES.members).insert(
      members.map((m) => ({
        paper_id: paperId,
        type: m.type,
        role: m.role,
        name: m.name,
        note: m.note ?? null,
        invite_email: m.type === 'human' ? (m.email ?? null) : null,
      })),
    )
    await supabase.from(TABLES.papers).update({ status: 'team' }).eq('id', paperId).eq('status', 'topic')
  }
}

/** 여러 논문의 '내용이 있는 섹션' 개수를 한 번에 조회 */
export async function sectionFilledCounts(paperIds: string[]): Promise<Record<string, number>> {
  if (paperIds.length === 0) return {}
  const { data } = await supabase.from(TABLES.sections).select('paper_id, content').in('paper_id', paperIds)
  const m: Record<string, number> = {}
  for (const r of (data ?? []) as { paper_id: string; content: string }[]) {
    if ((r.content ?? '').trim()) m[r.paper_id] = (m[r.paper_id] ?? 0) + 1
  }
  return m
}

export async function getSections(paperId: string): Promise<Record<string, string>> {
  const { data } = await supabase.from(TABLES.sections).select('kind, content').eq('paper_id', paperId)
  const out: Record<string, string> = {}
  for (const s of (data ?? []) as { kind: string; content: string }[]) out[s.kind] = s.content
  return out
}

export async function saveSection(
  paperId: string,
  kind: string,
  title: string,
  content: string,
  userId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from(TABLES.sections)
    .select('id')
    .eq('paper_id', paperId)
    .eq('kind', kind)
    .maybeSingle()

  if (existing) {
    await supabase
      .from(TABLES.sections)
      .update({ content, title, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id)
  } else {
    await supabase.from(TABLES.sections).insert({ paper_id: paperId, kind, title, content, updated_by: userId })
  }
  if (content.trim()) {
    await supabase.from(TABLES.papers).update({ status: 'writing' }).eq('id', paperId).in('status', ['topic', 'team'])
  }
}

// ---- 참고문헌 ----
export async function listReferences(paperId: string): Promise<Reference[]> {
  const { data } = await supabase
    .from(TABLES.references)
    .select('id, apa, citation_key')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: true })
  return ((data ?? []) as { id: string; apa: string; citation_key: string | null }[]).map((r) => ({
    id: r.id,
    apa: r.apa,
    citationKey: r.citation_key ?? undefined,
  }))
}

export async function addReference(paperId: string, apa: string): Promise<Reference | undefined> {
  const { data } = await supabase
    .from(TABLES.references)
    .insert({ paper_id: paperId, apa })
    .select('id, apa, citation_key')
    .single()
  return data ? { id: data.id, apa: data.apa, citationKey: data.citation_key ?? undefined } : undefined
}

export async function updateReference(id: string, apa: string): Promise<void> {
  await supabase.from(TABLES.references).update({ apa }).eq('id', id)
}

export async function deleteReference(id: string): Promise<void> {
  await supabase.from(TABLES.references).delete().eq('id', id)
}

// ---- 코멘트(리뷰 스레드) ----
interface CommentRow {
  id: string
  section_kind: string | null
  anchor: string | null
  body: string
  author_name: string | null
  author_id: string | null
  resolved: boolean
  created_at: string
}

function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    sectionKind: r.section_kind ?? '',
    anchor: r.anchor ?? '',
    body: r.body,
    authorName: r.author_name ?? '익명',
    authorId: r.author_id ?? undefined,
    resolved: r.resolved,
    createdAt: r.created_at,
  }
}

/** 논문의 모든 코멘트 로드(섹션·단락별 그룹은 클라이언트에서) */
export async function listComments(paperId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from(TABLES.comments)
    .select('id, section_kind, anchor, body, author_name, author_id, resolved, created_at')
    .eq('paper_id', paperId)
    .order('created_at', { ascending: true })
  return ((data ?? []) as CommentRow[]).map(toComment)
}

export async function addComment(
  paperId: string,
  sectionKind: string,
  anchor: string,
  body: string,
  authorId: string,
  authorName: string,
): Promise<Comment | undefined> {
  const { data } = await supabase
    .from(TABLES.comments)
    .insert({
      paper_id: paperId,
      section_kind: sectionKind,
      anchor,
      body,
      author_id: authorId,
      author_name: authorName,
    })
    .select('id, section_kind, anchor, body, author_name, author_id, resolved, created_at')
    .single()
  return data ? toComment(data as CommentRow) : undefined
}

export async function setCommentResolved(id: string, resolved: boolean): Promise<void> {
  await supabase.from(TABLES.comments).update({ resolved }).eq('id', id)
}

export async function deleteComment(id: string): Promise<void> {
  await supabase.from(TABLES.comments).delete().eq('id', id)
}
