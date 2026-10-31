export type JoinStep = 'start' | 'name' | 'phone' | 'email' | 'code' | 'password' | 'school' | 'done';
export type JoinForm = { name: string; phone: string; email: string; emailCode: string; password: string; school: string; grade: string };

const GOOGLE: JoinStep[] = ['start', 'name', 'phone', 'school', 'done'];
const EMAIL: JoinStep[] = ['start', 'name', 'phone', 'email', 'code', 'password', 'school', 'done'];

export const joinSteps = (path: 'google' | 'email'): JoinStep[] => (path === 'google' ? GOOGLE : EMAIL);

export function canContinue(step: JoinStep, f: JoinForm): boolean {
  const digits = f.phone.replace(/\D/g, '').length;
  switch (step) {
    case 'name': return f.name.trim().length >= 2;
    case 'phone': return digits >= 6 && digits <= 15;
    case 'email': return /^\S+@\S+\.\S+$/.test(f.email.trim());
    case 'code': return /^\d{6}$/.test(f.emailCode);
    case 'password': return f.password.length >= 8 && /[A-Za-z]/.test(f.password) && /\d/.test(f.password);
    default: return true;
  }
}

// Exact server messages (tenant-accounts, emailCode.ts CODE_ERRORS, migration 0110) mapped to the step that fixes them.
const ERROR_STEPS: Record<string, JoinStep> = {
  'Enter a valid phone number.': 'phone',
  'This phone number is not active here. Ask your center.': 'phone',
  'Enter your full name.': 'name',
  'Enter a valid email.': 'email',
  'That code expired. Ask for a new one.': 'code',
  'That code is not right. Check the email and try again.': 'code',
  'Too many wrong tries. Ask for a new code.': 'code',
  'Use at least 8 characters with letters and numbers.': 'password',
  'That password is too easy to guess. Pick another.': 'password',
};
export const stepForError = (message: string): JoinStep | null => ERROR_STEPS[message] ?? null;
