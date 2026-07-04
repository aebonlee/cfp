import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../lib/auth'
import { isAdmin } from '../lib/admin'
import { supabase } from '../lib/supabase'
import { STATUS_LABEL, type PaperStatus } from '../types'

interface PaperRow {
  id: string
  title: string
  status: PaperStatus
  seed: boolean
  format: string
  created_at: string
  owner_id: string
  owner_email: string
  sections: number
}
interface RunRow {
  model: string
  provider: string
  role: string
  inTok: number
  outTok: number
  cost: number
  created_at: string
  paper: string | null
}
interface AdminData {
  stats: {
    papers: number; users: number; humans: number; ais: number; filledSections: number
    comments: number; refs: number; aiRuns: number; seedCount: number; totalCost: number; totalTokens: number
  }
  statusDist: Record<string, number>
  users: { id: string; email: string; created_at: string; last_sign_in_at: string | null; papers: number }[]
  usage: { byModel: { model: string; runs: number; inTok: number; outTok: number; cost: number }[]; byRole: Record<string, number>; recent: RunRow[] }
  trends: { day: string; papers: number; runs: number; cost: number }[]
  papers: PaperRow[]
}

const ROLE_LABEL: Record<string, string> = {
  ai_writer: '집필', ai_reviewer: '검토', ai_editor: '교정', ai_integrity: '윤리점검', ai_assist: '편집도우미',
}
const STATUS_STYLE: Record<string, string> = {
  topic: 'bg-ink-100 text-ink-600', team: 'bg-blue-100 text-blue-700', writing: 'bg-amber-100 text-amber-700',
  review: 'bg-purple-100 text-purple-700', ready: 'bg-gold-500/20 text-gold-600', published: 'bg-green-100 text-green-700',
}

