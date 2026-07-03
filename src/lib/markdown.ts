// 경량 마크다운 → HTML 렌더러 (의존성 없음, 가독성용)
// 줄 단위로 파싱하여 표·목록·인용·헤딩·이미지를 어디서든 올바르게 렌더한다.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function safeUrl(u: string): string {
  const t = u.trim()
  if (/^(https?:\/\/|\/|#|data:image\/)/i.test(t)) return t
  return '#'
}

function inline(text: string): string {
  let s = esc(text)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${t}</a>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  return s
}

const isTableRow = (l: string) => l.trim().startsWith('|') && l.includes('|')
const isSeparator = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l)
const cells = (l: string) =>
  l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

function renderTable(rows: string[]): string {
  const data = rows.filter((r) => !isSeparator(r))
  if (data.length === 0) return ''
  const head = cells(data[0])
  const thead = `<tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`
  const tbody = data
    .slice(1)
    .map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<div class="cfp-md-tablewrap"><table>${thead}${tbody}</table></div>`
}

/** 여러 줄을 순회하며 표/목록/인용/헤딩/문단을 렌더 */
function renderLines(lines: string[]): string {
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    // 표: 연속된 표 행
    if (isTableRow(line)) {
      const rows: string[] = []
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++])
      if (rows.filter((r) => !isSeparator(r)).length >= 1) {
        out.push(renderTable(rows))
        continue
      }
      rows.forEach((r) => out.push(`<p>${inline(r)}</p>`))
      continue
    }
    // 헤딩
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const tag = h[1].length <= 2 ? 'h3' : 'h4'
      out.push(`<${tag}>${inline(h[2])}</${tag}>`)
      i++
      continue
    }
    // 인용문(연속)
    if (line.trim().startsWith('>')) {
      const q: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) q.push(inline(lines[i++].replace(/^\s*>\s?/, '')))
      out.push(`<blockquote>${q.join('<br/>')}</blockquote>`)
      continue
    }
    // 순서 없는 목록(연속)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`)
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    // 순서 있는 목록(연속)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`)
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    // 단독 이미지
    if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) {
      out.push(`<p class="cfp-md-img">${inline(line.trim())}</p>`)
      i++
      continue
    }
    // 일반 문단(다음 특수 줄 전까지 묶기)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isTableRow(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(inline(lines[i++]))
    }
    out.push(`<p>${para.join('<br/>')}</p>`)
  }
  return out.join('')
}

/** 블록(빈 줄로 구분된 덩어리) 하나를 HTML 로 렌더 */
export function renderMarkdownBlock(block: string): string {
  return renderLines(block.split('\n').map((l) => l.replace(/\s+$/, '')))
}

/** 문서 전체를 HTML 로 렌더 */
export function renderMarkdown(text: string): string {
  return renderLines(text.split('\n').map((l) => l.replace(/\s+$/, '')))
}
