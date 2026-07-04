// withpaper/cfp 관리자 집계 Edge Function
// 관리자 이메일만 허용, service_role 로 전체 wp_ 데이터 집계.
//
// 배포: supabase functions deploy withpaper-admin
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY 는 자동 주입)
// 선택: supabase secrets set ADMIN_EMAILS="a@b.com,c@d.com"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? 'aebon@kyonggi.ac.kr')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // 1) 호출자 인증 + 관리자 확인
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    const email = user?.email?.toLowerCase()
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return json({ error: '관리자 권한이 없습니다.' }, 403)
    }

    // 2) service_role 로 전체 집계
    const db = createClient(SUPABASE_URL, SERVICE)
    const count = async (t: string, f?: (q: any) => any) => {
      let q = db.from(t).select('*', { count: 'exact', head: true })
      if (f) q = f(q)
      const { count } = await q
      return count ?? 0
    }

    const [papers, humans, ais, comments, refs, aiRuns] = await Promise.all([
      count('wp_papers'),
      count('wp_paper_members', (q) => q.eq('type', 'human')),
      count('wp_paper_members', (q) => q.eq('type', 'ai')),
      count('wp_comments'),
      count('wp_references'),
      count('wp_ai_runs'),
    ])

    const { data: secs } = await db.from('wp_sections').select('content')
    const filledSections = (secs ?? []).filter((s: { content: string }) => (s.content ?? '').trim()).length

    const { data: pRows } = await db.from('wp_papers').select('owner_id, status, seed')
    const users = new Set((pRows ?? []).map((r: { owner_id: string }) => r.owner_id)).size
    const statusDist: Record<string, number> = {}
    let seedCount = 0
    for (const r of pRows ?? []) {
      statusDist[r.status] = (statusDist[r.status] ?? 0) + 1
      if (r.seed) seedCount++
    }

    const { data: recent } = await db
      .from('wp_papers')
      .select('id, title, status, seed, format, created_at, owner_id')
      .order('created_at', { ascending: false })
      .limit(25)

    return json({
      stats: { papers, users, humans, ais, filledSections, comments, refs, aiRuns, seedCount },
      statusDist,
      recent: recent ?? [],
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
