import { useEffect, useMemo, useRef, useState } from 'react'
import type { Comment, Paper, Reference } from '../types'
import type { SectionDef } from '../data/sections'
import {
  loadSections,
  saveSection,
  loadComments,
  addComment,
  resolveComment,
  removeComment,
  loadReferences,
} from '../lib/papers'
import { requestAi, type AiRole } from '../lib/ai'
import { getHistory, pushHistory, type Snapshot } from '../lib/store'
import { renderMarkdownBlock } from '../lib/markdown'
import CommentThread from './CommentThread'

export default function SectionEditor({
  paper,
  userId,
  userName = '작성자',
  sections,
}: {
  paper: Paper
  userId?: string
  userName?: string
  sections: SectionDef[]
}) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(sections[0].kind)
  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  const [comments, setComments] = useState<Comment[]>([])
  const [refs, setRefs] = useState<Reference[]>([])
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState<AiRole | null>(null)
  const [aiText, setAiText] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [citeOpen, setCiteOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [history, setHistory] = useState<Snapshot[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 제공 주제(seed)의 원본 초안 번호 (sourceFile "NN. ..." → NN)
  const draftNum = paper.seed && paper.sourceFile ? paper.sourceFile.match(/^(\d+)\./)?.[1] : undefined

  useEffect(() => {
    let alive = true
    loadComments(paper.id, userId).then((c) => alive && setComments(c))
    loadReferences(paper.id, userId).then((r) => alive && setRefs(r))

    ;(async () => {
      const loaded = await loadSections(paper.id, userId)
      if (!alive) return
      const firstKind = sections[0].kind
      const cur = loaded[firstKind] ?? ''
      // 시드 논문: 빈 섹션이거나 옛 이미지 경로가 남아있으면 최신 원고 자동 로드
      const stale = /!\[image\.png\]\((?!\/topics)/.test(cur)
      if (draftNum && (!cur.trim() || stale)) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}topics/${draftNum}.md`)
          if (res.ok) {
            const text = (await res.text()).trim()
            if (alive && text) {
              loaded[firstKind] = text
              await saveSection(paper.id, firstKind, sections[0].title, text, userId)
              if (alive) {
                setCurrent(firstKind)
                setMode('review')
              }
            }
          }
        } catch {
          /* 네트워크 실패 시 무시 */
        }
      }
      if (alive) setContent(loaded)
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper.id, userId])

  // 프리셋 변경으로 현재 섹션이 사라지면 첫 섹션으로
  useEffect(() => {
    if (!sections.some((s) => s.kind === current)) setCurrent(sections[0].kind)
  }, [sections, current])

  const def = sections.find((s) => s.kind === current) ?? sections[0]
  const value = content[def.kind] ?? ''

  // 코멘트 헬퍼
  function commentsFor(anchor: string) {
    return comments.filter((c) => c.sectionKind === current && c.anchor === anchor)
  }
  async function onAddComment(anchor: string, body: string) {
    const c = await addComment(paper.id, current, anchor, body, { id: userId, name: userName })
    if (c) setComments((cur) => [...cur, c])
  }
  async function onResolveComment(id: string, resolved: boolean) {
    setComments((cur) => cur.map((c) => (c.id === id ? { ...c, resolved } : c)))
    await resolveComment(paper.id, id, resolved, userId)
  }
  async function onRemoveComment(id: string) {
    setComments((cur) => cur.filter((c) => c.id !== id))
    await removeComment(paper.id, id, userId)
  }

  // 검토 모드: 본문을 단락으로 분할
  const paragraphs = useMemo(() => {
    const byBlank = value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    if (byBlank.length > 1) return byBlank
    return value.split(/\n/).map((p) => p.trim()).filter(Boolean)
  }, [value])

  function update(v: string) {
    setContent((c) => ({ ...c, [current]: v }))
  }

  async function save() {
    const body = content[current] ?? ''
    await saveSection(paper.id, current, def.title, body, userId)
    pushHistory(paper.id, current, body, userName)
    setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
  }

  function openHistory() {
    setHistory(getHistory(paper.id, def.kind))
    setHistOpen(true)
  }
  function restore(snap: Snapshot) {
    update(snap.content)
    saveSection(paper.id, def.kind, def.title, snap.content, userId)
    setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
    setHistOpen(false)
  }

  // 커서 위치에 인용 [n] 삽입
  function insertCitation(n: number) {
    const ta = textareaRef.current
    const marker = `[${n}]`
    if (!ta) {
      update(value + marker)
    } else {
      const start = ta.selectionStart ?? value.length
      const end = ta.selectionEnd ?? value.length
      const next = value.slice(0, start) + marker + value.slice(end)
      update(next)
      requestAnimationFrame(() => {
        ta.focus()
        const pos = start + marker.length
        ta.setSelectionRange(pos, pos)
      })
    }
    setCiteOpen(false)
  }

  const [loadingDraft, setLoadingDraft] = useState(false)

  // 원본 초안 다시 불러오기(현재 섹션을 최신 원고로 교체)
  async function loadOriginalDraft() {
    if (!draftNum) return
    setLoadingDraft(true)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}topics/${draftNum}.md`)
      if (res.ok) {
        const text = (await res.text()).trim()
        update(text)
        await saveSection(paper.id, current, def.title, text, userId)
        setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
        setMode('review')
      }
    } finally {
      setLoadingDraft(false)
    }
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
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-xl font-bold">{def.title}</h3>
            <div className="flex rounded-full border border-ink-200 p-0.5 text-xs">
              <button
                onClick={() => setMode('edit')}
                className={`rounded-full px-3 py-1 font-medium ${mode === 'edit' ? 'bg-ink-900 text-white' : 'text-ink-500'}`}
              >
                편집
              </button>
              <button
                onClick={() => setMode('review')}
                className={`rounded-full px-3 py-1 font-medium ${mode === 'review' ? 'bg-ink-900 text-white' : 'text-ink-500'}`}
              >
                검토
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {draftNum && (
              <button
                onClick={loadOriginalDraft}
                disabled={loadingDraft}
                className="rounded-full border border-gold-400 bg-gold-500/10 px-4 py-1.5 text-xs font-medium text-gold-600 transition hover:bg-gold-500/20 disabled:opacity-40"
              >
                {loadingDraft ? '불러오는 중…' : '📄 원본 초안 다시 불러오기'}
              </button>
            )}
            {mode === 'edit' && (
              <button
                onClick={openHistory}
                className="rounded-full border border-ink-300 px-4 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600"
              >
                이력
              </button>
            )}
            {mode === 'edit' && (
              <div className="relative">
                <button
                  onClick={() => setCiteOpen((o) => !o)}
                  className="rounded-full border border-ink-300 px-4 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600"
                >
                  인용 삽입 [n]
                </button>
                {citeOpen && (
                  <div className="absolute right-0 z-30 mt-1 max-h-72 w-80 overflow-auto rounded-xl border border-ink-200 bg-white p-2 shadow-lg">
                    {refs.length === 0 ? (
                      <p className="p-3 text-xs text-ink-400">참고문헌 탭에서 먼저 등록하세요.</p>
                    ) : (
                      refs.map((r, i) => (
                        <button
                          key={r.id}
                          onClick={() => insertCitation(i + 1)}
                          className="flex w-full gap-2 rounded-lg p-2 text-left text-xs hover:bg-ink-50"
                        >
                          <span className="shrink-0 font-semibold text-gold-600">[{i + 1}]</span>
                          <span className="line-clamp-2 text-ink-600">{r.apa}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
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

        {mode === 'edit' ? (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => update(e.target.value)}
              onBlur={save}
              placeholder={`「${def.title}」 내용을 작성하거나, AI 집필로 초안을 받아보세요. 인용은 [1] 처럼 번호로 넣으면 참고문헌과 자동 연결됩니다.`}
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

            {histOpen && (
              <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold">
                    「{def.title}」 버전 이력 <span className="text-sm font-normal text-ink-400">· {history.length}개</span>
                  </h4>
                  <button onClick={() => setHistOpen(false)} className="text-sm text-ink-400 hover:text-ink-700">
                    닫기
                  </button>
                </div>
                {history.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-400">저장된 버전이 없습니다. 저장하면 이력이 쌓입니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {history
                      .slice()
                      .reverse()
                      .map((snap, i) => (
                        <li key={snap.ts} className="rounded-xl border border-ink-200 p-3">
                          <div className="flex items-center justify-between text-xs text-ink-500">
                            <span>
                              <b className="text-ink-700">{history.length - i}차</b> · {snap.author} ·{' '}
                              {snap.ts.slice(5, 16).replace('T', ' ')} · {snap.content.length.toLocaleString()}자
                            </span>
                            <button
                              onClick={() => restore(snap)}
                              className="rounded-full bg-gold-500 px-3 py-1 font-semibold text-ink-900 hover:bg-gold-400"
                            >
                              이 버전으로 되돌리기
                            </button>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-ink-600">{snap.content}</p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </>
        ) : (
          <ReviewView
            paragraphs={paragraphs}
            sectionComments={commentsFor}
            onAdd={onAddComment}
            onResolve={onResolveComment}
            onRemove={onRemoveComment}
          />
        )}

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
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
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

function ReviewView({
  paragraphs,
  sectionComments,
  onAdd,
  onResolve,
  onRemove,
}: {
  paragraphs: string[]
  sectionComments: (anchor: string) => Comment[]
  onAdd: (anchor: string, body: string) => void
  onResolve: (id: string, resolved: boolean) => void
  onRemove: (id: string) => void
}) {
  if (paragraphs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-400">
        아직 내용이 없습니다. <b>편집</b> 모드에서 작성하거나 AI 집필로 초안을 받으면, 단락별로 코멘트를 남길 수 있습니다.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400">
        단락에 마우스를 올리고 💬 를 눌러 코멘트를 남기세요. 저자들과 단락별로 검토·합의할 수 있습니다.
      </p>

      {/* 섹션 전체 코멘트 */}
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="mb-2 text-xs font-semibold text-ink-500">📌 섹션 전체 코멘트</div>
        <CommentThread
          comments={sectionComments('')}
          onAdd={(b) => onAdd('', b)}
          onResolve={onResolve}
          onRemove={onRemove}
        />
      </div>

      {/* 단락별 */}
      {paragraphs.map((p, i) => {
        const anchor = String(i)
        const list = sectionComments(anchor)
        return (
          <div key={anchor} className="group rounded-xl border border-ink-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 shrink-0 text-xs text-ink-300">¶{i + 1}</span>
              <div className="cfp-md min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: renderMarkdownBlock(p) }} />
            </div>
            <div className="mt-2 pl-7">
              <CommentThread
                comments={list}
                onAdd={(b) => onAdd(anchor, b)}
                onResolve={onResolve}
                onRemove={onRemove}
                compact
              />
            </div>
          </div>
        )
      })}
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
