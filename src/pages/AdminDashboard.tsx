import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../lib/auth'
import { isAdmin } from '../lib/admin'
import { supabase } from '../lib/supabase'
import { STATUS_LABEL, type PaperStatus } from '../types'

interface AdminData {
  stats: {
    papers: number
    users: number
    humans: number
    ais: number
    filledSections: number
    comments: number
    refs: number
    aiRuns: number
    seedCount: number
    totalCost: number
    totalTokens: number
  }
  statusDist: Record<string, number>
  users: { id: string; email: string; created_at: string; last_sign_in_at: string | null; papers: number }[]
  usage: {
    byModel: { model: string; runs: number; inTok: number; outTok: number; cost: number }[]
    byRole: Record<string, number>
  }
  trends: { day: string; papers: number; runs: number; cost: number }[]
  recent: {
    id: string
    title: string
    status: PaperStatus
    seed: boolean
    format: string
    created_at: string
    owner_id: string
  }[]
}

const ROLE_LABEL: Record<string, string> = {
  ai_writer: '집필',
  ai_reviewer: '검토',
  ai_editor: '교정',
  ai_integrity: '윤리점검',
  ai_assist: '편집도우미',
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const admin = isAdmin(user?.email)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    supabase.functions
      .invoke('withpaper-admin')
      .then(({ data, error }) => {
        if (error || data?.error) setError(data?.error || '집계를 불러오지 못했습니다. (Edge Function 배포 필요)')
        else {
          setData(data as AdminData)
          setError('')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!admin) {
      setLoading(false)
      return
    }
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
          <Link to="/dashboard" className="mt-4 inline-block text-gold-600 hover:underline">
            ← 내 논문으로
          </Link>
        </div>
      </div>
    )
  }

  const s = data?.stats
  const statusEntries = Object.entries(data?.statusDist ?? {}) as [PaperStatus, number][]
  const statusMax = Math.max(1, ...statusEntries.map(([, n]) => n))

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">관리자 대시보드</h1>
            <p className="mt-2 text-ink-600">플랫폼 전체 논문·사용자·활동·AI 사용 현황</p>
          </div>
          <button onClick={load} className="rounded-full border border-ink-300 px-4 py-2 text-sm hover:border-ink-900">
            새로고침
          </button>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-6 text-sm text-amber-700">
            {error}
            <div className="mt-2 text-xs text-amber-600">
              배포: <code>supabase functions deploy withpaper-admin</code> · 마이그레이션: <code>schema-airuns.sql</code>
            </div>
          </div>
        ) : (
          s && data && (
            <div className="mt-8 space-y-8">
              {/* 통계 타일 */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Tile label="논문" value={s.papers} accent />
                <Tile label="사용자" value={s.users} />
                <Tile label="작성된 섹션" value={s.filledSections} />
                <Tile label="사람 팀원" value={s.humans} />
                <Tile label="AI 팀원" value={s.ais} />
                <Tile label="AI 실행" value={s.aiRuns} />
                <Tile label="코멘트" value={s.comments} />
                <Tile label="참고문헌" value={s.refs} />
                <Tile label="제공 주제" value={s.seedCount} />
                <Tile label="총 토큰" value={s.totalTokens} />
                <Tile label="AI 비용" text={`$${s.totalCost.toFixed(2)}`} accent />
              </div>

              {/* 기간별 추이 */}
              <div className="grid gap-4 lg:grid-cols-3">
                <TrendCard title="논문 생성 (30일)" data={data.trends} pick={(t) => t.papers} color="var(--color-ink-700)" />
                <TrendCard title="AI 실행 (30일)" data={data.trends} pick={(t) => t.runs} color="var(--color-gold-500)" />
                <TrendCard title="AI 비용 $ (30일)" data={data.trends} pick={(t) => t.cost} color="#16a34a" money />
              </div>

              {/* AI 사용량·비용 + 상태분포 */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-ink-200 bg-white p-6">
                  <h2 className="font-bold">AI 사용량·비용 (모델별)</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                          <th className="py-2 pr-3">모델</th>
                          <th className="py-2 pr-3 text-right">실행</th>
                          <th className="py-2 pr-3 text-right">입력토큰</th>
                          <th className="py-2 pr-3 text-right">출력토큰</th>
                          <th className="py-2 text-right">비용</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.usage.byModel.length === 0 && (
                          <tr><td colSpan={5} className="py-6 text-center text-ink-400">AI 실행 기록 없음</td></tr>
                        )}
                        {data.usage.byModel.map((m) => (
                          <tr key={m.model} className="border-b border-ink-100">
                            <td className="py-2 pr-3 font-medium">{m.model}</td>
                            <td className="py-2 pr-3 text-right">{m.runs}</td>
                            <td className="py-2 pr-3 text-right text-ink-500">{m.inTok.toLocaleString()}</td>
                            <td className="py-2 pr-3 text-right text-ink-500">{m.outTok.toLocaleString()}</td>
                            <td className="py-2 text-right font-semibold text-green-700">${m.cost.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(data.usage.byRole).map(([r, n]) => (
                      <span key={r} className="rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-600">
                        {ROLE_LABEL[r] ?? r} {n}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-6">
                  <h2 className="font-bold">논문 상태 분포</h2>
                  <div className="mt-4 space-y-2">
                    {statusEntries.map(([st, n]) => (
                      <div key={st} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-sm text-ink-600">{STATUS_LABEL[st] ?? st}</span>
                        <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <div className="h-full rounded-full bg-gold-500" style={{ width: `${(n / statusMax) * 100}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink-700">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 사용자별 상세 */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6">
                <h2 className="font-bold">사용자별 상세 <span className="text-sm font-normal text-ink-400">· {data.users.length}명</span></h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                        <th className="py-2 pr-3">이메일</th>
                        <th className="py-2 pr-3 text-right">논문</th>
                        <th className="py-2 pr-3">가입일</th>
                        <th className="py-2">최근 로그인</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((u) => (
                        <tr key={u.id} className="border-b border-ink-100">
                          <td className="py-2 pr-3 font-medium">{u.email}</td>
                          <td className="py-2 pr-3 text-right">{u.papers}</td>
                          <td className="py-2 pr-3 text-ink-500">{(u.created_at ?? '').slice(0, 10)}</td>
                          <td className="py-2 text-ink-400">{(u.last_sign_in_at ?? '').slice(0, 10) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 최근 논문 + 열람/삭제 */}
              <div className="rounded-2xl border border-ink-200 bg-white p-6">
                <h2 className="font-bold">최근 논문 30건</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                        <th className="py-2 pr-3">제목</th>
                        <th className="py-2 pr-3">상태</th>
                        <th className="py-2 pr-3">형식</th>
                        <th className="py-2 pr-3">생성</th>
                        <th className="py-2 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((p) => (
                        <tr key={p.id} className="border-b border-ink-100">
                          <td className="max-w-md truncate py-2 pr-3 font-medium">{p.title}</td>
                          <td className="py-2 pr-3 text-ink-600">{STATUS_LABEL[p.status] ?? p.status}</td>
                          <td className="py-2 pr-3 text-ink-500">{p.format?.toUpperCase()}</td>
                          <td className="py-2 pr-3 text-ink-400">{(p.created_at ?? '').slice(0, 10)}</td>
                          <td className="py-2 text-right">
                            <Link to={`/paper/${p.id}`} className="mr-3 text-gold-600 hover:underline">열람</Link>
                            <button onClick={() => del(p.id, p.title)} className="text-red-500 hover:underline">삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  )
}

function Tile({ label, value, text, accent }: { label: string; value?: number; text?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-gold-400 bg-gold-500/10' : 'border-ink-200 bg-white'}`}>
      <div className="font-serif text-2xl font-bold text-ink-900">{text ?? (value ?? 0).toLocaleString()}</div>
      <div className="mt-1 text-sm text-ink-500">{label}</div>
    </div>
  )
}

function TrendCard({
  title,
  data,
  pick,
  color,
  money,
}: {
  title: string
  data: { day: string; papers: number; runs: number; cost: number }[]
  pick: (t: { day: string; papers: number; runs: number; cost: number }) => number
  color: string
  money?: boolean
}) {
  const vals = data.map(pick)
  const max = Math.max(1, ...vals)
  const total = vals.reduce((a, b) => a + b, 0)
  const w = 100 / data.length
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
        <span className="text-sm font-bold text-ink-900">{money ? `$${total.toFixed(2)}` : total.toLocaleString()}</span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-3 h-24 w-full">
        {vals.map((v, i) => (
          <rect
            key={i}
            x={i * w + w * 0.15}
            y={40 - (v / max) * 40}
            width={w * 0.7}
            height={(v / max) * 40}
            fill={color}
            rx="0.5"
          >
            <title>{data[i].day}: {money ? `$${v.toFixed(3)}` : v}</title>
          </rect>
        ))}
      </svg>
    </div>
  )
}
