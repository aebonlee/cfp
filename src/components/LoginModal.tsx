import { useAuth } from '../lib/auth'
import { Logo } from './AppHeader'

export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn } = useAuth()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-10 w-10" />
          <h2 className="mt-4 font-serif text-2xl font-bold">Call for Papers 시작하기</h2>
          <p className="mt-2 text-sm text-ink-500">
            구글 또는 카카오 계정으로 가입·로그인하고<br />팀을 만들어 논문을 함께 쓰세요.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => signIn('google')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white py-3 font-medium text-ink-800 transition hover:bg-ink-50"
          >
            <GoogleIcon />
            구글 이메일로 계속하기
          </button>
          <button
            onClick={() => signIn('kakao')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] py-3 font-medium text-[#191600] transition hover:brightness-95"
          >
            <KakaoIcon />
            카카오로 계속하기
          </button>
        </div>

        <button onClick={onClose} className="mt-6 w-full text-center text-sm text-ink-400 hover:text-ink-700">
          닫기
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#191600" d="M12 3C6.9 3 3 6.3 3 10.35c0 2.6 1.72 4.88 4.32 6.18-.19.7-.68 2.53-.78 2.92-.12.48.18.47.37.34.15-.1 2.4-1.63 3.37-2.29.44.06.9.1 1.72.1 5.1 0 9-3.3 9-7.35S17.1 3 12 3z" />
    </svg>
  )
}
