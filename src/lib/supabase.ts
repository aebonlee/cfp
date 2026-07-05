import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 공유 Supabase 프로젝트. 클린 빌드(시크릿 누락) 시에도 로그인이 깨지지 않도록
// URL/anon key 는 fallback 을 하드코딩한다.
const FALLBACK_URL = 'https://hcmgdztsgjvzcyxyayaj.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjbWdkenRzZ2p2emN5eHlheWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzU4ODcsImV4cCI6MjA4NzAxMTg4N30.gznaPzY1l8qDAPsEyYNR9KS7f7VqS3xaw-_2HTSwSZw'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
  },
})

// withpaper 테이블 접두사: wp_
export const DB_PREFIX = 'wp_'
export const TABLES = {
  papers: `${DB_PREFIX}papers`,
  members: `${DB_PREFIX}paper_members`,
  sections: `${DB_PREFIX}sections`,
  comments: `${DB_PREFIX}comments`,
  references: `${DB_PREFIX}references`,
  aiRuns: `${DB_PREFIX}ai_runs`,
  applications: `${DB_PREFIX}applications`,
} as const

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://cfp.dreamitbiz.com'
