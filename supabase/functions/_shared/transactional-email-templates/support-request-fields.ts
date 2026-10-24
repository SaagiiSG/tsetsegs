// Subject and message are typed by center staff, so they are untrusted text. React escapes them in the
// email body; the subject is a mail header, so it is forced onto one line.
import { oneLine, submittedAt } from './educator-demo-request-fields.ts'

export interface SupportRequest {
  center_name?: string
  name?: string
  role?: string
  email?: string
  subject?: string
  message?: string
  created_at?: string
}

const ROLE_LABEL: Record<string, string> = { center_admin: 'Center admin', teacher: 'Teacher' }

export const supportRequestSubject = (r: SupportRequest) =>
  `Support: ${oneLine(r.subject).slice(0, 100) || 'new request'} (${oneLine(r.center_name).slice(0, 60) || 'center'})`

export function supportRequestRows(r: SupportRequest): [string, string][] {
  const rows: [string, unknown][] = [
    ['Center', r.center_name],
    ['From', r.name],
    ['Role', ROLE_LABEL[r.role ?? ''] ?? r.role],
    ['Email', r.email],
    ['Subject', r.subject],
    ['Sent', submittedAt(r.created_at)],
  ]
  return rows.map(([label, value]) => [label, oneLine(value) || '—'])
}
