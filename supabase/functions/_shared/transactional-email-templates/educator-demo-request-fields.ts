// Everything here comes from the public /educators form, so it is untrusted text. React escapes it in
// the email body; the subject is a mail header, so it is forced onto one line.
export interface DemoRequest {
  name?: string
  institution_name?: string
  email?: string
  phone?: string
  country?: string
  student_count?: number
  message?: string
  created_at?: string
}

export const oneLine = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const demoRequestSubject = (r: DemoRequest) =>
  `New demo request: ${oneLine(r.institution_name).slice(0, 100) || 'educator'}`

export const submittedAt = (iso?: string) =>
  iso && !Number.isNaN(Date.parse(iso)) ? `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC` : ''

export function demoRequestRows(r: DemoRequest): [string, string][] {
  const rows: [string, unknown][] = [
    ['Name', r.name],
    ['Center / school', r.institution_name],
    ['Email', r.email],
    ['Phone', r.phone],
    ['Country', r.country],
    ['Students', r.student_count],
    ['Submitted', submittedAt(r.created_at)],
  ]
  return rows.map(([label, value]) => [label, oneLine(value) || '—'])
}
