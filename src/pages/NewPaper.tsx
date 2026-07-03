import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { createPaper } from '../lib/papers'
import { useAuth } from '../lib/auth'
import { FORMAT_LABEL, type PaperFormat } from '../types'

export default function NewPaper() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [keywords, setKeywords] = useState('')
  const [format, setFormat] = useState<PaperFormat>('kci')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    const paper = await createPaper(
      {
        title: title.trim(),
        summary: summary.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        format,
        lang: format === 'imrad' ? 'en' : 'ko',
      },
      user?.id,
    )
    if (paper) nav(`/paper/${paper.id}`)
    else setSaving(false)
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-3xl font-bold">새 주제 등록</h1>
        <p className="mt-2 text-ink-600">주제와 가진 내용을 넣으면 논문 프로젝트가 열립니다. 이어서 팀을 구성하세요.</p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <Field label="논문 주제 (제목)" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 생성형 AI를 활용한 대학 글쓰기 교육의 효과 분석"
              className="w-full rounded-lg border border-ink-200 px-4 py-3 outline-none focus:border-gold-500"
            />
          </Field>

          <Field label="주제 요약 / 가진 내용">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              placeholder="연구 배경, 목적, 방법 등 가진 내용을 자유롭게 적어주세요. AI 팀원이 초안을 잡는 재료가 됩니다."
              className="w-full resize-none rounded-lg border border-ink-200 px-4 py-3 outline-none focus:border-gold-500"
            />
          </Field>

          <Field label="키워드 (쉼표로 구분)">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="생성형 AI, 글쓰기 교육, 대학교육"
              className="w-full rounded-lg border border-ink-200 px-4 py-3 outline-none focus:border-gold-500"
            />
          </Field>

          <Field label="논문 형식">
            <div className="grid gap-3 sm:grid-cols-2">
              {(['kci', 'imrad'] as PaperFormat[]).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded-xl border p-4 text-left transition ${
                    format === f ? 'border-gold-500 bg-gold-500/10' : 'border-ink-200 bg-white hover:border-gold-400'
                  }`}
                >
                  <div className="text-sm font-bold">{FORMAT_LABEL[f]}</div>
                  <div className="mt-1 text-xs text-ink-500">
                    {f === 'kci' ? '국문초록·서론·이론적배경·연구방법·결과·논의·결론' : 'Abstract·Intro·Methods·Results·Discussion'}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="w-full rounded-full bg-ink-900 py-3.5 font-medium text-white transition hover:bg-ink-700 disabled:opacity-40"
          >
            {saving ? '등록 중…' : '주제 등록하고 팀 구성하기 →'}
          </button>
        </form>
      </main>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink-700">
        {label} {required && <span className="text-gold-600">*</span>}
      </span>
      {children}
    </label>
  )
}
