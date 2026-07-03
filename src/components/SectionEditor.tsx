import { useEffect, useMemo, useState } from 'react'
import type { Paper } from '../types'
import { sectionsFor } from '../data/sections'
import { loadSections, saveSection } from '../lib/papers'
import { requestAi, type AiRole } from '../lib/ai'

export default function SectionEditor({ paper, userId }: { paper: Paper; userId?: string }) {
  const sections = useMemo(() => sectionsFor(paper.format), [paper.format])
  const [content, setContent] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(sections[0].kind)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState<AiRole | null>(null)
  const [aiText, setAiText] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    loadSections(paper.id, userId).then((c) => alive && setContent(c))
    return () => {
      alive = false
    }
  }, [paper.id, userId])

  const def = sections.find((s) => s.kind === current)!
  const value = content[current] ?? ''

  function update(v: string) {
    setContent((c) => ({ ...c, [current]: v }))
  }

  async function save() {
    await saveSection(paper.id, current, def.title, content[current] ?? '', userId)
    setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
  }

  async function runAi(role: AiRole) {
    setAiOpen(true)
    setAiLoading(role)
    setAiText('')
    const res = await requestAi({ role, section: def.title, paper, draft: value })
    setAiText(res.text)
    setAiLoading(null)
  }

  function applyToEditor() {
    update(aiText)
    setAiOpen(false)
  }
  function appendToEditor() {
    update((value ? value + '\n\n' : '') + aiText)
    setAiOpen(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* 섹션 목록 */}
      <aside className="space-y-1">
        {sections.map((s, i) => {
          const filled = (content[s.kind] ?? '').trim().length > 0
          return (
            <button
              key={s.kind}
              onClick={() => setCurrent(s.kind)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                current === s.kind ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  filled
                    ? 'bg-gold-500 text-ink-900'
                    : current === s.kind
                      ? 'bg-white/20 text-white'
                      : 'bg-ink-200 text-ink-500'
                }`}
              >
                {filled ? '✓' : i + 1}
              </span>
              {s.title}
            </button>
          )
        })}
      </aside>

      {/* 에디터 */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-xl font-bold">{def.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <AiBtn onClick={() => runAi('ai_writer')} loading={aiLoading === 'ai_writer'}>
              AI 집필
            </AiBtn>
            <AiBtn onClick={() => runAi('ai_reviewer')} loading={aiLoading === 'ai_reviewer'} disabled={!value.trim()}>
              AI 검토
            </AiBtn>
            <AiBtn onClick={() => runAi('ai_editor')} loading={aiLoading === 'ai_editor'} disabled={!value.trim()}>
              AI 교정
            </AiBtn>
          </div>
        </div>

        <textarea
          value={value}
          onChange={(e) => update(e.target.value)}
          onBlur={save}
          placeholder={`「${def.title}」 내용을 작성하거나, AI 집필로 초안을 받아보세요.`}
          className="h-[420px] w-full resize-none rounded-xl border border-ink-200 bg-white p-5 text-sm leading-relaxed outline-none focus:border-gold-500"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
          <span>{value.length.toLocaleString()}자</span>
          <span className="flex items-center gap-3">
            {savedAt && <span>저장됨 · {savedAt}</span>}
            <button onClick={save} className="rounded-full bg-ink-900 px-4 py-1.5 font-medium text-white hover:bg-ink-700">
              저장
            </button>
          </span>
        </div>

        {/* AI 결과 패널 */}
        {aiOpen && (
          <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold">AI 결과 <span className="text-sm font-normal text-ink-400">· Claude</span></h4>
              <button onClick={() => setAiOpen(false)} className="text-sm text-ink-400 hover:text-ink-700">닫기</button>
            </div>
            {aiLoading ? (
              <p className="py-8 text-center text-sm text-ink-400">AI 팀원이 작업하고 있습니다…</p>
            ) : (
              <>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
                  {aiText}
                </pre>
                <div className="mt-3 flex gap-2">
                  <button onClick={applyToEditor} className="rounded-full bg-gold-500 px-4 py-1.5 text-sm font-semibold text-ink-900 hover:bg-gold-400">
                    에디터에 넣기(교체)
                  </button>
                  <button onClick={appendToEditor} className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-700 hover:border-ink-900">
                    아래에 이어붙이기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AiBtn({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="rounded-full border border-ink-300 px-4 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? '작업 중…' : children}
    </button>
  )
}
