// withpaper/cfp 관리자 집계 Edge Function
// 관리자 이메일만 허용, service_role 로 전체 wp_ 집계 + 논문 삭제.
//
// 배포: supabase functions deploy withpaper-admin
// 선택: supabase secrets set ADMIN_EMAILS="a@b.com,c@d.com"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? 'aebon@kyonggi.ac.kr,aebon@kakao.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

// 모델별 단가 (USD / 1M tokens): [input, output]
const PRICING: Record<string, [number, number]> = {
  'gpt-4o': [2.5, 10],
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4.1': [2, 8],
  'claude-opus-4-8': [5, 25],
  'claude-sonnet-5': [3, 15],
  'claude-haiku-4-5': [1, 5],
}
function costOf(model: string, inTok: number, outTok: number): number {
  const [pi, po] = PRICING[model] ?? [3, 12]
  return (inTok / 1e6) * pi + (outTok / 1e6) * po
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'content-type': 'application/json' } })
}
function dayKey(iso: string) {
  return (iso ?? '').slice(0, 10)
}
function lastNDays(n: number): string[] {
  const days: string[] = []
  const now = Date.now()
  for (let i = n - 1; i >= 0; i--) days.push(new Date(now - i * 86400000).toISOString().slice(0, 10))
  return days
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email || !ADMIN_EMAILS.includes(email)) return json({ error: '관리자 권한이 없습니다.' }, 403)

    const db = createClient(SUPABASE_URL, SERVICE)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    // ── 논문 삭제 액션 ──
    if (body.action === 'delete' && body.paperId) {
      const { error } = await db.from('wp_papers').delete().eq('id', body.paperId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    // ── 전체 집계 ──
    const count = async (t: string, f?: (q: any) => any) => {
      let q = db.from(t).select('*', { count: 'exact', head: true })
      if (f) q = f(q)
      const { count } = await q
      return count ?? 0
    }
    const [papersCnt, humans, ais, comments, refs] = await Promise.all([
      count('wp_papers'),
      count('wp_paper_members', (q) => q.eq('type', 'human')),
      count('wp_paper_members', (q) => q.eq('type', 'ai')),
      count('wp_comments'),
      count('wp_references'),
    ])

    const { data: secs } = await db.from('wp_sections').select('paper_id, content')
    const secByPaper: Record<string, number> = {}
    let filledSections = 0
    for (const s of secs ?? []) {
      if ((s.content ?? '').trim()) {
        filledSections++
        secByPaper[s.paper_id] = (secByPaper[s.paper_id] ?? 0) + 1
      }
    }

    // 논문(사용자별·상태·추이·목록)
    const { data: pRows } = await db
      .from('wp_papers')
      .select('id, title, status, seed, format, created_at, owner_id')
      .order('created_at', { ascending: false })
    const papers = pRows ?? []
    const statusDist: Record<string, number> = {}
    let seedCount = 0
    const byOwner: Record<string, number> = {}
    for (const p of papers) {
      statusDist[p.status] = (statusDist[p.status] ?? 0) + 1
      if (p.seed) seedCount++
      byOwner[p.owner_id] = (byOwner[p.owner_id] ?? 0) + 1
    }

    // 사용자 목록(이메일 매핑)
    const { data: uData } = await db.auth.admin.listUsers({ perPage: 1000 })
    const authUsers = uData?.users ?? []
    const users = authUsers.map((u: any) => ({
      id: u.id,
      email: u.email ?? '(이메일 없음)',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      papers: byOwner[u.id] ?? 0,
    }))
    users.sort((a, b) => b.papers - a.papers)

    // 논문 상세(소유자 이메일 + 작성 섹션 수)
    const emailById: Record<string, string> = Object.fromEntries(
      authUsers.map((u: any) => [u.id, u.email ?? '(이메일 없음)']),
    )
    const titleById: Record<string, string> = Object.fromEntries(papers.map((p) => [p.id, p.title]))
    const papersDetailed = papers.map((p) => ({
      ...p,
      owner_email: emailById[p.owner_id] ?? '—',
      sections: secByPaper[p.id] ?? 0,
    }))

    // AI 사용량/비용
    const { data: runs } = await db
      .from('wp_ai_runs')
      .select('model, provider, role, input_tokens, output_tokens, tokens, created_at, paper_id')
      .order('created_at', { ascending: false })
    const runRows = runs ?? []
    const byModel: Record<string, { runs: number; inTok: number; outTok: number; cost: number }> = {}
    const byRole: Record<string, number> = {}
    let totalCost = 0
    let totalTokens = 0
    for (const r of runRows) {
      const model = r.model ?? 'unknown'
      const it = r.input_tokens ?? 0
      const ot = r.output_tokens ?? Math.max(0, (r.tokens ?? 0) - it)
      const c = costOf(model, it, ot)
      byModel[model] ??= { runs: 0, inTok: 0, outTok: 0, cost: 0 }
      byModel[model].runs++
      byModel[model].inTok += it
      byModel[model].outTok += ot
      byModel[model].cost += c
      byRole[r.role ?? '기타'] = (byRole[r.role ?? '기타'] ?? 0) + 1
      totalCost += c
      totalTokens += it + ot
    }

    // 기간별 추이(최근 30일)
    const days = lastNDays(30)
    const papersByDay: Record<string, number> = {}
    for (const p of papers) papersByDay[dayKey(p.created_at)] = (papersByDay[dayKey(p.created_at)] ?? 0) + 1
    const runsByDay: Record<string, number> = {}
    const costByDay: Record<string, number> = {}
    for (const r of runRows) {
      const k = dayKey(r.created_at)
      runsByDay[k] = (runsByDay[k] ?? 0) + 1
      const it = r.input_tokens ?? 0
      const ot = r.output_tokens ?? Math.max(0, (r.tokens ?? 0) - it)
      costByDay[k] = (costByDay[k] ?? 0) + costOf(r.model ?? '', it, ot)
    }
    const trends = days.map((d) => ({
      day: d,
      papers: papersByDay[d] ?? 0,
      runs: runsByDay[d] ?? 0,
      cost: Number((costByDay[d] ?? 0).toFixed(4)),
    }))

    return json({
      stats: {
        papers: papersCnt,
        users: users.length,
        humans,
        ais,
        filledSections,
        comments,
        refs,
        aiRuns: runRows.length,
        seedCount,
        totalCost: Number(totalCost.toFixed(4)),
        totalTokens,
      },
      statusDist,
      users,
      usage: {
        byModel: Object.entries(byModel).map(([model, v]) => ({ model, ...v, cost: Number(v.cost.toFixed(4)) })),
        byRole,
        recent: runRows.slice(0, 50).map((r) => {
          const it = r.input_tokens ?? 0
          const ot = r.output_tokens ?? Math.max(0, (r.tokens ?? 0) - it)
          return {
            model: r.model,
            provider: r.provider,
            role: r.role,
            inTok: it,
            outTok: ot,
            cost: Number(costOf(r.model ?? '', it, ot).toFixed(4)),
            created_at: r.created_at,
            paper: titleById[r.paper_id] ?? null,
          }
        }),
      },
      trends,
      papers: papersDetailed,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
