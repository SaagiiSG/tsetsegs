import { supabase } from '@/integrations/supabase/client';

export const STUDENT_EMAIL_LINK_PENDING_KEY = 'student_email_link_pending_student_id';
export const STUDENT_EMAIL_LINKED_EVENT = 'student-google-linked';
const pendingCompletions = new Map<string, Promise<string | null>>();

export const markStudentEmailLinkPending = (studentAccountId: string) => {
  localStorage.setItem(STUDENT_EMAIL_LINK_PENDING_KEY, studentAccountId);
};

export const clearStudentEmailLinkPending = () => {
  localStorage.removeItem(STUDENT_EMAIL_LINK_PENDING_KEY);
};

export const getStudentEmailLinkPending = () => {
  return localStorage.getItem(STUDENT_EMAIL_LINK_PENDING_KEY);
};

type LinkEmailResponse = {
  ok?: boolean;
  email?: string;
  error?: string;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export async function linkCurrentGoogleEmail(studentAccountId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Google sign-in did not finish. Please try again.');

  const studentSessionId = localStorage.getItem('student_session_id') ?? '';
  if (!studentSessionId) throw new Error('Student session missing. Please log in again.');

  const { data, error } = await supabase.functions.invoke('link-google-email', {
    body: { student_account_id: studentAccountId },
    headers: { 'x-student-session-id': studentSessionId },
  });

  if (error) throw error;
  const response = data as LinkEmailResponse | null;
  if (response?.error) throw new Error(response.error);
  return response?.email ?? null;
}


export async function clearBorrowedGoogleSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore cleanup failures; the student session is stored separately.
  }
}
// Unlock before cleanup; concurrent return handlers share one completion.
export function completeStudentGoogleLink(studentAccountId: string): Promise<string | null> {
  const existing = pendingCompletions.get(studentAccountId);
  if (existing) return existing;
  const completion = (async () => {
    try {
      const email = await linkCurrentGoogleEmail(studentAccountId);
      window.dispatchEvent(new CustomEvent(STUDENT_EMAIL_LINKED_EVENT, {
        detail: { studentAccountId, email },
      }));
      return email;
    } finally {
      clearStudentEmailLinkPending();
      const url = new URL(window.location.href);
      url.searchParams.delete('link_email');
      window.history.replaceState({}, '', url.toString());
      await clearBorrowedGoogleSession();
    }
  })().finally(() => pendingCompletions.delete(studentAccountId));
  pendingCompletions.set(studentAccountId, completion);
  return completion;
}
