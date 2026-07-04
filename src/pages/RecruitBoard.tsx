import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import LoginModal from '../components/LoginModal'
import { useAuth } from '../lib/auth'
import { loadRecruiting, joinRecruiting } from '../lib/papers'
import { FORMAT_LABEL, type Paper } from '../types'

export default function RecruitBoard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')
  const [loginOpen, setLoginOpen] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadRecruiting()
      .then((list) => alive && setPapers(list))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const clusters = useMemo(() => ['전체', ...Array.from(new Set(papers.map((p) => p.cluster)))], [papers])
  const shown = filter === '전체' ? papers : papers.filter((p) => p.cluster === filter)

  const authorName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '참여자'

  async function join(p: Paper) {
    if (!user) {
      setLoginOpen(true)
      return
    }
    setJoining(p.id)
    const { error } = await joinRecruiting(p.id, { id: user.id, name: authorName })
    setJoining(null)
    if (error) alert('참여 신청 실패: ' + error)
    else nav(`/paper/${p.id}`)
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-medium text-ink-600">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            팀원 공개 모집
          </span>
          <h1 className="mt-4 font-serif text-3xl font-bold">함께 쓸 논문을 찾아보세요</h1>
          <p className="mt-2 text-ink-600">
            공개 모집 중인 연구 주제입니다. 관심 있는 주제에 참여 신청하면 공동저자로 합류합니다.
            {!user && ' (참여하려면 로그인이 필요합니다)'}
          </p>
        </div>

        {/* 필터 */}
        {papers.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {clusters.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  filter === c ? 'bg-ink-900 text-white' : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>
        ) : shown.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ink-300 p-12 text-center text-sm text-ink-400">
            아직 공개 모집 중인 논문이 없습니다.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl border border-ink-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-ink-400">{p.cluster}</span>
                  <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">모집 중</span>
                </div>
                <h3 className="mt-3 break-words font-serif text-lg font-bold leading-snug">{p.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-500">{p.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded bg-ink-900/5 px-2 py-0.5 text-xs text-ink-600">{FORMAT_LABEL[p.format].split(' ')[0]}</span>
                  {p.method && <span className="rounded bg-ink-900/5 px-2 py-0.5 text-xs text-ink-600">{p.method}</span>}
                  {p.keywords.slice(0, 3).map((k) => (
                    <span key={k} className="rounded bg-ink-50 px-2 py-0.5 text-xs text-ink-400">#{k}</span>
                  ))}
                </div>
                <button
                  onClick={() => join(p)}
                  disabled={joining === p.id}
                  className="mt-5 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink-700 disabled:opacity-40"
                >
                  {joining === p.id ? '참여 중…' : user ? '참여 신청' : '로그인하고 참여'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
