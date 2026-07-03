import type { PaperFormat, PaperLang } from '../types'
import type { SectionDef } from './sections'

// 저널/학회별 투고 양식 프리셋. 섹션 구조·인용 스타일·투고 가이드를 정의한다.
export interface JournalPreset {
  id: string
  name: string
  desc: string
  format: PaperFormat
  lang: PaperLang
  citation: string
  guide: string
  sections?: SectionDef[] // 없으면 format 기본 섹션 사용
}

export const PRESETS: JournalPreset[] = [
  {
    id: 'kci-standard',
    name: 'KCI 표준 (국문)',
    desc: '국내 등재지 일반 양식',
    format: 'kci',
    lang: 'ko',
    citation: 'APA · KCI',
    guide: '국문초록 200~300단어, 주제어 3~5개. 서론–이론적 배경–연구방법–결과–논의–결론.',
  },
  {
    id: 'kci-education',
    name: '교육학/교육공학 (국문)',
    desc: '교육 분야 5장 구조',
    format: 'kci',
    lang: 'ko',
    citation: 'APA 7th',
    guide: '서론–이론적 배경–연구방법–연구결과–논의 및 결론. 연구문제 명시 권장.',
    sections: [
      { kind: 'abstract', title: '국문초록' },
      { kind: 'intro', title: 'Ⅰ. 서론' },
      { kind: 'background', title: 'Ⅱ. 이론적 배경' },
      { kind: 'method', title: 'Ⅲ. 연구방법' },
      { kind: 'results', title: 'Ⅳ. 연구결과' },
      { kind: 'conclusion', title: 'Ⅴ. 논의 및 결론' },
      { kind: 'references', title: '참고문헌' },
    ],
  },
  {
    id: 'thesis',
    name: '학위논문 (국문)',
    desc: '석·박사 학위논문 구성',
    format: 'kci',
    lang: 'ko',
    citation: 'APA · 학과 지침',
    guide: '초록–서론–이론적 배경–연구방법–연구결과–논의–결론–참고문헌–부록.',
    sections: [
      { kind: 'abstract', title: '국문초록' },
      { kind: 'intro', title: '제1장 서론' },
      { kind: 'background', title: '제2장 이론적 배경' },
      { kind: 'method', title: '제3장 연구방법' },
      { kind: 'results', title: '제4장 연구결과' },
      { kind: 'discussion', title: '제5장 논의' },
      { kind: 'conclusion', title: '제6장 결론 및 제언' },
      { kind: 'references', title: '참고문헌' },
      { kind: 'appendix', title: '부록' },
    ],
  },
  {
    id: 'imrad',
    name: '국제 저널 IMRaD (영문)',
    desc: 'SCI/SSCI 일반 양식',
    format: 'imrad',
    lang: 'en',
    citation: 'APA 7th',
    guide: 'Abstract 150~250 words. Abstract–Introduction–Related Work–Methods–Results–Discussion–Conclusion.',
  },
  {
    id: 'ieee',
    name: 'IEEE (영문)',
    desc: '공학·컴퓨팅 학회',
    format: 'imrad',
    lang: 'en',
    citation: 'IEEE (numbered [n])',
    guide: 'Numbered citations [1]. Abstract–Introduction–Related Work–Methodology–Experiments–Results–Conclusion.',
    sections: [
      { kind: 'abstract', title: 'Abstract' },
      { kind: 'intro', title: 'I. Introduction' },
      { kind: 'related', title: 'II. Related Work' },
      { kind: 'method', title: 'III. Methodology' },
      { kind: 'experiments', title: 'IV. Experiments' },
      { kind: 'results', title: 'V. Results & Discussion' },
      { kind: 'conclusion', title: 'VI. Conclusion' },
      { kind: 'references', title: 'References' },
    ],
  },
  {
    id: 'nature',
    name: 'Nature/Science 스타일 (영문)',
    desc: '자연과학 저널',
    format: 'imrad',
    lang: 'en',
    citation: 'Numbered (superscript)',
    guide: 'Abstract–Introduction–Results–Discussion–Methods. Methods often at end.',
    sections: [
      { kind: 'abstract', title: 'Abstract' },
      { kind: 'intro', title: 'Introduction' },
      { kind: 'results', title: 'Results' },
      { kind: 'discussion', title: 'Discussion' },
      { kind: 'method', title: 'Methods' },
      { kind: 'references', title: 'References' },
    ],
  },
]

export function findPreset(id?: string): JournalPreset | undefined {
  return id ? PRESETS.find((p) => p.id === id) : undefined
}
