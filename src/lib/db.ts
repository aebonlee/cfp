import { supabase, TABLES } from './supabase'
import type { Paper, TeamMember, MemberRole, MemberType, PaperStatus } from '../types'
import { SEED_TOPICS } from '../data/topics'

// Supabase(wp_) 영구 저장 레이어. 로그인 사용자 기준으로 동작한다.

interface PaperRow {
  id: string
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
}

interface MemberRow {
  id: string
  paper_id: string
  user_id: string | null
  type: MemberType
  role: MemberRole
  name: string
  note: string | null
}

function toPaper(row: PaperRow, members: TeamMember[]): Paper {
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
  }
}

/** 사용자가 아직 등록하지 않은 시드 주제를 본인 소유 논문으로 임포트(제목 기준 멱등) */
export async function syncSeeds(ownerId: string): Promise<void> {
  const { data } = await supabase.from(TABLES.papers).select('title').eq('owner_id', ownerId)
  const existing = new Set((data ?? []).map((r: { title: string }) => r.title))
  const missing = SEED_TOPICS.filter((s) => !existing.has(s.title))
  if (missing.length === 0) return
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

/** 사용자의 논문 목록(+팀원) 로드 */
export async function listPapers(ownerId: string): Promise<Paper[]> {
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
    list.push({ id: m.id, type: m.type, role: m.role, name: m.name, note: m.note ?? undefined })
    byPaper.set(m.paper_id, list)
  }
  return rows.map((r) => toPaper(r, byPaper.get(r.id) ?? []))
}

export async function getPaper(id: string): Promise<Paper | undefined> {
  const { data: row } = await supabase.from(TABLES.papers).select('*').eq('id', id).maybeSingle()
  if (!row) return undefined
  const { data: members } = await supabase.from(TABLES.members).select('*').eq('paper_id', id)
  const team = ((members ?? []) as MemberRow[]).map((m) => ({
    id: m.id,
    type: m.type,
    role: m.role,
    name: m.name,
    note: m.note ?? undefined,
  }))
  return toPaper(row as PaperRow, team)
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
    })
    .select('*')
    .single()
  return data ? toPaper(data as PaperRow, []) : undefined
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
      })),
    )
    await supabase.from(TABLES.papers).update({ status: 'team' }).eq('id', paperId).eq('status', 'topic')
  }
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
