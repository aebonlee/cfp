import { Link } from 'react-router-dom'

export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-ink-900" />
      <path d="M8 7h11a5 5 0 0 1 5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" className="fill-ink-50" />
      <path d="M11 13h8M11 17h8M11 21h5" className="stroke-ink-900" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24" cy="9" r="5" className="fill-gold-500" />
      <path d="M24 6.6v4.8M21.6 9h4.8" className="stroke-ink-900" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-serif text-xl font-bold tracking-tight">withpaper</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-600">
          <Link to="/dashboard" className="hover:text-ink-900">
            내 논문
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full bg-ink-900 px-5 py-2 font-medium text-white transition hover:bg-ink-700"
          >
            새 논문 시작
          </Link>
        </nav>
      </div>
    </header>
  )
}
