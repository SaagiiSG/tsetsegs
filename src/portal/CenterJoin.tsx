import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { centerAccounts } from './centerApi';
import { startGoogle, takePending } from './centerGoogle';
import { PasswordInput } from './PasswordInput';
import { canContinue, joinSteps, stepForError, type JoinForm, type JoinStep } from './joinSteps';
import { AuthSplitLayout, authInputClasses, authLabelClasses } from '@/components/auth/AuthSplitLayout';

const ACCOUNT_READY = 'Your account is ready. Sign in with your phone number and password.';

const TITLES: Record<JoinStep, string> = {
  start: 'Join your class',
  name: 'What is your full name?',
  phone: 'What is your phone number?',
  email: 'What is your email?',
  code: 'Enter your code',
  password: 'Make a password',
  school: 'Where do you study?',
  done: '',
};

/** Public class sign-up reached from a class join link / QR code. The code is the invitation, so students are enrolled instantly. */
export default function CenterJoin() {
  const { code = '' } = useParams();
  const { center } = useCenter();
  const centerName = centerDisplayName(center);
  const navigate = useNavigate();
  const [cls, setCls] = useState<{ class_id: string; class_name: string } | null | undefined>(undefined);
  const [path, setPath] = useState<'google' | 'email'>('email');
  const [step, setStep] = useState<JoinStep>('start');
  const [form, setForm] = useState<JoinForm>({ name: '', phone: '', email: '', emailCode: '', password: '', school: '', grade: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    supabase.rpc('tenant_join_lookup', { _slug: center.slug, _code: code }).then(({ data }) => setCls(data?.[0] ?? null));
  }, [center.slug, code]);

  // Back from Google: the pending join is ours and a session exists, so carry on at the name step.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const p = takePending(['join']);
      if (!p || p.kind !== 'join' || p.code !== code) return;
      const meta = user.user_metadata ?? {};
      setPath('google');
      setForm(f => ({ ...f, name: String(meta.full_name || meta.name || '') }));
      setStep('name');
    });
  }, [code]);

  useEffect(() => { title.current?.focus(); }, [step]);

  const steps = joinSteps(path);
  const idx = steps.indexOf(step);
  const set = <K extends keyof JoinForm>(k: K, v: string) => setForm(f => ({ ...f, [k]: v }));
  const go = (s: JoinStep) => { setError(''); setNote(''); setStep(s); };
  const next = () => go(steps[idx + 1]);
  const back = () => go(steps[idx - 1]);
  const accountExists = /already have an account/i.test(error) || error === ACCOUNT_READY;

  const google = async () => {
    setBusy(true); setError('');
    const err = await startGoogle({ kind: 'join', code }, '/join/' + code);
    if (err) { setError(err); setBusy(false); }
  };

  const sendCode = async () => {
    setBusy(true); setError(''); setNote('');
    try {
      await centerAccounts({ action: 'send_email_code', slug: center.slug, code, email: form.email.trim() });
      return true;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  };

  const resend = async () => { if (await sendCode()) setNote('We sent a new code.'); };

  const finish = async (skip = false) => {
    const school = skip ? '' : form.school.trim(), grade = skip ? '' : form.grade.trim();
    setBusy(true); setError('');
    try {
      if (path === 'google') {
        const { error: err } = await supabase.rpc('tenant_join_with_google' as any, {
          _slug: center.slug, _code: code, _name: form.name.trim(), _phone: form.phone, _school: school, _grade: grade,
        });
        if (err) throw new Error(err.message);
        // The session object is unchanged by the join, so refresh it for the portal's role check.
        await supabase.auth.refreshSession();
      } else {
        const res = await centerAccounts<{ email: string }>({
          action: 'register_verified', slug: center.slug, code, name: form.name.trim(), phone: form.phone, email: form.email.trim(),
          email_code: form.emailCode, password: form.password, school, grade,
        });
        const { error: sErr } = await supabase.auth.signInWithPassword({ email: res.email, password: form.password });
        if (sErr) throw new Error(ACCOUNT_READY);
      }
      // '/' lets the portal's redirect place the student once the role is known.
      navigate('/', { replace: true });
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      // Show-only messages (account exists / account made) stay put; known field errors go back to their step.
      const to = stepForError(msg);
      if (to && steps.includes(to)) setStep(to);
    } finally { setBusy(false); }
  };

  const run = async () => {
    if (step === 'email') { if (await sendCode()) next(); }
    else if (step === 'school') await finish();
    else next();
  };

  const label = step === 'school' ? (busy ? 'Joining…' : 'Join class') : 'Continue';
  const skippable = step === 'school';

  return (
    <AuthSplitLayout headline="Join your class">
      <div className="space-y-8">
        <div className="space-y-3">
          <CenterLogo center={center} className="h-12 w-12" />
          <p className="text-sm text-muted-foreground">{centerName}{cls ? ` · ${cls.class_name}` : ''}</p>
        </div>

        {cls === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : cls === null ? (
          <p className="text-sm text-muted-foreground">This join link isn't valid. Ask your teacher for a new one.</p>
        ) : (
          <div className="space-y-6">
            {step !== 'start' && <Progress value={(idx / (steps.length - 2)) * 100} aria-label="Sign-up progress" className="!h-1" />}
            <h1 ref={title} tabIndex={-1} className="text-3xl font-bold outline-none">{step === 'start' ? `Join ${cls.class_name}` : TITLES[step]}</h1>

            {step === 'start' && <div className="space-y-3">
              <p className="text-lg text-muted-foreground">Make your {centerName} account. It takes about a minute.</p>
              <Button size="lg" className="h-12 w-full rounded-full text-base" disabled={busy} onClick={google}>Continue with Google</Button>
              <Button size="lg" variant="outline" className="h-12 w-full rounded-full text-base" disabled={busy} onClick={() => { setPath('email'); next(); }}>Use my email instead</Button>
            </div>}

            {step === 'name' && <Field id="j-name" label="Full name">
              <Input id="j-name" autoFocus autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} className={authInputClasses} />
            </Field>}
            {step === 'phone' && <Field id="j-phone" label="Phone number" hint="Your center uses this to find you.">
              <Input id="j-phone" autoFocus type="tel" inputMode="tel" autoComplete="tel" placeholder="+976 9911 2233" value={form.phone} onChange={e => set('phone', e.target.value)} className={authInputClasses} />
            </Field>}
            {step === 'email' && <Field id="j-email" label="Email">
              <Input id="j-email" autoFocus type="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} className={authInputClasses} />
            </Field>}
            {step === 'code' && <div className="space-y-3">
              <p className="text-muted-foreground">We sent a 6-digit code to {form.email.trim()}.</p>
              <InputOTP autoFocus maxLength={6} inputMode="numeric" aria-label="6-digit code" value={form.emailCode} onChange={v => set('emailCode', v.replace(/\D/g, ''))}>
                <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
              </InputOTP>
              <Button type="button" variant="link" className="h-auto p-0" disabled={busy} onClick={resend}>Send a new code</Button>
            </div>}
            {step === 'password' && <Field id="j-pw" label="Password" hint="At least 8 characters, with a letter and a number.">
              <PasswordInput id="j-pw" autoFocus autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} className={authInputClasses} />
            </Field>}
            {step === 'school' && <div className="grid grid-cols-[1fr_6rem] gap-4">
              <Field id="j-school" label="School">
                <Input id="j-school" autoFocus value={form.school} onChange={e => set('school', e.target.value)} className={authInputClasses} />
              </Field>
              <Field id="j-grade" label="Grade">
                <Input id="j-grade" value={form.grade} onChange={e => set('grade', e.target.value)} className={authInputClasses} />
              </Field>
            </div>}

            {note && <p role="status" className="text-sm text-muted-foreground">{note}</p>}
            {error && <p role="alert" className="text-sm text-destructive">
              {error}{accountExists && <> <Link to="/" className="font-semibold underline">Sign in</Link></>}
            </p>}

            {step !== 'start' && <div className="flex gap-2">
              <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={busy} onClick={back}>Back</Button>
              {skippable && <Button variant="ghost" size="lg" className="h-12 rounded-full" disabled={busy} onClick={() => finish(true)}>Skip</Button>}
              <Button size="lg" className="h-12 flex-1 rounded-full text-base" disabled={busy || !canContinue(step, form)} onClick={run}>{label}<ArrowRight className="h-5 w-5" /></Button>
            </div>}
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={authLabelClasses}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
