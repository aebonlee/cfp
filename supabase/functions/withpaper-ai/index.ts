// withpaper AI Edge Function — Claude 연동
// AI 팀원(집필가/리뷰어/에디터)이 논문 섹션 초안을 쓰거나 검토한다.
//
// 배포: supabase functions deploy withpaper-ai --no-verify-jwt
// 시크릿: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = 'claude-opus-4-8'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Role = 'ai_writer' | 'ai_reviewer' | 'ai_editor'

interface Body {
  role: Role
  section: string // 섹션명 (예: 서론, Methods)
  title: string
  summary: string
  lang: 'ko' | 'en'
  format: 'kci' | 'imrad'
  keywords?: string[]
  method?: string
  draft?: string // 리뷰/에디터 모드에서 기존 초안
}

function systemPrompt(lang: 'ko' | 'en', format: 'kci' | 'imrad') {
  const style =
    format === 'imrad'
      ? 'an international peer-reviewed journal (IMRaD, APA 7th)'
      : '국내 학술지(KCI 등재지, APA·KCI 인용 규칙)'
  return lang === 'en'
    ? `You are an expert academic co-author helping a research team prepare a manuscript for ${style}. Write with scholarly rigor, hedged claims, and clear logical flow. Do not fabricate citations or data; where a citation is needed, mark it as [citation needed] with the kind of source required.`
    : `당신은 연구팀과 함께 ${style} 게재를 준비하는 전문 학술 공저자입니다. 학술적 엄밀성, 신중한 주장, 명료한 논리 전개로 작성하세요. 인용이나 데이터를 지어내지 말고, 인용이 필요한 곳은 [인용 필요]로 표시하고 필요한 자료 유형을 적으세요.`
}

function userPrompt(b: Body) {
  const meta = [
    `제목/Title: ${b.title}`,
    `주제 요약/Summary: ${b.summary}`,
    b.method ? `연구방법/Method: ${b.method}` : '',
    b.keywords?.length ? `키워드/Keywords: ${b.keywords.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (b.role === 'ai_writer') {
    return `${meta}\n\n위 논문의 「${b.section}」 섹션 초안을 작성해 주세요. 해당 섹션에 적합한 분량과 구조로, 바로 편집해 쓸 수 있는 완성도로 작성하세요.`
  }
  if (b.role === 'ai_reviewer') {
    return `${meta}\n\n아래는 「${b.section}」 섹션의 현재 초안입니다. 학술지 심사 기준으로 (1) 논리·근거, (2) 형식·인용, (3) 문장·표현 관점에서 구체적인 개선점을 항목별로 제시하고, 우선순위를 매겨 주세요.\n\n[초안]\n${b.draft ?? '(초안 없음)'}`
  }
  // ai_editor
  return `${meta}\n\n아래 「${b.section}」 섹션 초안을 학술지 형식에 맞게 교정(문장 다듬기, 용어 일관성, 인용 표기 정리)해 주세요. 교정본 전문을 제시하고, 끝에 주요 변경사항을 3~5개로 요약하세요.\n\n[초안]\n${b.draft ?? '(초안 없음)'}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY 미설정' }, 500)
  }

  try {
    const body = (await req.json()) as Body
    if (!body?.section || !body?.title) return json({ error: 'section, title 필수' }, 400)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: systemPrompt(body.lang ?? 'ko', body.format ?? 'kci'),
        messages: [{ role: 'user', content: userPrompt(body) }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return json({ error: 'Claude API 오류', status: res.status, detail }, 502)
    }

    const data = await res.json()
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n')
      .trim()

    return json({ text, usage: data.usage, model: MODEL })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}
