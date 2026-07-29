import { useAuth } from '@/contexts/AuthContext';

/** Emails allowed to access dev-only admin tools (e.g. Bluebook manager). */
export const DEV_ACCOUNT_EMAILS = ['saranochir.s@gmail.com'];

export function isDevEmail(email?: string | null) {
  if (!email) return false;
  return DEV_ACCOUNT_EMAILS.includes(email.trim().toLowerCase());
}

export function useIsDevAccount() {
  const { user } = useAuth();
  return isDevEmail(user?.email);
}
