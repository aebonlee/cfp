import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { loadPapers } from '../lib/papers'
import { useAuth } from '../lib/auth'
import { STATUS_LABEL, type Paper, type PaperStatus } from '../types'

const STATUS_STYLE: Record<PaperStatus, string> = {
  topic: 'bg-ink-100 text-ink-600',
  team: 'bg-blue-100 text-blue-700',
  writing: 'bg-amber-100 text-amber-700',
  review: 'bg-purple-100 text-purple-700',
  ready: 'bg-gold-500/20 text-gold-600',
  published: 'bg-green-100 text-green-700',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadPapers(user?.id, user?.email)
      .then((list) => alive && setPapers(list))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [user?.id, user?.email])

  const clusters = useMemo(() => ['전체', ...Array.from(new Set(papers.map((p) => p.cluster)))], [papers])
  const shown = filter === '전체' ? papers : papers.filter((p) => p.cluster === filter)

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">내 논문</h1>
            <p className="mt-2 text-ink-600">
              등록된 주제 {papers.length}편 · 주제를 골라 팀을 구성하고 게재까지 함께 완성하세요.
              <span className="ml-2 text-xs text-ink-400">
                {user ? '☁ Supabase에 저장됨' : '이 브라우저에 저장됨 · 로그인하면 클라우드 저장'}
              </span>
            </p>
          </div>
          <Link
            to="/new"
            className="rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-gold-400"
          >
            + 새 주제 등록
          </Link>
        </div>

        {/* 갈래 필터 */}
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

        {/* 주제 카드 */}
        {loading ? (
          <p className="mt-16 text-center text-sm text-ink-400">불러오는 중…</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function PaperCard({ paper }: { paper: Paper }) {
  const humans = paper.members.filter((m) => m.type === 'human').length
  const ais = paper.members.filter((m) => m.type === 'ai').length
  return (
    <Link
      to={`/paper/${paper.id}`}
      className="group flex flex-col rounded-2xl border border-ink-200 bg-white p-6 transition hover:border-gold-400 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-400">{paper.cluster}</span>
        <div className="flex items-center gap-1.5">
          {paper.shared && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">공유받음</span>
          )}
          {paper.recruiting && (
            <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-600">모집 중</span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[paper.status]}`}>
            {STATUS_LABEL[paper.status]}
          </span>
        </div>
      </div>
      <h3 className="mt-3 break-words font-serif text-lg font-bold leading-snug group-hover:text-gold-600">{paper.title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-500">{paper.summary}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {paper.method && (
          <span className="rounded bg-ink-900/5 px-2 py-0.5 text-xs text-ink-600">{paper.method}</span>
        )}
        {paper.keywords.slice(0, 3).map((k) => (
          <span key={k} className="rounded bg-ink-50 px-2 py-0.5 text-xs text-ink-400">
            #{k}
          </span>
        ))}
      </div>
      {/* 진행률 */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-ink-400">
          <span>완성도</span>
          <span className="font-semibold text-ink-600">{paper.progress ?? 0}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gold-500 transition-all"
            style={{ width: `${paper.progress ?? 0}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
        <span>
          팀 {paper.members.length === 0 ? '미구성' : `사람 ${humans} · AI ${ais}`}
        </span>
        <span className="font-medium text-gold-600 group-hover:underline">
          {paper.members.length === 0 ? '팀 구성하기 →' : '워크스페이스 열기 →'}
        </span>
      </div>
    </Link>
  )
}
