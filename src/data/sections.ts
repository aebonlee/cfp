import type { PaperFormat } from '../types'

export interface SectionDef {
  kind: string
  title: string
}

// KCI 한글 논문 / IMRaD 영문 논문 섹션 템플릿
const KCI: SectionDef[] = [
  { kind: 'abstract', title: '국문초록' },
  { kind: 'intro', title: '서론' },
  { kind: 'background', title: '이론적 배경' },
  { kind: 'method', title: '연구방법' },
  { kind: 'results', title: '연구결과' },
  { kind: 'discussion', title: '논의' },
  { kind: 'conclusion', title: '결론' },
  { kind: 'references', title: '참고문헌' },
]

const IMRAD: SectionDef[] = [
  { kind: 'abstract', title: 'Abstract' },
  { kind: 'intro', title: 'Introduction' },
  { kind: 'related', title: 'Related Work' },
  { kind: 'method', title: 'Methods' },
  { kind: 'results', title: 'Results' },
  { kind: 'discussion', title: 'Discussion' },
  { kind: 'conclusion', title: 'Conclusion' },
  { kind: 'references', title: 'References' },
]

export function sectionsFor(format: PaperFormat): SectionDef[] {
  return format === 'imrad' ? IMRAD : KCI
}
