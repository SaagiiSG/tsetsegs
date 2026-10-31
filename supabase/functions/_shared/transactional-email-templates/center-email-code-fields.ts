import { oneLine } from './educator-demo-request-fields.ts'

// The center name is staff-typed and the subject is a mail header, so it is forced onto one line.
export const centerEmailCodeSubject = (d: { code?: string; center_name?: string }) =>
  `${oneLine(d.code)} is your ${oneLine(d.center_name).slice(0, 60) || 'center'} code`
