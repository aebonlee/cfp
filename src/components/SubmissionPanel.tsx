import { useEffect, useState } from 'react'
import type { Comment, Paper, Reference } from '../types'
import { ROLE_LABEL } from '../types'
import type { SectionDef } from '../data/sections'
import { loadSections, loadReferences, loadComments } from '../lib/papers'
import { buildCitationReport } from '../lib/citations'

export default function SubmissionPanel({
  paper,
  userId,
  sections: sectionDefs,
}: {
  paper: Paper
  userId?: string
  sections: SectionDef[]
}) {
  const [content, setContent] = useState<Record<string, string>>({})
  const [refs, setRefs] = useState<Reference[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      loadSections(paper.id, userId),
      loadReferences(paper.id, userId),
      loadComments(paper.id, userId),
    ])
      .then(([c, r, cm]) => {
        if (!alive) return
        setContent(c)
        setRefs(r)
        setComments(cm)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [paper.id, userId])

  const humans = paper.members.filter((m) => m.type === 'human')
  const filledSections = sectionDefs.filter((s) => (content[s.kind] ?? '').trim().length > 0)
  const openComments = comments.filter((c) => !c.resolved).length
  const totalChars = sectionDefs.reduce((n, s) => n + (content[s.kind] ?? '').length, 0)

  // 본문 인용 ↔ 참고문헌 연결 점검
  const allText = sectionDefs.map((s) => content[s.kind] ?? '').join('\n')
  const cite = buildCitationReport(allText, refs.length)

  const checks = [
    { ok: humans.some((m) => m.role === 'first_author'), label: '제1저자 지정', detail: humans.map((m) => m.name).filter(Boolean).join(', ') || '없음' },
    { ok: filledSections.length === sectionDefs.length, label: '모든 섹션 작성', detail: `${filledSections.length}/${sectionDefs.length} 섹션` },
    { ok: refs.length > 0, label: '참고문헌 등록', detail: `${refs.length}건` },
    { ok: openComments === 0, label: '미해결 코멘트 없음', detail: openComments === 0 ? '모두 해결' : `${openComments}건 남음` },
    { ok: cite.broken.length === 0 && cite.uncited.length === 0, label: '인용 연결 정상', detail: cite.broken.length ? `깨진 번호 ${cite.broken.length}` : cite.uncited.length ? `미인용 ${cite.uncited.length}` : `본문 인용 ${cite.totalCitations}회` },
  ]
  const ready = checks.every((c) => c.ok)

  // ---- 원고 조립 ----
  function authorLine() {
    const order = ['first_author', 'coauthor', 'corresponding'] as const
    return humans
      .slice()
      .sort((a, b) => order.indexOf(a.role as never) - order.indexOf(b.role as never))
      .map((m) => `${m.name || '(이름 미정)'} (${ROLE_LABEL[m.role]})`)
      .join(', ')
  }

  function buildMarkdown() {
    const lines: string[] = []
    lines.push(`# ${paper.title}`)
    if (paper.titleEn) lines.push(`### ${paper.titleEn}`)
    lines.push('')
    lines.push(`**저자:** ${authorLine()}`)
    if (paper.keywords.length) lines.push(`**키워드:** ${paper.keywords.join(', ')}`)
    lines.push('')
    for (const s of sectionDefs) {
      const body = (content[s.kind] ?? '').trim()
      lines.push(`## ${s.title}`)
      lines.push(body || '_(작성 예정)_')
      lines.push('')
    }
    if (refs.length) {
      lines.push('## 참고문헌')
      refs.forEach((r, i) => lines.push(`${i + 1}. ${r.apa}`))
    }
    return lines.join('\n')
  }

  function buildHtml() {
    const esc = (t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const secs = sectionDefs
      .map((s) => {
        const body = esc((content[s.kind] ?? '').trim() || '(작성 예정)')
          .split(/\n\s*\n/)
          .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
          .join('')
        return `<h2>${esc(s.title)}</h2>${body}`
      })
      .join('')
    const refsHtml = refs.length
      ? `<h2>참고문헌</h2><ol>${refs.map((r) => `<li>${esc(r.apa)}</li>`).join('')}</ol>`
      : ''
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper.title)}</title>
<style>
  body{font-family:'Noto Serif KR',serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.8;color:#0f172a}
  h1{font-size:24px;text-align:center;margin-bottom:8px}
  .en{text-align:center;color:#64748b;font-style:italic;margin-bottom:16px}
  .authors{text-align:center;color:#334155;margin-bottom:4px}
  .kw{text-align:center;color:#64748b;font-size:14px;margin-bottom:32px}
  h2{font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-top:28px}
  ol li{margin-bottom:6px}
  @media print{body{margin:0}}
</style></head><body>
<h1>${esc(paper.title)}</h1>
${paper.titleEn ? `<div class="en">${esc(paper.titleEn)}</div>` : ''}
<div class="authors">${esc(authorLine())}</div>
${paper.keywords.length ? `<div class="kw">주제어: ${esc(paper.keywords.join(', '))}</div>` : ''}
${secs}${refsHtml}
</body></html>`
  }

  function download(filename: string, text: string, mime: string) {
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const base = paper.title.slice(0, 40).replace(/[\\/:*?"<>|]/g, '') || 'manuscript'

  function exportMarkdown() {
    download(`${base}.md`, buildMarkdown(), 'text/markdown;charset=utf-8')
  }
  function exportWord() {
    download(`${base}.doc`, buildHtml(), 'application/msword')
  }
  function printPreview() {
    const w = window.open('', '_blank')
    if (!w) {
      download(`${base}.html`, buildHtml(), 'text/html;charset=utf-8')
      return
    }
    w.document.write(buildHtml())
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  if (loading) return <p className="py-16 text-center text-sm text-ink-400">불러오는 중…</p>

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      {/* 체크리스트 + 내보내기 */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl font-bold">게재 준비</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {ready ? '준비 완료' : '진행 중'}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-500">투고 전 점검 항목입니다.</p>
        </div>

        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.ok ? 'bg-green-500 text-white' : 'bg-ink-200 text-ink-500'
                }`}
              >
                {c.ok ? '✓' : '!'}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-ink-400">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-ink-900 p-4 text-white">
          <div className="mb-3 text-sm font-semibold">투고본 내보내기</div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={exportWord} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
              Word
            </button>
            <button onClick={printPreview} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
              PDF·인쇄
            </button>
            <button onClick={exportMarkdown} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
              Markdown
            </button>
          </div>
          <p className="mt-2 text-xs text-white/50">총 {totalChars.toLocaleString()}자 · 참고문헌 {refs.length}건</p>
        </div>

        {/* 인용 점검 */}
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold">인용 연결 점검</div>
          <p className="text-xs text-ink-500">
            본문에 <code className="rounded bg-ink-100 px-1">[번호]</code> 로 인용하면 참고문헌 순번과 자동 연결됩니다.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-ink-50 p-2">
              <div className="text-lg font-bold text-ink-800">{cite.totalCitations}</div>
              <div className="text-ink-400">본문 인용</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <div className="text-lg font-bold text-amber-600">{cite.uncited.length}</div>
              <div className="text-ink-400">미인용 문헌</div>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <div className="text-lg font-bold text-red-600">{cite.broken.length}</div>
              <div className="text-ink-400">깨진 번호</div>
            </div>
          </div>
          {cite.uncited.length > 0 && (
            <p className="mt-2 text-xs text-amber-600">미인용: [{cite.uncited.join('], [')}] — 본문에서 인용되지 않았습니다.</p>
          )}
          {cite.broken.length > 0 && (
            <p className="mt-1 text-xs text-red-600">
              깨진 번호: [{cite.broken.join('], [')}] — 참고문헌 {refs.length}건 범위를 벗어났습니다.
            </p>
          )}
        </div>
      </div>

      {/* 원고 미리보기 */}
      <div className="rounded-2xl border border-ink-200 bg-white p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-center font-serif text-2xl font-bold leading-snug">{paper.title}</h1>
          {paper.titleEn && <p className="mt-1 text-center text-sm italic text-ink-400">{paper.titleEn}</p>}
          <p className="mt-4 text-center text-sm text-ink-600">{authorLine()}</p>
          {paper.keywords.length > 0 && (
            <p className="mt-1 text-center text-xs text-ink-400">주제어: {paper.keywords.join(', ')}</p>
          )}
          <div className="mt-8 space-y-6">
            {sectionDefs.map((s) => (
              <section key={s.kind}>
                <h2 className="border-b border-ink-100 pb-1 font-serif text-lg font-bold">{s.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {(content[s.kind] ?? '').trim() || <span className="text-ink-300">(작성 예정)</span>}
                </p>
              </section>
            ))}
            {refs.length > 0 && (
              <section>
                <h2 className="border-b border-ink-100 pb-1 font-serif text-lg font-bold">참고문헌</h2>
                <ol className="mt-2 space-y-1.5 text-sm text-ink-700">
                  {refs.map((r, i) => {
                    const used = cite.countByRef[i + 1] ?? 0
                    return (
                      <li key={r.id} className="flex gap-2">
                        <span className="shrink-0 font-semibold text-gold-600">[{i + 1}]</span>
                        <span className="flex-1 break-words">{r.apa}</span>
                        <span
                          className={`shrink-0 text-xs ${used ? 'text-ink-400' : 'text-amber-500'}`}
                          title={used ? `본문 ${used}회 인용` : '본문에서 인용되지 않음'}
                        >
                          {used ? `${used}회` : '미인용'}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
