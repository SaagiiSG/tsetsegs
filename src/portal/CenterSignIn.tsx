import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { phoneDigits } from '@/lib/tenant';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { PasswordInput } from './PasswordInput';
import {
  AuthSplitLayout,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
  authGhostButtonClasses,
} from '@/components/auth/AuthSplitLayout';

export default function CenterSignIn({ signedInWithoutAccess }: { signedInWithoutAccess: boolean }) {
  const { text } = usePublicLanguage();
  const { center, signOut } = useCenter();
  const name = centerDisplayName(center);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'student' | 'staff'>('student');
  // student
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'signin' | 'create'>('signin');
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
    e.preventDefault(); setError(''); setBusy(true);
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  // Combined phone + password: look the phone up, then sign in — first-time
  // students move to the create-password step instead.
  const studentSignIn = run(async () => {
    const res = await call({ action: 'student_lookup', phone: phoneDigits(phone) });
    if (!res.activated) { setStudentEmail(''); setStage('create'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
    if (error) throw new Error('Wrong password. Ask your center admin to reset it if you forgot.');
  });
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

        {signedInWithoutAccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{text(`Энэ бүртгэл ${name}-д нэвтрэх эрхгүй.`, `This account doesn't have access to ${name}.`)}</p>
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
                  onClick={() => { setTab(t); setError(''); }}
                  className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t ? 'text-foreground border-border' : 'text-muted-foreground border-transparent hover:text-muted-foreground'
                  }`}
                >
                  {t === 'student' ? text('Сурагч', 'Student') : text('Багш / Админ', 'Teacher / Admin')}
                </Button>
              ))}
            </div>

            {tab === 'student' && stage === 'signin' && (
              <form onSubmit={studentSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cp-phone" className={authLabelClasses}>{text('Утасны дугаар', 'Phone number')}</Label>
                  <Input id="cp-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder={text('Ангидаа бүртгүүлсэн дугаар', 'Phone registered with your class')} required className={authInputClasses} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-pw" className={authLabelClasses}>{text('Нууц үг', 'Password')}</Label>
                  <PasswordInput id="cp-pw" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                    required className={authInputClasses} />
                  <p className="text-xs text-muted-foreground">{text('Анх удаа юу? Утасны дугаар, түр нууц үг оруулаад дараа нь өөрийн нууц үгийг үүсгэнэ.', "First time here? Enter your phone and any password — you'll create your real one next.")}</p>
                </div>
                <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? text('Нэвтэрч байна…', 'Signing in…') : text('Нэвтрэх', 'Sign in')}</Button>
              </form>
            )}

            {tab === 'student' && stage === 'create' && (
              <form onSubmit={createPassword} className="space-y-6">
                <p className="text-sm text-muted-foreground">{text('Нууц үгээ үүсгэнэ үү (8+ тэмдэгт, үсэг ба тоо).', 'First time here — create a password (8+ characters, letters and numbers).')}</p>
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
                <Button type="button" variant="ghost" className={authGhostButtonClasses}
                  onClick={() => { setStage('signin'); setPassword(''); setConfirm(''); }}>
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
              </form>
            )}

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </div>
    </AuthSplitLayout>
  );
}
