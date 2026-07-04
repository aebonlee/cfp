// withpaper/cfp AI Edge Function — 멀티 프로바이더(OpenAI / Claude)
// AI 팀원(집필가/리뷰어/에디터/윤리점검)이 논문 섹션을 쓰거나 검토한다.
//
// 배포: supabase functions deploy withpaper-ai --no-verify-jwt
// 시크릿(택1 이상):
//   supabase secrets set OPENAI_API_KEY=sk-...        # OpenAI 사용
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... # Claude 사용
// 선택:
//   supabase secrets set AI_PROVIDER=openai|claude    # 기본 프로바이더 강제
//   supabase secrets set OPENAI_MODEL=gpt-4o          # 기본 gpt-4o
//   supabase secrets set ANTHROPIC_MODEL=claude-opus-4-8

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o'
const ANTHROPIC_MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-opus-4-8'
const DEFAULT_PROVIDER = (Deno.env.get('AI_PROVIDER') ?? '').toLowerCase()
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Role = 'ai_writer' | 'ai_reviewer' | 'ai_editor' | 'ai_integrity' | 'ai_assist'
type Provider = 'openai' | 'claude'

interface Body {
  role: Role
  section: string
  title: string
  summary: string
  lang: 'ko' | 'en'
  format: 'kci' | 'imrad'
  keywords?: string[]
  method?: string
  draft?: string
  instruction?: string // ai_assist: 사용자 자유 지시
  provider?: Provider // 요청별 프로바이더 지정(선택)
  paperId?: string // 사용량 로깅용(선택)
}

function pickProvider(body: Body): Provider {
  const want = (body.provider ?? DEFAULT_PROVIDER) as Provider
  if (want === 'openai' && OPENAI_API_KEY) return 'openai'
  if (want === 'claude' && ANTHROPIC_API_KEY) return 'claude'
  // 지정이 없거나 해당 키가 없으면 있는 키로 폴백(OpenAI 우선)
  if (OPENAI_API_KEY) return 'openai'
  return 'claude'
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
  if (b.role === 'ai_assist') {
    const instr = (b.instruction ?? '').trim() || '학술적 정확성을 유지하며 더 명료하게 다듬어 주세요.'
    return `${meta}\n\n아래 「${b.section}」 텍스트를 다음 지시에 따라 수정·편집해 주세요. 학술적 정확성과 사실을 지키고(없는 인용·데이터 생성 금지), 결과는 수정된 본문 전문만 제시하세요.\n\n[지시]\n${instr}\n\n[원문]\n${b.draft ?? '(원문 없음)'}`
  }
  if (b.role === 'ai_integrity') {
    return `${meta}\n\n아래 원고를 연구윤리·유사도 관점에서 사전 점검해 주세요. 실제 표절 검사기가 아니라 투고 전 자가 점검입니다. 다음을 각각 항목·인용문과 함께 지적하세요:\n1) 출처·인용이 필요한데 누락된 주장(문장을 인용하고 어떤 근거가 필요한지)\n2) 표절 위험이 높은 상투적·일반론 문장(패러프레이즈 제안 포함)\n3) 과도한 직접 인용 또는 원문 의존\n4) 섹션 간 중복·자기표절 소지\n마지막에 '유사도 위험: 낮음/보통/높음'으로 종합 판정하세요.\n\n[원고]\n${b.draft ?? '(원고 없음)'}`
  }
  return `${meta}\n\n아래 「${b.section}」 섹션 초안을 학술지 형식에 맞게 교정(문장 다듬기, 용어 일관성, 인용 표기 정리)해 주세요. 교정본 전문을 제시하고, 끝에 주요 변경사항을 3~5개로 요약하세요.\n\n[초안]\n${b.draft ?? '(초안 없음)'}`
}

async function callOpenAI(system: string, user: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) return { error: 'OpenAI API 오류', status: res.status, detail: await res.text() }
  const data = await res.json()
  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  const u = data.usage ?? {}
  return {
    text,
    usage: u,
    model: OPENAI_MODEL,
    provider: 'openai' as const,
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
  }
}

async function callClaude(system: string, user: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) return { error: 'Claude API 오류', status: res.status, detail: await res.text() }
  const data = await res.json()
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .trim()
  const u = data.usage ?? {}
  return {
    text,
    usage: u,
    model: ANTHROPIC_MODEL,
    provider: 'claude' as const,
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
  }
}

async function logRun(
  paperId: string | undefined,
  role: string,
  out: { model: string; provider: string; inputTokens: number; outputTokens: number },
) {
  if (!SUPABASE_URL || !SERVICE) return
  try {
    const db = createClient(SUPABASE_URL, SERVICE)
    await db.from('wp_ai_runs').insert({
      paper_id: paperId ?? null,
      role,
      model: out.model,
      provider: out.provider,
      input_tokens: out.inputTokens,
      output_tokens: out.outputTokens,
      tokens: out.inputTokens + out.outputTokens,
    })
  } catch {
    /* 로깅 실패는 무시 */
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    return json({ error: 'AI 키 미설정 (OPENAI_API_KEY 또는 ANTHROPIC_API_KEY)' }, 500)
  }

  try {
    const body = (await req.json()) as Body
    if (!body?.section || !body?.title) return json({ error: 'section, title 필수' }, 400)

    const system = systemPrompt(body.lang ?? 'ko', body.format ?? 'kci')
    const user = userPrompt(body)
    const provider = pickProvider(body)

    const out = provider === 'openai' ? await callOpenAI(system, user) : await callClaude(system, user)
    if ('error' in out) return json(out, 502)
    await logRun(body.paperId, body.role, out)
    return json(out)
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
