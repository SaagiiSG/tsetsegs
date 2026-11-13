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
import { TermsCheck } from '@/components/auth/TermsCheck';
import { TERMS_VERSION } from '@/lib/terms';

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

export default function SoloSignIn() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const run = async (fn: () => Promise<{ error?: { message?: string } | null }>) => {
    setBusy(true); setError(null);
    try { const { error: e } = await fn(); if (e) setError(e.message ?? 'Something went wrong. Try again.'); else return true; }
    catch (e) { setError((e as Error)?.message || 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
    return false;
  };

  const oauth = (provider: 'google' | 'apple' | 'microsoft') =>
    run(() => lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + '/solo' }) as Promise<{ error?: { message?: string } | null }>);
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + '/solo', data: { full_name: name.trim(), terms_version: TERMS_VERSION } } }));
    if (ok) setSent(true);
  };
  const verify = async (token: string) => { if (!(await run(() => supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' })))) setCode(''); };

  return (
    <SoloShell>
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Solo practice</p>
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">Start practicing SAT</h1>
        <p className="text-sm text-muted-foreground">Free, no card needed. <a className="underline underline-offset-4 hover:text-foreground" href="/?lang=eng#pricing">See plans</a></p>
      </div>
      <div className="space-y-3">
        <TermsCheck checked={agreed} onChange={setAgreed} />
        <Button variant="outline" className={oauthButton} disabled={busy || !agreed} onClick={() => oauth('google')}><GoogleMark className="h-5 w-5" />Continue with Google</Button>
        <Button variant="outline" className={oauthButton} disabled={busy || !agreed} onClick={() => oauth('apple')}><AppleMark className="h-5 w-5" />Continue with Apple</Button>
        <Button variant="outline" className={oauthButton} disabled={busy || !agreed} onClick={() => oauth('microsoft')}><MicrosoftMark className="h-5 w-5" />Continue with Microsoft</Button>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm">We sent a 6-digit code to {email.trim()}. Enter it here, or tap the link in the email.</p>
          <InputOTP maxLength={6} value={code} disabled={busy} onChange={v => { setCode(v); if (v.length === 6) void verify(v); }} aria-label="6-digit code">
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
        </div>
      ) : (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="solo-name" className={authLabelClasses}>Your name</Label><Input id="solo-name" required autoComplete="name" className={authInputClasses} value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="solo-email" className={authLabelClasses}>Email</Label><Input id="solo-email" type="email" required autoComplete="email" className={authInputClasses} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || !agreed || !name.trim()}>Email me a code</Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SoloShell>
  );
}
