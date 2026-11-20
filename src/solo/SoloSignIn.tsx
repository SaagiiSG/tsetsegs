import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import BrandMark from '@/components/BrandMark';
import { AppleMark, GoogleMark, MicrosoftMark } from '@/components/auth/BrandIcons';
import { authInputClasses, authLabelClasses, authPrimaryButtonClasses } from '@/components/auth/AuthSplitLayout';
import clouds from '@/assets/landing/07-clouds-near.svg';
import '@/components/landing/landing.css';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { PRIVACY_URL, TERMS_URL, TERMS_VERSION, rememberTick } from '@/lib/terms';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// AuthSplitLayout's cloud sky, with plain links: before joining, /solo has no router for its <Link>s.
export const SoloShell = ({ children }: { children: React.ReactNode }) => (
  <div className="landing-v2 auth-public min-h-screen relative isolate overflow-x-clip bg-background text-foreground">
    <div aria-hidden className="auth-sky absolute inset-x-0 top-0 -z-10 h-96"><img src={clouds} alt="" className="absolute bottom-0 w-full" /></div>
    <header className="lv-container flex min-h-20 items-center py-4">
      <a href="/" className="flex items-center gap-2"><BrandMark className="h-7 w-7" /><span className="font-chillax text-xl font-semibold">flowersos</span></a>
    </header>
    <main className="relative mx-auto w-full max-w-lg space-y-8 px-6 py-12 sm:py-16">
      {children}
      <div className="text-center"><a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</a></div>
    </main>
  </div>
);

const oauthButton = 'w-full h-12 rounded-full gap-3 bg-card text-base font-medium';
// Must match the email code length in the Supabase auth settings: the emails carry 8 digits (Saagii, 19 Nov).
const CODE_LENGTH = 8;

// No-session path passes onHaveAccount; a refused join passes onSignOut instead, since "I already have an account" would only bounce back here.
export function SoloBlocked({ onHaveAccount, onSignOut }: { onHaveAccount?: () => void; onSignOut?: () => void }) {
  return (
    <SoloShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight leading-[1.15]">Solo бүртгэл зөвхөн Монголоос гадна байгаа сурагчдад зориулагдсан.</h1>
        <p className="text-sm text-muted-foreground">Монголд flowersos нь Flowers-ийн SAT сургалттай хамт ирдэг.</p>
        <p className="text-sm text-muted-foreground">Solo accounts are for students outside Mongolia. In Mongolia, flowersos comes with the Flowers SAT course.</p>
      </div>
      <div className="space-y-2">
        <Button asChild className={authPrimaryButtonClasses}><a href="/?lang=mon">Flowers SAT course</a></Button>
        {onHaveAccount && <Button variant="link" size="sm" className="w-full" onClick={onHaveAccount}>I already have a solo account</Button>}
        {onSignOut && <Button variant="link" size="sm" className="w-full" onClick={onSignOut}>Sign out</Button>}
      </div>
    </SoloShell>
  );
}

type Mode = 'signup' | 'signin' | 'forgot' | 'code';
type Result = { error?: { message?: string } | null };

/** A password box with a Show/Hide toggle, as most apps have. */
function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={shown ? 'text' : 'password'} required minLength={MIN_PASSWORD} autoComplete={autoComplete} className={`${authInputClasses} pr-16`} value={value} onChange={e => onChange(e.target.value)} />
      <button type="button" onClick={() => setShown(v => !v)} aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-3 my-auto h-8 rounded-full px-2 text-xs font-medium text-muted-foreground hover:text-foreground">{shown ? 'Hide' : 'Show'}</button>
    </div>
  );
}

const MIN_PASSWORD = 8;
// Supabase's words, in ours.
const friendly = (m?: string) =>
  /invalid login credentials/i.test(m ?? '') ? 'Wrong email or password.'
  : /already registered|already exists/i.test(m ?? '') ? 'That email already has an account. Sign in instead.'
  : /token has expired or is invalid/i.test(m ?? '') ? 'That code is wrong or has expired. Send a new one.'
  : /signups not allowed/i.test(m ?? '') ? 'No account with that email yet. Create an account first.'
  : m || 'Something went wrong. Try again.';

