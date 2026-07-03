import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import TeamBuilder from '../components/TeamBuilder'
import SectionEditor from '../components/SectionEditor'
import ReferencesPanel from '../components/ReferencesPanel'
import SubmissionPanel from '../components/SubmissionPanel'
import { loadPaper, saveTeam } from '../lib/papers'
import { useAuth } from '../lib/auth'
import { FORMAT_LABEL, ROLE_LABEL, STATUS_LABEL, type Paper, type TeamMember } from '../types'

export default function PaperWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const [paper, setPaper] = useState<Paper | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'team' | 'outline' | 'refs' | 'submit'>('team')

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadPaper(id!, user?.id)
      .then((p) => alive && setPaper(p))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id, user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <AppHeader />
        <p className="py-24 text-center text-sm text-ink-400">불러오는 중…</p>
      </div>
    )
  }

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

  async function handleSaveTeam(members: TeamMember[]) {
    if (!paper) return
    await saveTeam(paper.id, members, user?.id)
    setPaper(await loadPaper(paper.id, user?.id))
    setTab('outline')
  }

  const humans = paper.members.filter((m) => m.type === 'human')
  const ais = paper.members.filter((m) => m.type === 'ai')
  const authorName =
    user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '이애본'

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-10">
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
            {paper.shared && (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">공유받음</span>
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
                  {m.email && <span className="ml-1 text-white/60">· {m.email}</span>}
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
            집필 · 논문 구성
          </TabBtn>
          <TabBtn active={tab === 'refs'} onClick={() => setTab('refs')}>
            참고문헌
          </TabBtn>
          <TabBtn active={tab === 'submit'} onClick={() => setTab('submit')}>
            게재 준비
          </TabBtn>
        </div>

        <div className="mt-8">
          {tab === 'team' ? (
            <TeamBuilder initial={paper.members} onSave={handleSaveTeam} />
          ) : tab === 'refs' ? (
            <ReferencesPanel paper={paper} userId={user?.id} />
          ) : tab === 'submit' ? (
            <SubmissionPanel paper={paper} userId={user?.id} />
          ) : paper.members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gold-400 bg-gold-500/5 p-6 text-center text-sm text-ink-600">
              먼저 <b>팀 구성</b> 탭에서 팀을 만들면 섹션별 집필과 AI 집필·검토·교정을 시작할 수 있습니다.
            </div>
          ) : (
            <SectionEditor paper={paper} userId={user?.id} userName={authorName} />
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

