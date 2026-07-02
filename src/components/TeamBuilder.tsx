import { useState } from 'react'
import {
  type TeamMember,
  type MemberRole,
  ROLE_LABEL,
  HUMAN_ROLES,
  AI_ROLES,
  AI_ROLE_DESC,
} from '../types'
import { newMemberId } from '../lib/store'

const MAX_HUMANS = 3

export default function TeamBuilder({
  initial,
  onSave,
}: {
  initial: TeamMember[]
  onSave: (members: TeamMember[]) => void
}) {
  const [members, setMembers] = useState<TeamMember[]>(initial)
  const [saved, setSaved] = useState(false)

  const humans = members.filter((m) => m.type === 'human')
  const ais = members.filter((m) => m.type === 'ai')

  function addHuman() {
    if (humans.length >= MAX_HUMANS) return
    const role: MemberRole = humans.length === 0 ? 'first_author' : 'coauthor'
    setMembers([...members, { id: newMemberId(), type: 'human', role, name: '' }])
    setSaved(false)
  }

  function addAi(role: MemberRole) {
    if (members.some((m) => m.role === role)) return
    setMembers([...members, { id: newMemberId(), type: 'ai', role, name: ROLE_LABEL[role] }])
    setSaved(false)
  }

  function update(id: string, patch: Partial<TeamMember>) {
    setMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    setSaved(false)
  }

  function remove(id: string) {
    setMembers(members.filter((m) => m.id !== id))
    setSaved(false)
  }

  function handleSave() {
    onSave(members.filter((m) => m.type === 'ai' || m.name.trim() !== ''))
    setSaved(true)
  }

  return (
    <div className="space-y-8">
      {/* 사람 팀원 */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">사람 팀원</h3>
            <p className="text-sm text-ink-500">최대 {MAX_HUMANS}인까지 · 제1저자가 연구를 이끕니다</p>
          </div>
          <button
            onClick={addHuman}
            disabled={humans.length >= MAX_HUMANS}
            className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-700 transition hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + 사람 추가 ({humans.length}/{MAX_HUMANS})
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {humans.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink-300 p-5 text-center text-sm text-ink-400">
              아직 사람 팀원이 없습니다. 최소 1인(제1저자)을 추가하세요.
            </p>
          )}
          {humans.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white p-4">
              <span className="rounded-full bg-ink-900/5 px-3 py-1 text-xs font-semibold text-ink-700">사람</span>
              <input
                value={m.name}
                onChange={(e) => update(m.id, { name: e.target.value })}
                placeholder="이름 (예: 이애본)"
                className="min-w-40 flex-1 rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-gold-500"
              />
              <select
                value={m.role}
                onChange={(e) => update(m.id, { role: e.target.value as MemberRole })}
                className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-gold-500"
              >
                {HUMAN_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button onClick={() => remove(m.id)} className="text-sm text-ink-400 hover:text-red-500">
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI 팀원 */}
      <div>
        <h3 className="text-lg font-bold">AI 팀원</h3>
        <p className="text-sm text-ink-500">부족한 역할을 AI가 채웁니다 · 최종 판단은 사람의 몫</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {AI_ROLES.map((r) => {
            const active = members.some((m) => m.role === r)
            return (
              <button
                key={r}
                onClick={() => (active ? remove(members.find((m) => m.role === r)!.id) : addAi(r))}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-ink-200 bg-white hover:border-gold-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{ROLE_LABEL[r]}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      active ? 'bg-gold-500 text-ink-900' : 'bg-ink-100 text-ink-400'
                    }`}
                  >
                    {active ? '✓' : '+'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">{AI_ROLE_DESC[r]}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 요약 + 저장 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink-900 p-5 text-white">
        <div className="text-sm">
          <span className="font-semibold">구성:</span> 사람 {humans.length}인 · AI {ais.length}명
          {humans.length === 0 && <span className="ml-2 text-gold-400">· 사람 1인 이상 필요</span>}
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-gold-400">저장됨 ✓</span>}
          <button
            onClick={handleSave}
            disabled={humans.length === 0}
            className="rounded-full bg-gold-500 px-6 py-2 text-sm font-semibold text-ink-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            팀 구성 저장
          </button>
        </div>
      </div>
    </div>
  )
}
