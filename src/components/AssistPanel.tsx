import { useEffect, useMemo, useState } from 'react'
import type { Paper } from '../types'
import type { SectionDef } from '../data/sections'
import { loadSections, saveSection } from '../lib/papers'
import { assistEdit } from '../lib/ai'
import { renderMarkdown } from '../lib/markdown'

const PRESETS = [
  { label: '간결하게', instr: '군더더기를 덜어내고 핵심만 남겨 간결하게 다듬어 주세요. 의미는 유지합니다.' },
  { label: '학술적 톤', instr: '학술 논문에 맞는 격식 있고 객관적인 문체로 바꿔 주세요.' },
  { label: '논리 흐름 개선', instr: '문단 간 논리 연결과 전개 순서를 개선하고 접속을 자연스럽게 해 주세요.' },
  { label: '문법·맞춤법', instr: '문법, 맞춤법, 띄어쓰기, 어색한 표현을 교정해 주세요. 내용은 바꾸지 마세요.' },
  { label: '쉽게 풀어쓰기', instr: '전문 용어는 유지하되 문장을 더 읽기 쉽게 풀어써 주세요.' },
  { label: '영문 번역', instr: '학술 논문 수준의 자연스러운 영어(APA 스타일)로 번역해 주세요.' },
]

export default function AssistPanel({
  paper,
  userId,
  sections,
}: {
  paper: Paper
  userId?: string
  sections: SectionDef[]
}) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [kind, setKind] = useState(sections[0].kind)
  const [text, setText] = useState('')
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [applied, setApplied] = useState(false)

  const def = useMemo(() => sections.find((s) => s.kind === kind) ?? sections[0], [sections, kind])

  useEffect(() => {
    let alive = true
    loadSections(paper.id, userId).then((c) => {
      if (!alive) return
      setContent(c)
      setText(c[sections[0].kind] ?? '')
    })
    return () => {
      alive = false
    }
  }, [paper.id, userId, sections])

  function pickSection(k: string) {
    setKind(k)
    setText(content[k] ?? '')
    setResult('')
    setApplied(false)
  }

  async function run(instr: string) {
    const source = text.trim()
    if (!source || loading) return
    setInstruction(instr)
    setLoading(true)
    setResult('')
    setApplied(false)
    const res = await assistEdit(paper, def.title, source, instr)
    setResult(res.text)
    setLoading(false)
  }

  async function applyToSection() {
    await saveSection(paper.id, def.kind, def.title, result, userId)
    setContent((c) => ({ ...c, [def.kind]: result }))
    setText(result)
    setApplied(true)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 원문 + 지시 */}
      <div className="min-w-0 space-y-4">
        <div>
          <h3 className="font-serif text-xl font-bold">AI 편집 도우미</h3>
          <p className="mt-1 text-sm text-ink-500">섹션을 고르고 원하는 편집을 요청하면 수정본을 만들어 드립니다.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-400">대상 섹션</span>
          <select
            value={kind}
            onChange={(e) => pickSection(e.target.value)}
            className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-gold-500"
          >
            {sections.map((s) => (
              <option key={s.kind} value={s.kind}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="편집할 원문입니다. 여기서 바로 수정하거나 다른 텍스트를 붙여넣어도 됩니다."
          className="h-64 w-full resize-none rounded-xl border border-ink-200 bg-white p-4 text-sm leading-relaxed outline-none focus:border-gold-500"
        />

        {/* 프리셋 */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => run(p.instr)}
              disabled={loading || !text.trim()}
              className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-gold-500 hover:text-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 직접 지시 */}
        <div className="flex gap-2">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run(instruction)}
            placeholder="직접 지시 (예: 결론을 두 문장으로 요약, 예시를 추가)"
            className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-gold-500"
          />
          <button
            onClick={() => run(instruction)}
            disabled={loading || !text.trim() || !instruction.trim()}
            className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-40"
          >
            {loading ? '편집 중…' : '편집 요청'}
          </button>
        </div>
      </div>

      {/* 결과 */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-bold">
            수정본 <span className="text-sm font-normal text-ink-400">· AI</span>
          </h4>
          {result && !loading && (
            <button
              onClick={applyToSection}
              className="rounded-full bg-gold-500 px-4 py-1.5 text-sm font-semibold text-ink-900 hover:bg-gold-400"
            >
              {applied ? '적용됨 ✓' : `「${def.title}」에 적용`}
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          {loading ? (
            <p className="py-16 text-center text-sm text-ink-400">AI가 편집하고 있습니다…</p>
          ) : result ? (
            <div className="cfp-md max-h-[540px] overflow-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} />
          ) : (
            <p className="py-16 text-center text-sm text-ink-400">
              왼쪽에서 편집을 요청하면 수정본이 여기 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
