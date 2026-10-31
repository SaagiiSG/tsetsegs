import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { phoneDigits } from '@/lib/tenant';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { startGoogle, type PendingGoogle } from './centerGoogle';
import { PasswordInput } from './PasswordInput';
import { ChangePasswordForm } from './ChangePasswordForm';
import {
  AuthSplitLayout,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
  authGhostButtonClasses,
} from '@/components/auth/AuthSplitLayout';

// `recovering`: opened from a reset-password email link, so the user is signed in and must pick a new password.
export default function CenterSignIn({ signedInWithoutAccess, recovering = false, onRecovered }: { signedInWithoutAccess: boolean; recovering?: boolean; onRecovered?: () => void }) {
  const { text } = usePublicLanguage();
  const { center, signOut } = useCenter();
  const name = centerDisplayName(center);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'student' | 'staff'>('student');
  // student
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'phone' | 'password' | 'create' | 'google'>('phone');
  const [studentEmail, setStudentEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // staff
  const [email, setEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('tenant-accounts', { body: { slug: center.slug, ...body } });
    if (error) {
      const msg = await (error as any).context?.json?.().then((j: any) => j.error).catch(() => null);
      throw new Error(msg || 'Something went wrong. Please try again.');
    }
    return data;
  };

  const run = (fn: () => Promise<void>) => async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  // Phone first: students who already set a password are asked for it; first-timers go straight to creating one.
  const studentLookup = run(async () => {
    const res = await call({ action: 'student_lookup', phone: phoneDigits(phone) });
    setStudentEmail(res.email ?? ''); setPassword(''); setConfirm('');
    setStage(res.google ? 'google' : res.activated ? 'password' : 'create');
  });
  const studentSignIn = run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: studentEmail, password });
    if (error) throw new Error(text('Нууц үг буруу байна.', 'Wrong password.'));
  });
  // Usually redirects to Google; only comes back here with an error message.
  const google = async (p: PendingGoogle | null) => {
    setError(''); setNotice(''); setBusy(true);
    const msg = await startGoogle(p, '/');
    if (msg) { setError(msg); setBusy(false); }
  };
  const googleButton = (label: string, p: PendingGoogle | null) => (
    <Button type="button" variant="outline" className={authGhostButtonClasses} disabled={busy} onClick={() => google(p)}>{label}</Button>
  );
  const backToPhone = () => { setStage('phone'); setPassword(''); setConfirm(''); setError(''); };
  const createPassword = run(async () => {
    if (password !== confirm) throw new Error("Passwords don't match.");
    const res = await call({ action: 'student_activate', phone: phoneDigits(phone), password });
    const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
    if (error) throw error;
  });
  const staffSignIn = run(async () => {
    // Tolerate pasting "email + password" together into the password box.
    const em = email.trim();
    let pw = staffPassword.trim();
    if (em && pw.toLowerCase().startsWith(em.toLowerCase()) && pw.length > em.length) pw = pw.slice(em.length).trim();
    const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    if (error) throw new Error('Email or password is incorrect.');
  });
  const staffForgot = run(async () => {
    const em = email.trim();
    if (!em) throw new Error(text('Эхлээд имэйлээ оруулна уу.', 'Enter your email first.'));
    // Back to this center's own address; *.flowersos.co must be on the auth redirect allow-list.
    const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: `${window.location.origin}/` });
    if (error) throw new Error(error.message);
    setNotice(text('Энэ имэйл бүртгэлтэй бол шинэ нууц үг тохируулах холбоос илгээлээ. Имэйлээ шалгана уу.', 'If this email has an account, we sent it a link to set a new password. Check your inbox.'));
  });

  return (
    <AuthSplitLayout
      eyebrow={name.toUpperCase()}
      headline={'Learn.\nBuild.\nGrow Together.'}
      subline={`${name} SAT prep portal — sign in to practice, join live classes and track your progress.`}
      accent={center.portal_settings?.brand_color || undefined}
      features={[{ label: 'SAT prep' }, { label: 'Live classes' }, { label: 'Track progress' }]}
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <CenterLogo center={center} className="h-12 w-12" />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="text-sm text-muted-foreground">{text('Төвийнхөө хэсэгт нэвтэрнэ үү', 'Sign in to your center portal')}</p>
        </div>

        {recovering ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{text('Шинэ нууц үгээ тохируулна уу.', 'Set a new password for your account.')}</p>
            <ChangePasswordForm onAuthPage onDone={onRecovered} />
          </div>
        ) : signedInWithoutAccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{text(`Энэ Google бүртгэл ${name}-ийн ямар ч сурагчтай холбогдоогүй байна. Утасны дугаараараа нэвтэрч ороод Google-ээ холбоно уу.`, `This Google account isn't connected to a student at ${name}. Sign in with your phone number, then connect Google.`)}</p>
            <Button className={authPrimaryButtonClasses} onClick={signOut}>{text('Өөр бүртгэлээр нэвтрэх', 'Use a different account')}</Button>
          </div>
        ) : (
          <>
            {/* underline tabs, matching the staff login */}
            <div className="flex gap-6 border-b border-border">
              {(['student', 'staff'] as const).map(t => (
                <Button variant="ghost"
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(''); setNotice(''); }}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t ? 'text-foreground border-border' : 'text-muted-foreground border-transparent hover:text-muted-foreground'
                  }`}
                >
                  {t === 'student' ? text('Сурагч', 'Student') : text('Багш / Админ', 'Teacher / Admin')}
                </Button>
              ))}
            </div>

            {tab === 'student' && stage === 'phone' && (
              <form onSubmit={studentLookup} className="space-y-6">
                {googleButton(text('Google-ээр үргэлжлүүлэх', 'Continue with Google'), null)}
                <p className="text-center text-xs text-muted-foreground">{text('эсвэл утасны дугаараар', 'or use your phone number')}</p>
                <div className="space-y-2">
                  <Label htmlFor="cp-phone" className={authLabelClasses}>{text('Утасны дугаар', 'Phone number')}</Label>
                  <Input id="cp-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder={text('Ангидаа бүртгүүлсэн дугаар', 'Phone registered with your class')} required className={authInputClasses} />
                </div>
                <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? text('Шалгаж байна…', 'Checking…') : text('Үргэлжлүүлэх', 'Continue')}</Button>
              </form>
            )}

            {tab === 'student' && stage === 'password' && (
              <form onSubmit={studentSignIn} className="space-y-6">
                <p className="text-sm text-muted-foreground">{text('Утас', 'Phone')}: <span className="font-mono text-foreground">{phone}</span></p>
                <div className="space-y-2">
                  <Label htmlFor="cp-pw" className={authLabelClasses}>{text('Нууц үг', 'Password')}</Label>
                  <PasswordInput id="cp-pw" autoComplete="current-password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
                    required className={authInputClasses} />
                  <p className="text-xs text-muted-foreground">{text('Нууц үгээ мартсан уу? Төвөөсөө шинэчилж өгөхийг хүсээрэй.', 'Forgot your password? Ask your center to reset it.')}</p>
                </div>
                <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? text('Нэвтэрч байна…', 'Signing in…') : text('Нэвтрэх', 'Sign in')}</Button>
                <Button type="button" variant="ghost" className={authGhostButtonClasses} onClick={backToPhone}>{text('Буцах', 'Back')}</Button>
              </form>
            )}

            {tab === 'student' && stage === 'google' && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">{text('Энэ бүртгэл Google-ээр нэвтэрдэг.', 'This account signs in with Google.')}</p>
                {googleButton(text('Google-ээр үргэлжлүүлэх', 'Continue with Google'), null)}
                <Button type="button" variant="ghost" className={authGhostButtonClasses} onClick={backToPhone}>{text('Буцах', 'Back')}</Button>
              </div>
            )}

            {tab === 'student' && stage === 'create' && (
              <form onSubmit={createPassword} className="space-y-6">
                <p className="text-sm text-muted-foreground">{text('Нууц үгээ үүсгэнэ үү (8+ тэмдэгт, үсэг ба тоо).', 'Create your password — 8+ characters, with letters and numbers.')}</p>
                <div className="space-y-2">
                  <Label htmlFor="cp-new" className={authLabelClasses}>{text('Шинэ нууц үг', 'New password')}</Label>
                  <PasswordInput id="cp-new" autoComplete="new-password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={8} className={authInputClasses} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-confirm" className={authLabelClasses}>{text('Нууц үг давтах', 'Confirm password')}</Label>
                  <PasswordInput id="cp-confirm" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required className={authInputClasses} />
                </div>
                <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? text('Үүсгэж байна…', 'Creating…') : text('Нууц үг үүсгэх', 'Create password')}</Button>
                <p className="text-center text-xs text-muted-foreground">{text('эсвэл', 'or')}</p>
                {googleButton(text('Google-ээр үргэлжлүүлэх', 'Or continue with Google'), { kind: 'claim', phone: phoneDigits(phone) })}
                <Button type="button" variant="ghost" className={authGhostButtonClasses}
                  onClick={backToPhone}>
                  {text('Буцах', 'Back')}
                </Button>
              </form>
            )}

            {tab === 'staff' && (
              <form onSubmit={staffSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cp-email" className={authLabelClasses}>{text('Имэйл', 'Email')}</Label>
                  <Input id="cp-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                    required className={authInputClasses} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-spw" className={authLabelClasses}>{text('Нууц үг', 'Password')}</Label>
                  <PasswordInput id="cp-spw" autoComplete="current-password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)}
                    required className={authInputClasses} />
                </div>
                <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? text('Нэвтэрч байна…', 'Signing in…') : text('Нэвтрэх', 'Sign in')}</Button>
                <Button type="button" variant="ghost" className={authGhostButtonClasses} disabled={busy} onClick={staffForgot}>
                  {text('Нууц үгээ мартсан уу?', 'Forgot password?')}
                </Button>
              </form>
            )}

            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </div>
    </AuthSplitLayout>
  );
}
