import { supabase } from '@/integrations/supabase/client';

export const STUDENT_EMAIL_LINK_PENDING_KEY = 'student_email_link_pending_student_id';

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

  const { data, error } = await supabase.functions.invoke('link-google-email', {
    body: { student_account_id: studentAccountId },
  });

  if (error) throw error;
  const response = data as LinkEmailResponse | null;
  if (response?.error) throw new Error(response.error);
  return response?.email ?? null;
}

export async function clearBorrowedGoogleSession() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore cleanup failures; the student session is stored separately.
  }
}