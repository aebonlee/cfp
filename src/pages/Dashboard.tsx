import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { getPapers } from '../lib/store'
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
  const papers = getPapers()
  const clusters = useMemo(() => ['전체', ...Array.from(new Set(papers.map((p) => p.cluster)))], [papers])
  const [filter, setFilter] = useState('전체')

  const shown = filter === '전체' ? papers : papers.filter((p) => p.cluster === filter)

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">내 논문</h1>
            <p className="mt-2 text-ink-600">
              등록된 주제 {papers.length}편 · 주제를 골라 팀을 구성하고 게재까지 함께 완성하세요.
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
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {shown.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
        </div>
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
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[paper.status]}`}>
          {STATUS_LABEL[paper.status]}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-lg font-bold leading-snug group-hover:text-gold-600">{paper.title}</h3>
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
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
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
