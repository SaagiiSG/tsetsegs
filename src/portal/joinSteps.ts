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
