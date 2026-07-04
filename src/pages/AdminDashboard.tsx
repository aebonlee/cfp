import { useEffect, useState } from 'react'
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
  }
  statusDist: Record<string, number>
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

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const admin = isAdmin(user?.email)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!admin) {
      setLoading(false)
      return
    }
    let alive = true
    supabase.functions
      .invoke('withpaper-admin')
      .then(({ data, error }) => {
        if (!alive) return
        if (error || data?.error) setError(data?.error || '집계를 불러오지 못했습니다. (Edge Function 배포 필요)')
        else setData(data as AdminData)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [admin, authLoading])

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
        <h1 className="font-serif text-3xl font-bold">관리자 대시보드</h1>
        <p className="mt-2 text-ink-600">플랫폼 전체 논문·사용자·활동 현황</p>

        {loading ? (
          <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-6 text-sm text-amber-700">
            {error}
            <div className="mt-2 text-xs text-amber-600">
              배포: <code>supabase functions deploy withpaper-admin</code>
            </div>
          </div>
        ) : (
          s && (
            <>
              {/* 통계 타일 */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <Tile label="논문" value={s.papers} accent />
                <Tile label="사용자" value={s.users} />
                <Tile label="작성된 섹션" value={s.filledSections} />
                <Tile label="사람 팀원" value={s.humans} />
                <Tile label="AI 팀원" value={s.ais} />
                <Tile label="코멘트" value={s.comments} />
                <Tile label="참고문헌" value={s.refs} />
                <Tile label="AI 실행" value={s.aiRuns} />
                <Tile label="제공 주제" value={s.seedCount} />
              </div>

              {/* 상태 분포 */}
              <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6">
                <h2 className="font-bold">논문 상태 분포</h2>
                <div className="mt-4 space-y-2">
                  {statusEntries.length === 0 && <p className="text-sm text-ink-400">데이터 없음</p>}
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

              {/* 최근 논문 */}
              <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6">
                <h2 className="font-bold">최근 논문 25건</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                        <th className="py-2 pr-3">제목</th>
                        <th className="py-2 pr-3">상태</th>
                        <th className="py-2 pr-3">형식</th>
                        <th className="py-2 pr-3">구분</th>
                        <th className="py-2">생성</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((p) => (
                        <tr key={p.id} className="border-b border-ink-100">
                          <td className="max-w-md truncate py-2 pr-3 font-medium">{p.title}</td>
                          <td className="py-2 pr-3 text-ink-600">{STATUS_LABEL[p.status] ?? p.status}</td>
                          <td className="py-2 pr-3 text-ink-500">{p.format?.toUpperCase()}</td>
                          <td className="py-2 pr-3 text-ink-500">{p.seed ? '제공주제' : '직접'}</td>
                          <td className="py-2 text-ink-400">{(p.created_at ?? '').slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}
      </main>
    </div>
  )
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-gold-400 bg-gold-500/10' : 'border-ink-200 bg-white'}`}>
      <div className="font-serif text-3xl font-bold text-ink-900">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-ink-500">{label}</div>
    </div>
  )
}
