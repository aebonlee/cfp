// 내부 중복(자기표절) 탐지 — 섹션 간/내 반복 문장을 클라이언트에서 즉시 점검

export interface DupGroup {
  text: string // 대표 문장(원문)
  count: number // 등장 횟수
  sections: string[] // 등장한 섹션명(중복 제거)
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?。？！])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\[[\d\s,;–-]+\]/g, '') // 인용 번호 제거
    .replace(/[^\p{L}\p{N}]/gu, '') // 문자·숫자만
}

/** 섹션 맵({제목: 본문})에서 20자 이상 문장 중 2회 이상 반복된 것을 그룹으로 반환 */
export function findInternalDuplicates(sections: { title: string; content: string }[]): DupGroup[] {
  const map = new Map<string, { text: string; sections: string[]; count: number }>()
  for (const sec of sections) {
    for (const sent of splitSentences(sec.content)) {
      const key = normalize(sent)
      if (key.length < 20) continue // 짧은 문장 제외
      const entry = map.get(key)
      if (entry) {
        entry.count++
        if (!entry.sections.includes(sec.title)) entry.sections.push(sec.title)
      } else {
        map.set(key, { text: sent, sections: [sec.title], count: 1 })
      }
    }
  }
  return [...map.values()]
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ text: e.text, count: e.count, sections: e.sections }))
}

/** 전체 문장 대비 중복 문장 비율(%) — 대략적 내부 유사도 지표 */
export function internalDuplicationRate(sections: { title: string; content: string }[]): number {
  const seen = new Map<string, number>()
  let total = 0
  let dup = 0
  for (const sec of sections) {
    for (const sent of splitSentences(sec.content)) {
      const key = normalize(sent)
      if (key.length < 20) continue
      total++
      const c = (seen.get(key) ?? 0) + 1
      seen.set(key, c)
      if (c >= 2) dup++
    }
  }
  return total === 0 ? 0 : Math.round((dup / total) * 100)
}
