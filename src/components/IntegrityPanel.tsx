import { useEffect, useMemo, useState } from 'react'
import type { Paper } from '../types'
import type { SectionDef } from '../data/sections'
import { loadSections } from '../lib/papers'
import { checkIntegrity } from '../lib/ai'
import { findInternalDuplicates, internalDuplicationRate } from '../lib/similarity'

export default function IntegrityPanel({
  paper,
  userId,
  sections: sectionDefs,
}: {
  paper: Paper
  userId?: string
  sections: SectionDef[]
}) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState('')

  useEffect(() => {
    let alive = true
    loadSections(paper.id, userId)
      .then((c) => alive && setContent(c))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [paper.id, userId])

  const sectionList = useMemo(
    () => sectionDefs.map((s) => ({ title: s.title, content: content[s.kind] ?? '' })),
    [sectionDefs, content],
  )
  const dups = useMemo(() => findInternalDuplicates(sectionList), [sectionList])
  const dupRate = useMemo(() => internalDuplicationRate(sectionList), [sectionList])
  const hasContent = sectionList.some((s) => s.content.trim())

  const level = dupRate >= 15 ? { t: '높음', c: 'text-red-600 bg-red-50' } : dupRate >= 5 ? { t: '보통', c: 'text-amber-600 bg-amber-50' } : { t: '낮음', c: 'text-green-600 bg-green-50' }

  async function runAiCheck() {
    setAiLoading(true)
    setAiText('')
    const manuscript = sectionList.map((s) => `## ${s.title}\n${s.content}`).join('\n\n')
    const res = await checkIntegrity(paper, manuscript)
    setAiText(res.text)
    setAiLoading(false)
  }

  if (loading) return <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* 내부 중복 검사 */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-serif text-xl font-bold">내부 중복 검사</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${level.c}`}>유사도 위험 {level.t}</span>
        </div>
        <p className="text-sm text-ink-500">
          섹션 간·내 반복 문장(20자 이상)을 즉시 점검합니다. 중복 문장 비율 <b>{dupRate}%</b>.
        </p>

        <div className="mt-4 space-y-2">
          {!hasContent ? (
            <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-400">
              본문이 없습니다. 집필 후 점검하세요.
            </p>
          ) : dups.length === 0 ? (
            <p className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-sm text-green-700">
              ✓ 반복된 문장이 발견되지 않았습니다.
            </p>
          ) : (
            dups.map((d, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white">{d.count}회 반복</span>
                  <span className="text-ink-500">{d.sections.join(' · ')}</span>
                </div>
                <p className="text-sm leading-relaxed text-ink-700">"{d.text}"</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI 연구윤리 점검 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold">AI 연구윤리·유사도 점검</h3>
          <button
            onClick={runAiCheck}
            disabled={aiLoading || !hasContent}
            className="rounded-full bg-ink-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-ink-700 disabled:opacity-40"
          >
            {aiLoading ? '점검 중…' : 'AI 점검 실행'}
          </button>
        </div>
        <p className="text-sm text-ink-500">
          Claude가 인용 누락·상투 표현·과잉 인용·자기표절 소지를 지적합니다. (실제 표절 검사기가 아닌 투고 전 자가 점검)
        </p>

        <div className="mt-4 rounded-2xl border border-ink-200 bg-white p-5">
          {aiLoading ? (
            <p className="py-10 text-center text-sm text-ink-400">AI가 원고를 점검하고 있습니다…</p>
          ) : aiText ? (
            <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-ink-800">
              {aiText}
            </pre>
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">
              "AI 점검 실행"을 누르면 원고 전체를 분석합니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
