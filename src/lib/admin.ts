// 관리자 이메일 (Edge Function의 ADMIN_EMAILS 와 일치시킬 것)
export const ADMIN_EMAILS = ['aebon@kyonggi.ac.kr', 'aebon@kakao.com']

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