/**
 * Solo sign-in like most apps (Saagii, 20 Nov): email and password, with Create account, Sign in and Forgot password.
 * No name here; onboarding asks for it. When Supabase wants the email confirmed, an 8-digit code finishes sign-up.
 */
export default function SoloSignIn({ start = 'signup' }: { start?: 'signup' | 'signin' }) {
  const [mode, setMode] = useState<Mode>(start);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // The terms ask comes as a pop-up when they start an account, not as a box on the page (Saagii, 20 Nov).
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const withTerms = (go: () => void) => (agreed ? go() : setPending(() => go));
  const agree = () => { setAgreed(true); rememberTick(true); const go = pending; setPending(null); go?.(); };
  const [codeFor, setCodeFor] = useState<'signup' | 'email'>('signup'); // a sign-up confirmation, or a sign-in code
  const to = (m: Mode) => { setMode(m); setError(null); setInfo(null); setCode(''); };

  const run = async (fn: () => Promise<Result>) => {
    setBusy(true); setError(null);
    try { const { error: e } = await fn(); if (e) setError(friendly(e.message)); else return true; }
    catch (e) { setError(friendly((e as Error)?.message)); }
    finally { setBusy(false); }
    return false;
  };
  const addr = email.trim();

  const oauth = (provider: 'google' | 'apple' | 'microsoft') =>
    run(() => lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + '/solo' }) as Promise<Result>);
  // A session here means the project skips email confirmation; otherwise the email carries the code.
  const signUp = async () => {
    let next: Mode | null = null;
    await run(async () => {
      const r = await supabase.auth.signUp({ email: addr, password, options: { emailRedirectTo: window.location.origin + '/solo', data: { terms_version: TERMS_VERSION } } });
      if (r.error || r.data.session) return r;
      // Supabase answers a taken, confirmed email with a user that has no identities (and sends nothing).
      if (r.data.user?.identities?.length === 0) return { error: { message: 'already registered' } };
      next = 'code';
      return r;
    });
    if (next) { setCodeFor('signup'); to(next); }
  };
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: addr, password });
    setBusy(false);
    if (!err) return;
    // An account that never confirmed its email: send a fresh code and finish here.
    if (/not confirmed/i.test(err.message)) { await supabase.auth.resend({ type: 'signup', email: addr }); setCodeFor('signup'); to('code'); return; }
    setError(friendly(err.message));
  };
  const forgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await run(() => supabase.auth.resetPasswordForEmail(addr, { redirectTo: window.location.origin + '/solo' }))) setInfo(`If ${addr} has an account, we've emailed it a link to set a new password.`);
  };
  // Sign in with a code instead of the password (Saagii, 20 Nov), for existing accounts only.
  const emailCode = () => supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: false } });
  const sendSignInCode = async () => {
    if (!addr) { setError('Enter your email first.'); return; }
    if (await run(emailCode)) { setCodeFor('email'); to('code'); }
  };
  const verify = async (token: string) => { if (!(await run(() => supabase.auth.verifyOtp({ email: addr, token, type: codeFor })))) setCode(''); };
  const resend = async () => {
    if (await run(() => (codeFor === 'email' ? emailCode() : supabase.auth.resend({ type: 'signup', email: addr })))) setInfo('We sent a new code.');
  };

  const link = 'font-medium text-foreground underline underline-offset-4';
  const heading = mode === 'signin' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : mode === 'code' ? 'Check your email' : 'Start practicing SAT';
  return (
    <SoloShell>
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Solo practice</p>
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">{heading}</h1>
        {mode === 'signup' && <p className="text-sm text-muted-foreground">Free, no card needed. <a className="underline underline-offset-4 hover:text-foreground" href="/?lang=eng#pricing">See plans</a></p>}
      </div>

      {mode === 'code' ? (
        <div className="space-y-3">
          <p className="text-sm">We sent a code to {addr}. Enter it here, or tap the link in the email.</p>
          <InputOTP maxLength={CODE_LENGTH} value={code} disabled={busy} onChange={v => { setCode(v); if (v.length === CODE_LENGTH) void verify(v); }} aria-label={`${CODE_LENGTH}-digit code`}>
            {/* w-9 below sm so 8 boxes fit a 360px phone. */}
            <InputOTPGroup>{Array.from({ length: CODE_LENGTH }, (_, i) => <InputOTPSlot key={i} index={i} className="w-9 sm:w-10" />)}</InputOTPGroup>
          </InputOTP>
          <p className="text-sm text-muted-foreground">No email? <button type="button" className={link} disabled={busy} onClick={() => void resend()}>Send a new code</button></p>
          <p className="text-sm text-muted-foreground"><button type="button" className={link} onClick={() => to('signin')}>Back to sign in</button></p>
        </div>
      ) : mode === 'forgot' ? (
        <form onSubmit={forgot} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="solo-email" className={authLabelClasses}>Email</Label><Input id="solo-email" type="email" required autoComplete="email" className={authInputClasses} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || !addr}>Email me a reset link</Button>
          <p className="text-sm text-muted-foreground"><button type="button" className={link} onClick={() => to('signin')}>Back to sign in</button></p>
        </form>
      ) : <>
        <div className="space-y-3">
          {/* Google, Apple or Microsoft may create an account, so they ask for the terms first, in either mode. */}
          <Button variant="outline" className={oauthButton} disabled={busy} onClick={() => withTerms(() => void oauth('google'))}><GoogleMark className="h-5 w-5" />Continue with Google</Button>
          <Button variant="outline" className={oauthButton} disabled={busy} onClick={() => withTerms(() => void oauth('apple'))}><AppleMark className="h-5 w-5" />Continue with Apple</Button>
          <Button variant="outline" className={oauthButton} disabled={busy} onClick={() => withTerms(() => void oauth('microsoft'))}><MicrosoftMark className="h-5 w-5" />Continue with Microsoft</Button>
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={mode === 'signin' ? signIn : e => { e.preventDefault(); withTerms(() => void signUp()); }} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="solo-email" className={authLabelClasses}>Email</Label><Input id="solo-email" type="email" required autoComplete="email" className={authInputClasses} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="solo-password" className={authLabelClasses}>Password</Label>
              {mode === 'signin' && <button type="button" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground" onClick={() => to('forgot')}>Forgot password?</button>}
            </div>
            <PasswordInput id="solo-password" value={password} onChange={setPassword} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            {mode === 'signup' && <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>}
          </div>
          {mode === 'signin'
            ? <>
                <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || !addr || !password}>Sign in</Button>
                <Button type="button" variant="outline" className={oauthButton} disabled={busy} onClick={() => void sendSignInCode()}>Email me a sign-in code instead</Button>
              </>
            : <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || !addr || password.length < MIN_PASSWORD}>Create account</Button>}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin'
              ? <>New here? <button type="button" className={link} onClick={() => to('signup')}>Create an account</button></>
              : <>Already have an account? <button type="button" className={link} onClick={() => to('signin')}>Sign in</button></>}
          </p>
        </form>
      </>}
      {info && <p role="status" className="text-sm text-muted-foreground">{info}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialog open={!!pending} onOpenChange={o => { if (!o) setPending(null); }}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Before you continue</AlertDialogTitle>
            <AlertDialogDescription>
              By creating an account, you agree to our <a className="underline underline-offset-4 hover:text-foreground" href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a className="underline underline-offset-4 hover:text-foreground" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={agree}>Agree and continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SoloShell>
  );
}

/** After a reset link: the link signs them in, then this sets the new password before the app opens. */
export function SoloSetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(friendly(err.message)); else onDone();
  };
  return (
    <SoloShell>
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Solo practice</p>
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">Set a new password</h1>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="solo-new-password" className={authLabelClasses}>New password</Label>
          <PasswordInput id="solo-new-password" value={password} onChange={setPassword} autoComplete="new-password" />
          <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        </div>
        <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || password.length < MIN_PASSWORD}>Save password</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SoloShell>
  );
}