type View = 'overview' | 'papers' | 'users' | 'usage' | 'trends'
const MENU: { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: '개요', icon: '▤' },
  { id: 'papers', label: '논문', icon: '▦' },
  { id: 'users', label: '사용자', icon: '◍' },
  { id: 'usage', label: 'AI 사용량·비용', icon: '⌁' },
  { id: 'trends', label: '기간별 추이', icon: '⇗' },
]

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const admin = isAdmin(user?.email)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('overview')
  const [ownerFilter, setOwnerFilter] = useState<string>('')

  const load = useCallback(() => {
    setLoading(true)
    supabase.functions
      .invoke('withpaper-admin')
      .then(({ data, error }) => {
        if (error || data?.error) setError(data?.error || '집계를 불러오지 못했습니다. (Edge Function 배포 필요)')
        else { setData(data as AdminData); setError('') }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!admin) { setLoading(false); return }
    load()
  }, [admin, authLoading, load])

  async function del(id: string, title: string) {
    if (!window.confirm(`'${title}'\n이 논문과 모든 하위 데이터를 삭제할까요? 되돌릴 수 없습니다.`)) return
    const { data: r, error } = await supabase.functions.invoke('withpaper-admin', { body: { action: 'delete', paperId: id } })
    if (error || r?.error) alert('삭제 실패: ' + (r?.error || error?.message))
    else load()
  }

  if (!authLoading && !admin) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-ink-500">관리자만 접근할 수 있습니다.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-gold-600 hover:underline">← 내 논문으로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-3xl font-bold">관리자 대시보드</h1>
          <button onClick={load} className="rounded-full border border-ink-300 px-4 py-2 text-sm hover:border-ink-900">새로고침</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[210px_1fr]">
          {/* 사이드바 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
              {MENU.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setView(m.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                    view === m.id ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  <span className="text-ink-400">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* 콘텐츠 */}
          <section className="min-w-0">
            {loading ? (
              <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>
            ) : error ? (
              <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-6 text-sm text-amber-700">
                {error}
                <div className="mt-2 text-xs text-amber-600">
                  배포: <code>supabase functions deploy withpaper-admin</code>
                </div>
              </div>
            ) : (
              data && (
                <>
                  {view === 'overview' && <Overview data={data} />}
                  {view === 'papers' && (
                    <Papers data={data} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} onDelete={del} />
                  )}
                  {view === 'users' && (
                    <Users data={data} onPick={(email) => { setOwnerFilter(email); setView('papers') }} />
                  )}
                  {view === 'usage' && <Usage data={data} />}
                  {view === 'trends' && <Trends data={data} />}
                </>
              )
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

/* ── 개요 ── */
function Overview({ data }: { data: AdminData }) {
  const s = data.stats
  const entries = Object.entries(data.statusDist) as [PaperStatus, number][]
  const max = Math.max(1, ...entries.map(([, n]) => n))
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        <Tile label="논문" value={s.papers} accent />
        <Tile label="사용자" value={s.users} />
        <Tile label="작성된 섹션" value={s.filledSections} />
        <Tile label="AI 실행" value={s.aiRuns} />
        <Tile label="사람 팀원" value={s.humans} />
        <Tile label="AI 팀원" value={s.ais} />
        <Tile label="코멘트" value={s.comments} />
        <Tile label="참고문헌" value={s.refs} />
        <Tile label="제공 주제" value={s.seedCount} />
        <Tile label="총 토큰" value={s.totalTokens} />
        <Tile label="AI 비용" text={`$${s.totalCost.toFixed(2)}`} accent />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendCard title="논문 생성 (30일)" data={data.trends} pick={(t) => t.papers} color="var(--color-ink-700)" />
        <TrendCard title="AI 실행 (30일)" data={data.trends} pick={(t) => t.runs} color="var(--color-gold-500)" />
        <TrendCard title="AI 비용 $ (30일)" data={data.trends} pick={(t) => t.cost} color="#16a34a" money />
      </div>
      <Card title="논문 상태 분포">
        <div className="space-y-2">
          {entries.map(([st, n]) => (
            <div key={st} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-ink-600">{STATUS_LABEL[st] ?? st}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink-700">{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ── 논문 ── */
function Papers({
  data, ownerFilter, setOwnerFilter, onDelete,
}: {
  data: AdminData; ownerFilter: string; setOwnerFilter: (v: string) => void; onDelete: (id: string, t: string) => void
}) {
  const [status, setStatus] = useState<string>('all')
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    return data.papers.filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!ownerFilter || p.owner_email === ownerFilter) &&
        (!q || p.title.toLowerCase().includes(q.toLowerCase())),
    )
  }, [data.papers, status, ownerFilter, q])
  const statuses = ['all', 'topic', 'team', 'writing', 'review', 'ready', 'published']
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-xl font-bold">논문 <span className="text-sm font-normal text-ink-400">· {shown.length}건</span></h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목 검색"
          className="ml-auto rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-gold-500" />
      </div>
      {ownerFilter && (
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{ownerFilter}</span>
          로 필터 중
          <button onClick={() => setOwnerFilter('')} className="text-gold-600 hover:underline">해제</button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {statuses.map((st) => (
          <button key={st} onClick={() => setStatus(st)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              status === st ? 'bg-ink-900 text-white' : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-900'
            }`}>
            {st === 'all' ? '전체' : STATUS_LABEL[st as PaperStatus]}
          </button>
        ))}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                <th className="py-2 pr-3">제목</th><th className="py-2 pr-3">소유자</th><th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3">형식</th><th className="py-2 pr-3 text-right">섹션</th><th className="py-2 pr-3">생성</th>
                <th className="py-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-ink-100">
                  <td className="max-w-sm truncate py-2 pr-3 font-medium">{p.title}</td>
                  <td className="py-2 pr-3 text-ink-500">{p.owner_email}</td>
                  <td className="py-2 pr-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status] ?? p.status}</span></td>
                  <td className="py-2 pr-3 text-ink-500">{p.format?.toUpperCase()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{p.sections}</td>
                  <td className="py-2 pr-3 text-ink-400 tabular-nums">{(p.created_at ?? '').slice(0, 10)}</td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <Link to={`/paper/${p.id}`} className="mr-3 text-gold-600 hover:underline">열람</Link>
                    <button onClick={() => onDelete(p.id, p.title)} className="text-red-500 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-ink-400">해당 논문이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ── 사용자 ── */
function Users({ data, onPick }: { data: AdminData; onPick: (email: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold">사용자 <span className="text-sm font-normal text-ink-400">· {data.users.length}명</span></h2>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                <th className="py-2 pr-3">이메일</th><th className="py-2 pr-3 text-right">논문</th>
                <th className="py-2 pr-3">가입일</th><th className="py-2 pr-3">최근 로그인</th><th className="py-2 text-right">논문 보기</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-ink-100">
                  <td className="py-2 pr-3 font-medium">{u.email}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.papers}</td>
                  <td className="py-2 pr-3 text-ink-500 tabular-nums">{(u.created_at ?? '').slice(0, 10)}</td>
                  <td className="py-2 pr-3 text-ink-400 tabular-nums">{(u.last_sign_in_at ?? '').slice(0, 10) || '—'}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => onPick(u.email)} disabled={!u.papers}
                      className="text-gold-600 hover:underline disabled:cursor-not-allowed disabled:text-ink-300">
                      논문 {u.papers}건 →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ── AI 사용량·비용 ── */
function Usage({ data }: { data: AdminData }) {
  const s = data.stats
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Tile label="총 AI 실행" value={s.aiRuns} />
        <Tile label="총 토큰" value={s.totalTokens} />
        <Tile label="총 비용" text={`$${s.totalCost.toFixed(2)}`} accent />
        <Tile label="모델 수" value={data.usage.byModel.length} />
      </div>
      <Card title="모델별 사용량·비용">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                <th className="py-2 pr-3">모델</th><th className="py-2 pr-3 text-right">실행</th>
                <th className="py-2 pr-3 text-right">입력토큰</th><th className="py-2 pr-3 text-right">출력토큰</th><th className="py-2 text-right">비용</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.byModel.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-ink-400">AI 실행 기록 없음</td></tr>}
              {data.usage.byModel.map((m) => (
                <tr key={m.model} className="border-b border-ink-100">
                  <td className="py-2 pr-3 font-medium">{m.model}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{m.runs}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-500">{m.inTok.toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-500">{m.outTok.toLocaleString()}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-green-700">${m.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(data.usage.byRole).map(([r, n]) => (
            <span key={r} className="rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-600">{ROLE_LABEL[r] ?? r} {n}</span>
          ))}
        </div>
      </Card>
      <Card title="최근 AI 실행 50건">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                <th className="py-2 pr-3">시각</th><th className="py-2 pr-3">역할</th><th className="py-2 pr-3">모델</th>
                <th className="py-2 pr-3">논문</th><th className="py-2 pr-3 text-right">토큰</th><th className="py-2 text-right">비용</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.recent.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-400">기록 없음</td></tr>}
              {data.usage.recent.map((r, i) => (
                <tr key={i} className="border-b border-ink-100">
                  <td className="py-2 pr-3 text-ink-400 tabular-nums">{(r.created_at ?? '').slice(5, 16).replace('T', ' ')}</td>
                  <td className="py-2 pr-3">{ROLE_LABEL[r.role] ?? r.role}</td>
                  <td className="py-2 pr-3 text-ink-500">{r.model}</td>
                  <td className="max-w-xs truncate py-2 pr-3 text-ink-500">{r.paper ?? '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{(r.inTok + r.outTok).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-green-700">${r.cost.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ── 추이 ── */
function Trends({ data }: { data: AdminData }) {
  return (
    <div className="space-y-6">
      <BigTrend title="논문 생성 (일별, 최근 30일)" data={data.trends} pick={(t) => t.papers} color="var(--color-ink-700)" />
      <BigTrend title="AI 실행 (일별, 최근 30일)" data={data.trends} pick={(t) => t.runs} color="var(--color-gold-500)" />
      <BigTrend title="AI 비용 $ (일별, 최근 30일)" data={data.trends} pick={(t) => t.cost} color="#16a34a" money />
    </div>
  )
}

/* ── 공통 ── */
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6">
      {title && <h2 className="mb-4 font-bold">{title}</h2>}
      {children}
    </div>
  )
}
function Tile({ label, value, text, accent }: { label: string; value?: number; text?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-gold-400 bg-gold-500/10' : 'border-ink-200 bg-white'}`}>
      <div className="font-serif text-2xl font-bold tabular-nums text-ink-900">{text ?? (value ?? 0).toLocaleString()}</div>
      <div className="mt-1 text-sm text-ink-500">{label}</div>
    </div>
  )
}
type T = { day: string; papers: number; runs: number; cost: number }
function TrendCard({ title, data, pick, color, money }: { title: string; data: T[]; pick: (t: T) => number; color: string; money?: boolean }) {
  const vals = data.map(pick)
  const max = Math.max(1, ...vals)
  const total = vals.reduce((a, b) => a + b, 0)
  const w = 100 / data.length
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
        <span className="text-sm font-bold tabular-nums text-ink-900">{money ? `$${total.toFixed(2)}` : total.toLocaleString()}</span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-24 w-full">
        {vals.map((v, i) => (
          <rect key={i} x={i * w + w * 0.15} y={40 - (v / max) * 40} width={w * 0.7} height={(v / max) * 40} fill={color} rx="0.5">
            <title>{data[i].day}: {money ? `$${v.toFixed(3)}` : v}</title>
          </rect>
        ))}
      </svg>
    </div>
  )
}
function BigTrend({ title, data, pick, color, money }: { title: string; data: T[]; pick: (t: T) => number; color: string; money?: boolean }) {
  const vals = data.map(pick)
  const max = Math.max(1, ...vals)
  const total = vals.reduce((a, b) => a + b, 0)
  const w = 100 / data.length
  const peak = Math.max(...vals)
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold">{title}</h3>
        <span className="text-sm text-ink-500">합계 <b className="text-ink-900">{money ? `$${total.toFixed(2)}` : total.toLocaleString()}</b> · 최대 {money ? `$${peak.toFixed(2)}` : peak}</span>
      </div>
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="mt-4 h-40 w-full">
        <line x1="0" y1="43.5" x2="100" y2="43.5" stroke="var(--color-ink-200)" strokeWidth="0.3" />
        {vals.map((v, i) => (
          <rect key={i} x={i * w + w * 0.15} y={40 - (v / max) * 40} width={w * 0.7} height={(v / max) * 40} fill={color} rx="0.4">
            <title>{data[i].day}: {money ? `$${v.toFixed(3)}` : v}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink-400">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  )
}
