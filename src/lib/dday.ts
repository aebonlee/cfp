// 투고 마감일(YYYY-MM-DD) → D-day 표기·색상

export interface Dday {
  label: string // 'D-7', 'D-DAY', 'D+3'
  days: number // 남은 일수(음수면 지남)
  tone: 'ok' | 'warn' | 'over' // 색상 힌트
}

export function dday(deadline?: string): Dday | null {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(deadline + 'T00:00:00')
  if (isNaN(due.getTime())) return null
  const days = Math.round((due.getTime() - today.getTime()) / 86400000)
  const label = days === 0 ? 'D-DAY' : days > 0 ? `D-${days}` : `D+${-days}`
  const tone: Dday['tone'] = days < 0 ? 'over' : days <= 7 ? 'warn' : 'ok'
  return { label, days, tone }
}
