const STEPS = [
  {
    n: '01',
    title: '주제를 던진다',
    body: '연구 주제와 가진 자료를 넣으면 논문 프로젝트가 열립니다. KCI 한글 논문과 국제 저널 IMRaD 영문, 두 형식을 지원합니다.',
  },
  {
    n: '02',
    title: '팀을 구성한다',
    body: '사람 1~3인을 초대하고, 부족한 역할은 AI 팀원이 채웁니다. 제1저자·교신저자·리뷰어·에디터까지 역할을 나눠 함께 씁니다.',
  },
  {
    n: '03',
    title: '함께 써 내려간다',
    body: '초록·서론·이론적 배경·연구방법·결과·논의·참고문헌을 섹션별로. AI 팀원이 초안을 잡고 사람이 다듬고, 코멘트로 합의합니다.',
  },
  {
    n: '04',
    title: '게재를 준비한다',
    body: '학술지 형식 검토, 참고문헌 정리(APA·KCI), 표절·일관성 점검까지. 투고 가능한 상태로 완성합니다.',
  },
]

const ROLES = [
  { tag: '사람', label: '제1저자', desc: '연구를 이끌고 최종 결정' },
  { tag: '사람', label: '공동저자', desc: '섹션을 나눠 집필' },
  { tag: 'AI', label: 'AI 집필가', desc: '섹션 초안·문장 다듬기' },
  { tag: 'AI', label: 'AI 리뷰어', desc: '논리·근거·형식 검토' },
]

const FORMATS = [
  {
    lang: '국내 학술지 · KCI',
    title: '한글 논문',
    sections: ['국문초록', '서론', '이론적 배경', '연구방법', '연구결과', '논의', '결론', '참고문헌(APA·KCI)'],
  },
  {
    lang: '국제 저널 · SCI/SSCI',
    title: '영문 IMRaD',
    sections: ['Abstract', 'Introduction', 'Related Work', 'Methods', 'Results', 'Discussion', 'Conclusion', 'References'],
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-serif text-xl font-bold tracking-tight">withpaper</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-ink-600 md:flex">
            <a href="#how" className="hover:text-ink-900">작동 방식</a>
            <a href="#team" className="hover:text-ink-900">팀 구성</a>
            <a href="#format" className="hover:text-ink-900">논문 형식</a>
          </nav>
          <button className="rounded-full bg-ink-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-ink-700">
            시작하기
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-ink-300/30 blur-3xl" />
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-medium text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              사람 + AI 하이브리드 팀 · 학술지 게재까지
            </span>
            <h1 className="mt-6 font-serif text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              함께 쓰는 논문,<br />
              <span className="text-gold-600">게재</span>까지 함께.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              주제만 던지면 됩니다. 사람 1~3인과 AI 팀원이 한 팀이 되어
              초록부터 참고문헌까지, 투고 가능한 상태로 논문을 완성합니다.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button className="rounded-full bg-gold-500 px-7 py-3 font-medium text-ink-900 shadow-sm transition hover:bg-gold-400">
                새 논문 시작하기
              </button>
              <a href="#how" className="rounded-full border border-ink-300 px-7 py-3 font-medium text-ink-700 transition hover:border-ink-900">
                작동 방식 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-ink-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead eyebrow="작동 방식" title="주제에서 게재까지, 네 단계" />
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-ink-200 bg-ink-50 p-7 transition hover:border-gold-400 hover:shadow-sm">
                <div className="font-serif text-3xl font-bold text-gold-500">{s.n}</div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="border-t border-ink-200/70">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead eyebrow="팀 구성" title="사람이 이끌고, AI가 채운다" />
          <p className="mx-auto mt-4 max-w-2xl text-center text-ink-600">
            공동저자가 한 명이든 세 명이든 괜찮습니다. 비어 있는 역할은 AI 팀원이 맡아
            초안을 잡고 검토하며, 최종 판단은 언제나 사람의 몫입니다.
          </p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.label} className="rounded-2xl border border-ink-200 bg-white p-6">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    r.tag === 'AI' ? 'bg-gold-500/15 text-gold-600' : 'bg-ink-900/5 text-ink-700'
                  }`}
                >
                  {r.tag}
                </span>
                <h3 className="mt-4 text-lg font-bold">{r.label}</h3>
                <p className="mt-1 text-sm text-ink-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Format */}
      <section id="format" className="border-t border-ink-200/70 bg-ink-900 text-ink-100">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-gold-400">논문 형식</span>
            <h2 className="mt-3 font-serif text-4xl font-bold text-white">한글이든 영문이든, 형식은 맡기세요</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {FORMATS.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink-700 bg-ink-800 p-8">
                <div className="text-sm font-medium text-gold-400">{f.lang}</div>
                <h3 className="mt-1 font-serif text-2xl font-bold text-white">{f.title}</h3>
                <ul className="mt-6 space-y-2.5">
                  {f.sections.map((sec, i) => (
                    <li key={sec} className="flex items-center gap-3 text-ink-200">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-semibold text-gold-400">
                        {i + 1}
                      </span>
                      {sec}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-200/70 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-serif text-4xl font-bold">머릿속 주제를 논문으로.</h2>
          <p className="mt-4 text-lg text-ink-600">지금 팀을 꾸리고 첫 초록을 써보세요.</p>
          <button className="mt-8 rounded-full bg-ink-900 px-8 py-3.5 font-medium text-white transition hover:bg-ink-700">
            새 논문 시작하기
          </button>
        </div>
      </section>

      <footer className="border-t border-ink-200/70 bg-ink-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-ink-500 md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-serif font-bold text-ink-700">withpaper</span>
          </div>
          <p>© 2026 DreamIT Biz · 함께 쓰는 논문</p>
        </div>
      </footer>
    </div>
  )
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <span className="text-sm font-semibold uppercase tracking-wider text-gold-600">{eyebrow}</span>
      <h2 className="mt-3 font-serif text-4xl font-bold tracking-tight">{title}</h2>
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-ink-900" />
      <path d="M8 7h11a5 5 0 0 1 5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" className="fill-ink-50" />
      <path d="M11 13h8M11 17h8M11 21h5" className="stroke-ink-900" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="9" r="5" className="fill-gold-500" />
      <path d="M24 6.6v4.8M21.6 9h4.8" className="stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
