import { useEffect, useState } from 'react'
import type { Application, Paper } from '../types'
import { loadApplications, acceptApplication, rejectApplication } from '../lib/papers'

export default function ApplicationsPanel({ paper, onChange }: { paper: Paper; onChange: () => void }) {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  function reload() {
    loadApplications(paper.id)
      .then(setApps)
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    let alive = true
    loadApplications(paper.id)
      .then((a) => alive && setApps(a))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [paper.id])

  const pending = apps.filter((a) => a.status === 'pending')
  const hasCorresponding = paper.members.some((m) => m.role === 'corresponding')

  async function accept(a: Application, role: 'coauthor' | 'corresponding') {
    setBusy(a.id)
    const { error } = await acceptApplication(a, role)
    setBusy(null)
    if (error) alert('수락 실패: ' + error)
    else {
      reload()
      onChange()
    }
  }
  async function reject(a: Application) {
    setBusy(a.id)
    await rejectApplication(a.id, reason)
    setBusy(null)
    setRejectFor(null)
    setReason('')
    reload()
  }

  if (loading) return null
  if (!paper.recruiting && pending.length === 0) return null

  return (
    <div className="mb-8 rounded-2xl border border-gold-400 bg-gold-500/5 p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-bold">참여 신청</h3>
        {pending.length > 0 && (
          <span className="rounded-full bg-gold-500 px-2.5 py-0.5 text-xs font-semibold text-ink-900">{pending.length}</span>
        )}
      </div>
      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-ink-500">
          {paper.recruiting ? '아직 신청이 없습니다. 팀원 모집 게시판에 공개되어 있습니다.' : ''}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-ink-200 bg-white p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{a.applicantName}</span>
                  {a.applicantEmail && <span className="text-xs text-ink-400">{a.applicantEmail}</span>}
                  <span className="text-xs text-ink-300">{a.createdAt.slice(0, 10)}</span>
                </div>
                {a.message && <p className="mt-1 break-words text-sm text-ink-600">{a.message}</p>}
              </div>
              {rejectFor === a.id ? (
                <div className="w-full space-y-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="거절 사유 (지원자에게 전달, 선택)"
                    className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(a)}
                      disabled={busy === a.id}
                      className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
                    >
                      거절 확정
                    </button>
                    <button
                      onClick={() => { setRejectFor(null); setReason('') }}
                      className="rounded-full border border-ink-300 px-4 py-1.5 text-sm text-ink-600"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => accept(a, 'coauthor')}
                    disabled={busy === a.id}
                    className="rounded-full bg-ink-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-40"
                  >
                    공동저자로 수락
                  </button>
                  <button
                    onClick={() => accept(a, 'corresponding')}
                    disabled={busy === a.id}
                    title={hasCorresponding ? '기존 교신저자는 공동저자로 조정됩니다' : undefined}
                    className="rounded-full border border-gold-500 bg-gold-500/10 px-4 py-1.5 text-sm font-medium text-gold-700 hover:bg-gold-500/20 disabled:opacity-40"
                  >
                    교신저자로 수락
                  </button>
                  <button
                    onClick={() => { setRejectFor(a.id); setReason('') }}
                    disabled={busy === a.id}
                    className="rounded-full border border-ink-300 px-4 py-1.5 text-sm text-ink-600 hover:border-red-400 hover:text-red-500 disabled:opacity-40"
                  >
                    거절
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
