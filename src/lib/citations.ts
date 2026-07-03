// 번호식 본문 인용 [n] 파싱 및 참고문헌 연결 점검

/** 텍스트에서 인용 번호를 추출한다. [1] [1,2] [1-3] [1; 2] 등 지원 */
export function parseCitationNumbers(text: string): number[] {
  const nums = new Set<number>()
  const re = /\[([\d\s,;–-]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    for (const part of m[1].split(/[,;]/)) {
      const rng = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/)
      if (rng) {
        const a = parseInt(rng[1], 10)
        const b = parseInt(rng[2], 10)
        if (a <= b && b - a < 500) for (let i = a; i <= b; i++) nums.add(i)
      } else {
        const n = parseInt(part.trim(), 10)
        if (!Number.isNaN(n)) nums.add(n)
      }
    }
  }
  return [...nums]
}

export interface CitationReport {
  cited: number[] // 본문에 등장한 번호(정렬)
  uncited: number[] // 참고문헌에 있으나 본문에 인용 안 됨 (1-based 인덱스)
  broken: number[] // 본문에 있으나 참고문헌 범위를 벗어남
  countByRef: Record<number, number> // 번호별 등장 횟수
  totalCitations: number
}

/** 섹션 본문 전체 + 참고문헌 수로 인용 연결 상태를 점검 */
export function buildCitationReport(allText: string, refCount: number): CitationReport {
  const countByRef: Record<number, number> = {}
  const re = /\[([\d\s,;–-]+)\]/g
  let m: RegExpExecArray | null
  let total = 0
  while ((m = re.exec(allText)) !== null) {
    const nums = parseCitationNumbers(m[0])
    for (const n of nums) {
      countByRef[n] = (countByRef[n] ?? 0) + 1
      total++
    }
  }
  const cited = Object.keys(countByRef)
    .map(Number)
    .sort((a, b) => a - b)
  const uncited: number[] = []
  for (let i = 1; i <= refCount; i++) if (!countByRef[i]) uncited.push(i)
  const broken = cited.filter((n) => n < 1 || n > refCount)
  return { cited, uncited, broken, countByRef, totalCitations: total }
}
