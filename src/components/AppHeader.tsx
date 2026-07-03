import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import LoginModal from './LoginModal'

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
  const { user, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  const name = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <Logo />
            <span className="font-serif text-lg font-bold tracking-tight sm:text-xl">Call for Papers</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-600">
            <a href="/#how" className="hidden hover:text-ink-900 lg:inline">작동 방식</a>
            <a href="/#team" className="hidden hover:text-ink-900 lg:inline">팀 구성</a>
            <a href="/#format" className="hidden hover:text-ink-900 lg:inline">논문 형식</a>
            <span className="hidden text-ink-200 lg:inline">|</span>
            <Link to="/dashboard" className="hover:text-ink-900">
              내 논문
            </Link>
            <Link to="/new" className="hover:text-ink-900">
              새 논문
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-ink-700 sm:inline">{name}님</span>
                <button
                  onClick={signOut}
                  className="rounded-full border border-ink-300 px-4 py-2 font-medium text-ink-700 transition hover:border-ink-900"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="rounded-full bg-ink-900 px-5 py-2 font-medium text-white transition hover:bg-ink-700"
              >
                로그인 / 가입
              </button>
            )}
          </nav>
        </div>
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
