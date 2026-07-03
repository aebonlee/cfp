import { useState } from 'react'
import type { Comment } from '../types'

export default function CommentThread({
  comments,
  onAdd,
  onResolve,
  onRemove,
  compact,
}: {
  comments: Comment[]
  onAdd: (body: string) => void
  onResolve: (id: string, resolved: boolean) => void
  onRemove: (id: string) => void
  compact?: boolean
}) {
  const [body, setBody] = useState('')
  const [open, setOpen] = useState(!compact)

  const openCount = comments.filter((c) => !c.resolved).length

  function submit() {
    const t = body.trim()
    if (!t) return
    onAdd(t)
    setBody('')
  }

  if (compact && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
          comments.length
            ? 'bg-gold-500/15 text-gold-600 hover:bg-gold-500/25'
            : 'text-ink-400 hover:bg-ink-100'
        }`}
      >
        💬 {comments.length ? `${openCount}/${comments.length}` : '코멘트'}
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3">
      {comments.length === 0 && <p className="mb-2 text-xs text-ink-400">아직 코멘트가 없습니다.</p>}
      <ul className="space-y-2">
        {comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg border p-2.5 text-sm ${
              c.resolved ? 'border-ink-200 bg-ink-100/60 opacity-70' : 'border-ink-200 bg-white'
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-ink-400">
              <span className="font-semibold text-ink-600">{c.authorName}</span>
              <span>{c.createdAt.slice(5, 16).replace('T', ' ')}</span>
            </div>
            <p className={`whitespace-pre-wrap break-words leading-relaxed ${c.resolved ? 'line-through' : ''}`}>{c.body}</p>
            <div className="mt-1.5 flex gap-3 text-xs">
              <button onClick={() => onResolve(c.id, !c.resolved)} className="text-gold-600 hover:underline">
                {c.resolved ? '해결취소' : '해결'}
              </button>
              <button onClick={() => onRemove(c.id)} className="text-ink-400 hover:text-red-500">
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="코멘트 남기기…"
          className="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-gold-500"
        />
        <button
          onClick={submit}
          disabled={!body.trim()}
          className="rounded-lg bg-ink-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-700 disabled:opacity-40"
        >
          등록
        </button>
        {compact && (
          <button onClick={() => setOpen(false)} className="text-xs text-ink-400 hover:text-ink-700">
            접기
          </button>
        )}
      </div>
    </div>
  )
}
