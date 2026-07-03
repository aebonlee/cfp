import { useEffect, useState } from 'react'
import type { Paper, Reference } from '../types'
import { loadReferences, addReference, updateReference, deleteReference } from '../lib/papers'
import { formatReferences } from '../lib/ai'

export default function ReferencesPanel({ paper, userId }: { paper: Paper; userId?: string }) {
  const [refs, setRefs] = useState<Reference[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState('')

  const style = paper.format === 'imrad' ? 'APA 7th (영문)' : 'APA · KCI (국문)'

  useEffect(() => {
    let alive = true
    loadReferences(paper.id, userId)
      .then((r) => alive && setRefs(r))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [paper.id, userId])

  async function add() {
    const text = input.trim()
    if (!text) return
    // 여러 줄이면 줄 단위로 추가
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const added: Reference[] = []
    for (const l of lines) {
      const r = await addReference(paper.id, l, userId)
      if (r) added.push(r)
    }
    setRefs((cur) => [...cur, ...added])
    setInput('')
  }

  async function edit(id: string, apa: string) {
    setRefs((cur) => cur.map((r) => (r.id === id ? { ...r, apa } : r)))
    await updateReference(paper.id, id, apa, userId)
  }

  async function remove(id: string) {
    setRefs((cur) => cur.filter((r) => r.id !== id))
    await deleteReference(paper.id, id, userId)
  }

  async function aiOrganize() {
    setAiOpen(true)
    setAiLoading(true)
    setAiText('')
    const raw = refs.map((r) => r.apa).join('\n') || input
    const res = await formatReferences(paper, raw)
    setAiText(res.text)
    setAiLoading(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-bold">참고문헌</h3>
          <p className="text-sm text-ink-500">형식: {style} · {refs.length}건</p>
        </div>
        <button
          onClick={aiOrganize}
          disabled={aiLoading || (refs.length === 0 && !input.trim())}
          className="rounded-full border border-ink-300 px-4 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {aiLoading ? '정리 중…' : 'AI로 참고문헌 정리'}
        </button>
      </div>

      {/* 입력 */}
      <div className="mb-5 rounded-xl border border-ink-200 bg-white p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="참고문헌을 붙여넣으세요. 여러 줄이면 각 줄이 개별 항목으로 추가됩니다. (형식이 거칠어도 'AI로 정리'로 다듬을 수 있어요)"
          className="w-full resize-none rounded-lg border border-ink-200 p-3 text-sm outline-none focus:border-gold-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={add}
            disabled={!input.trim()}
            className="rounded-full bg-ink-900 px-5 py-1.5 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <p className="py-8 text-center text-sm text-ink-400">불러오는 중…</p>
      ) : refs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-400">
          아직 참고문헌이 없습니다. 위에 붙여넣어 추가하세요.
        </p>
      ) : (
        <ol className="space-y-2">
          {refs.map((r, i) => (
            <li key={r.id} className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3">
              <span className="mt-2 w-6 shrink-0 text-right text-xs text-ink-400">{i + 1}.</span>
              <textarea
                value={r.apa}
                onChange={(e) => setRefs((cur) => cur.map((x) => (x.id === r.id ? { ...x, apa: e.target.value } : x)))}
                onBlur={(e) => edit(r.id, e.target.value)}
                rows={2}
                className="flex-1 resize-none rounded-lg border border-transparent bg-transparent p-1 text-sm leading-relaxed outline-none hover:border-ink-200 focus:border-gold-500"
              />
              <button onClick={() => remove(r.id)} className="mt-1 text-xs text-ink-400 hover:text-red-500">
                삭제
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* AI 정리 결과 */}
      {aiOpen && (
        <div className="mt-5 rounded-2xl border border-ink-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-bold">AI 정리 결과 <span className="text-sm font-normal text-ink-400">· Claude</span></h4>
            <button onClick={() => setAiOpen(false)} className="text-sm text-ink-400 hover:text-ink-700">닫기</button>
          </div>
          {aiLoading ? (
            <p className="py-8 text-center text-sm text-ink-400">AI 에디터가 참고문헌을 정리하고 있습니다…</p>
          ) : (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
              {aiText}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
