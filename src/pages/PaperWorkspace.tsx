import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import TeamBuilder from '../components/TeamBuilder'
import { getPaper, setTeam } from '../lib/store'
import { FORMAT_LABEL, ROLE_LABEL, STATUS_LABEL, type TeamMember } from '../types'

const KCI_SECTIONS = ['국문초록', '서론', '이론적 배경', '연구방법', '연구결과', '논의', '결론', '참고문헌']
const IMRAD_SECTIONS = ['Abstract', 'Introduction', 'Related Work', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References']

export default function PaperWorkspace() {
  const { id } = useParams()
  const [paper, setPaper] = useState(() => (id ? getPaper(id) : undefined))
  const [tab, setTab] = useState<'team' | 'outline'>('team')

  if (!paper) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-ink-500">논문을 찾을 수 없습니다.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-gold-600 hover:underline">
            ← 내 논문으로
          </Link>
        </div>
      </div>
    )
  }

  const sections = paper.format === 'imrad' ? IMRAD_SECTIONS : KCI_SECTIONS

  function handleSaveTeam(members: TeamMember[]) {
    if (!paper) return
    setTeam(paper.id, members)
    setPaper(getPaper(paper.id))
    setTab('outline')
  }

  const humans = paper.members.filter((m) => m.type === 'human')
  const ais = paper.members.filter((m) => m.type === 'ai')

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/dashboard" className="text-sm text-ink-500 hover:text-ink-900">
          ← 내 논문
        </Link>

        {/* 헤더 */}
        <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-ink-400">{paper.cluster}</span>
            <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">
              {STATUS_LABEL[paper.status]}
            </span>
            {paper.seed && (
              <span className="rounded-full bg-ink-900/5 px-3 py-1 text-xs text-ink-500">제공 주제</span>
            )}
          </div>
          <h1 className="mt-3 font-serif text-2xl font-bold leading-snug">{paper.title}</h1>
          {paper.titleEn && <p className="mt-1 text-sm italic text-ink-400">{paper.titleEn}</p>}
          <p className="mt-4 leading-relaxed text-ink-600">{paper.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-lg border border-ink-200 px-3 py-1 text-xs text-ink-600">
              {FORMAT_LABEL[paper.format]}
            </span>
            {paper.method && (
              <span className="rounded-lg border border-ink-200 px-3 py-1 text-xs text-ink-600">
                방법론 · {paper.method}
              </span>
            )}
            {paper.keywords.map((k) => (
              <span key={k} className="rounded-lg bg-ink-50 px-3 py-1 text-xs text-ink-400">
                #{k}
              </span>
            ))}
          </div>

          {/* 현재 팀 요약 */}
          {paper.members.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-100 pt-5">
              {humans.map((m) => (
                <span key={m.id} className="rounded-full bg-ink-900 px-3 py-1 text-xs text-white">
                  {m.name || '이름 미정'} · {ROLE_LABEL[m.role]}
                </span>
              ))}
              {ais.map((m) => (
                <span key={m.id} className="rounded-full bg-gold-500 px-3 py-1 text-xs font-medium text-ink-900">
                  {ROLE_LABEL[m.role]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="mt-8 flex gap-2 border-b border-ink-200">
          <TabBtn active={tab === 'team'} onClick={() => setTab('team')}>
            팀 구성
          </TabBtn>
          <TabBtn active={tab === 'outline'} onClick={() => setTab('outline')}>
            논문 구성
          </TabBtn>
        </div>

        <div className="mt-8">
          {tab === 'team' ? (
            <TeamBuilder initial={paper.members} onSave={handleSaveTeam} />
          ) : (
            <Outline sections={sections} teamReady={paper.members.length > 0} />
          )}
        </div>
      </main>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active ? 'border-gold-500 text-ink-900' : 'border-transparent text-ink-400 hover:text-ink-700'
      }`}
    >
      {children}
    </button>
  )
}

function Outline({ sections, teamReady }: { sections: string[]; teamReady: boolean }) {
  return (
    <div>
      {!teamReady && (
        <div className="mb-6 rounded-xl border border-dashed border-gold-400 bg-gold-500/5 p-5 text-sm text-ink-600">
          먼저 <b>팀 구성</b> 탭에서 팀을 만들면, 각 섹션을 팀원에게 배정하고 AI 초안을 요청할 수 있습니다.
        </div>
      )}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={s} className="flex items-center gap-4 rounded-xl border border-ink-200 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-600">
              {i + 1}
            </span>
            <span className="flex-1 font-medium">{s}</span>
            <button
              disabled={!teamReady}
              className="rounded-full border border-ink-300 px-4 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              AI 초안 요청
            </button>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-ink-400">
        섹션 에디터와 AI 초안 생성(Claude 연동)은 다음 단계에서 연결됩니다.
      </p>
    </div>
  )
}
