import { supabase } from './supabase'
import type { Paper } from '../types'

export type AiRole = 'ai_writer' | 'ai_reviewer' | 'ai_editor'

export interface AiRequest {
  role: AiRole
  section: string
  paper: Paper
  draft?: string
}

export interface AiResponse {
  text: string
  usage?: unknown
  model?: string
}

/**
 * withpaper-ai Edge Function 호출.
 * 함수/키가 아직 배포 전이면 사용자에게 안내 메시지를 반환한다(앱은 계속 동작).
 */
export async function requestAi(req: AiRequest): Promise<AiResponse> {
  const { paper } = req
  const payload = {
    role: req.role,
    section: req.section,
    title: paper.title,
    summary: paper.summary,
    lang: paper.lang,
    format: paper.format,
    keywords: paper.keywords,
    method: paper.method,
    draft: req.draft,
  }

  const { data, error } = await supabase.functions.invoke('withpaper-ai', { body: payload })

  if (error) {
    return {
      text:
        'AI 팀원(Claude) 연동이 아직 준비 중입니다.\n\n' +
        'Supabase Edge Function `withpaper-ai` 배포와 ANTHROPIC_API_KEY 설정 후 사용할 수 있어요.\n' +
        '(supabase functions deploy withpaper-ai · supabase secrets set ANTHROPIC_API_KEY=...)',
    }
  }
  return data as AiResponse
}
