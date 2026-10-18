import { supabase } from '@/integrations/supabase/client';

// The server-issued student session token. Sent on every database request as
// `x-student-token`; the database maps it to the signed-in student, so writes
// to points, badges, streaks and rankings only work for the student's own rows.
const KEY = 'student_token';

function setHeader(token: string | null) {
  const headers = (supabase as any).rest?.headers as Headers | Record<string, string> | undefined;
  if (!headers) return;
  if (typeof (headers as Headers).set === 'function') {
    if (token) (headers as Headers).set('x-student-token', token);
    else (headers as Headers).delete('x-student-token');
  } else if (token) {
    (headers as Record<string, string>)['x-student-token'] = token;
  } else {
    delete (headers as Record<string, string>)['x-student-token'];
  }
}

export function getStudentToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setStudentToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
  setHeader(token);
}

// Restore on app load, before any query runs.
setHeader(getStudentToken());
