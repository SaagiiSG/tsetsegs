/** New tenant_students columns (migration 0107). Optional: before it is applied, select('*') does not return them. */
export type GoogleFields = {
  user_id: string | null;
  email?: string | null; google_email?: string | null; google_user_id?: string | null; google_due_on?: string | null;
};

export const hasGoogleColumns = (students: object[]) => students.length > 0 && students.some(s => 'google_due_on' in s);
export const signsInWithGoogle = (s: GoogleFields) => s.user_id != null && s.user_id === s.google_user_id;
export const isConnected = (s: GoogleFields) => s.google_email != null;
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' });

export function googleStatus(s: GoogleFields): string {
  if (isConnected(s)) return signsInWithGoogle(s) ? 'Connected' : 'Phone sign-in';
  return s.google_due_on ? `Due ${day(s.google_due_on)}` : 'Not connected';
}
export const formatDue = day;
