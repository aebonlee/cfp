import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { loadNotifications } from '../lib/papers'
import type { Application } from '../types'

type Item = Application & { paperTitle: string }
const SEEN_KEY = 'cfp.notif.seen.v1'

function sig(a: Item) {
  return `${a.id}:${a.status}`
}
function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [incoming, setIncoming] = useState<Item[]>([])
  const [resolved, setResolved] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(loadSeen)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    if (!user?.id) return
    loadNotifications(user.id)
      .then((n) => {
        setIncoming(n.incoming)
        setResolved(n.mineResolved)
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!user) return null

  const items: Item[] = [...incoming, ...resolved]
  const unseen = items.filter((a) => !seen.has(sig(a)))
  const count = unseen.length

  function openPanel() {
    setOpen((v) => !v)
    if (!open) {
      // 열면 현재 항목 모두 읽음 처리
      const next = new Set(seen)
      items.forEach((a) => next.add(sig(a)))
      setSeen(next)
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]))
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openPanel}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 text-ink-700 transition hover:border-ink-900"
        aria-label="알림"
        title="알림"
      >
        <span className="text-base leading-none">🔔</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[85vw] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lg">
          <div className="border-b border-ink-100 px-4 py-3 text-sm font-bold">알림</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">새 알림이 없습니다.</p>
            ) : (
              <>
                {incoming.length > 0 && (
                  <div className="px-4 pt-3">
                    <div className="mb-1 text-xs font-semibold text-ink-400">받은 참여 신청</div>
                    {incoming.map((a) => (
                      <Link
                        key={a.id}
                        to={`/paper/${a.paperId}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-2 py-2 text-sm hover:bg-ink-50"
                      >
                        <b>{a.applicantName}</b>님이 신청 ·{' '}
                        <span className="text-ink-500">{a.paperTitle}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {resolved.length > 0 && (
                  <div className="px-4 pb-3 pt-3">
                    <div className="mb-1 text-xs font-semibold text-ink-400">내 신청 결과</div>
                    {resolved.map((a) => (
                      <Link
                        key={a.id}
                        to={a.status === 'accepted' ? `/paper/${a.paperId}` : '/my-applications'}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-2 py-2 text-sm hover:bg-ink-50"
                      >
                        <span className={a.status === 'accepted' ? 'text-green-600' : 'text-red-500'}>
                          {a.status === 'accepted' ? '승인됨' : '반려됨'}
                        </span>{' '}
                        · <span className="text-ink-500">{a.paperTitle}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <Link
            to="/my-applications"
            onClick={() => setOpen(false)}
            className="block border-t border-ink-100 px-4 py-2.5 text-center text-sm font-medium text-gold-600 hover:bg-ink-50"
          >
            내 신청 현황 →
          </Link>
        </div>
      )}
    </div>
  )
}
