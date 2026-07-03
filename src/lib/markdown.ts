// 경량 마크다운 → HTML 렌더러 (의존성 없음, 가독성용)
// ReviewView/미리보기에서 원문 코드 대신 서식·이미지를 보여준다.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// href/src 안전 검사 (javascript: 등 차단)
function safeUrl(u: string): string {
  const t = u.trim()
  if (/^(https?:\/\/|\/|#|data:image\/)/i.test(t)) return t
  return '#'
}

function inline(text: string): string {
  let s = esc(text)
  // 이미지 ![alt](src)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    return `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy" />`
  })
  // 링크 [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, url) => {
    return `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${t}</a>`
  })
  // 굵게 **x** / __x__
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  // 기울임 *x* / _x_
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
  // 인라인 코드 `x`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  return s
}

/** 블록(빈 줄로 구분된 덩어리) 하나를 HTML 로 렌더 */
export function renderMarkdownBlock(block: string): string {
  const lines = block.split('\n').map((l) => l.replace(/\s+$/, ''))
  const first = lines[0]?.trim() ?? ''

  // 헤딩
  const h = first.match(/^(#{1,6})\s+(.*)$/)
  if (h && lines.length === 1) {
    const level = Math.min(h[1].length, 4)
    const tag = level <= 2 ? 'h3' : 'h4'
    return `<${tag}>${inline(h[2])}</${tag}>`
  }

  // 단독 이미지
  if (lines.length === 1 && /^!\[[^\]]*\]\([^)]+\)$/.test(first)) {
    return `<p class="cfp-md-img">${inline(first)}</p>`
  }

  // 인용문
  if (lines.every((l) => l.trim().startsWith('>'))) {
    const body = lines.map((l) => inline(l.replace(/^\s*>\s?/, ''))).join('<br/>')
    return `<blockquote>${body}</blockquote>`
  }

  // 표 (| a | b |) — 구분선(---) 행 제외
  if (lines.length >= 2 && lines.filter((l) => l.includes('|')).length >= lines.length - 1) {
    const rows = lines.filter((l) => l.includes('|') && !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
    if (rows.length) {
      const cells = (l: string) =>
        l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
      const head = cells(rows[0])
      const body = rows.slice(1).map(cells)
      const thead = `<tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`
      const tbody = body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')
      return `<div class="cfp-md-tablewrap"><table>${thead}${tbody}</table></div>`
    }
  }

  // 순서 없는 목록
  if (lines.every((l) => /^\s*[-*]\s+/.test(l) || l.trim() === '')) {
    const items = lines.filter((l) => l.trim()).map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
    return `<ul>${items.join('')}</ul>`
  }
  // 순서 있는 목록
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l) || l.trim() === '')) {
    const items = lines.filter((l) => l.trim()).map((l) => `<li>${inline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`)
    return `<ol>${items.join('')}</ol>`
  }

  // 일반 문단
  return `<p>${lines.map((l) => inline(l)).join('<br/>')}</p>`
}

/** 여러 블록으로 이뤄진 문서 전체를 렌더 */
export function renderMarkdown(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(renderMarkdownBlock)
    .join('\n')
}
