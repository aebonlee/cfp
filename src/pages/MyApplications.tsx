import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../lib/auth'
import { loadMyApplicationList, withdrawApplication } from '../lib/papers'
import type { Application } from '../types'

type MyApp = Application & { paperTitle: string }

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  accepted: '참여 승인됨',
  rejected: '반려됨',
}

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth()
  const [apps, setApps] = useState<MyApp[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!user?.id) return
    setLoading(true)
    loadMyApplicationList(user.id)
      .then(setApps)
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) { setLoading(false); return }
    load()
  }, [authLoading, user?.id, load])

  async function withdraw(a: MyApp) {
    if (!window.confirm(`'${a.paperTitle}'\n신청을 철회할까요?`)) return
    setBusy(a.id)
    const { error } = await withdrawApplication(a.id)
    setBusy(null)
    if (error) alert('철회 실패: ' + error)
    else setApps((list) => list.filter((x) => x.id !== a.id))
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-serif text-3xl font-bold">내 신청 현황</h1>
        <p className="mt-2 text-ink-600">모집 게시판에서 참여 신청한 논문과 처리 상태입니다.</p>

        {!user ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ink-300 p-12 text-center text-sm text-ink-400">
            로그인하면 신청 현황을 볼 수 있습니다.
          </div>
        ) : loading ? (
          <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>
        ) : apps.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ink-300 p-12 text-center text-sm text-ink-400">
            아직 신청한 논문이 없습니다.
            <Link to="/recruit" className="ml-2 text-gold-600 hover:underline">모집 게시판 보기 →</Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl border border-ink-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-serif text-lg font-bold leading-snug">{a.paperTitle}</h3>
                    <p className="mt-1 text-xs text-ink-400">신청일 {a.createdAt.slice(0, 10)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                {a.message && (
                  <p className="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-600">“{a.message}”</p>
                )}
                {a.status === 'rejected' && a.rejectReason && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    <b>거절 사유:</b> {a.rejectReason}
                  </p>
                )}
                {a.status === 'accepted' && (
                  <Link
                    to={`/paper/${a.paperId}`}
                    className="mt-3 inline-block text-sm font-medium text-gold-600 hover:underline"
                  >
                    논문 워크스페이스 열기 →
                  </Link>
                )}
                {a.status === 'pending' && (
                  <div className="mt-3">
                    <button
                      onClick={() => withdraw(a)}
                      disabled={busy === a.id}
                      className="rounded-full border border-ink-300 px-4 py-1.5 text-sm text-ink-600 transition hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                    >
                      {busy === a.id ? '철회 중…' : '신청 철회'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
