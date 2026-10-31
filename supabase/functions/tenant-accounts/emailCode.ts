// Email sign-up codes: pure helpers (Web Crypto only, so Vitest and Deno both run them).
export const CODE_ERRORS = {
  expired: 'That code expired. Ask for a new one.',
  wrong: 'That code is not right. Check the email and try again.',
  locked: 'Too many wrong tries. Ask for a new code.',
} as const

export const newCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')

export async function hashCode(email: string, code: string) {
  const bytes = new TextEncoder().encode(`${email.toLowerCase()}:${code}`)
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

// sent: ISO times of this email's codes in this center from the last hour.
export function canSend(sent: string[], now: Date): { ok: true } | { ok: false; error: string } {
  if (sent.length >= 5) return { ok: false, error: 'Too many codes. Try again in an hour.' }
  if (sent.some((t) => now.getTime() - Date.parse(t) < 60_000)) return { ok: false, error: 'Wait a minute before asking for another code.' }
  return { ok: true }
}

export function checkCode(row: { code_hash: string; expires_at: string; attempts: number } | null, typedHash: string, now: Date): 'ok' | 'expired' | 'wrong' | 'locked' {
  if (!row || Date.parse(row.expires_at) <= now.getTime()) return 'expired'
  if (row.attempts >= 5) return 'locked'
  return row.code_hash === typedHash ? 'ok' : 'wrong'
}
