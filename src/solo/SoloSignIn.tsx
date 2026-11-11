import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen grid place-items-center p-6">
    <div className="w-full max-w-sm space-y-5">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-md" />
        <span className="font-chillax text-xl font-semibold">flowersos</span>
      </div>
      {children}
    </div>
  </main>
);

export function SoloBlocked({ onHaveAccount }: { onHaveAccount: () => void }) {
  return (
    <Shell>
      <h1 className="font-chillax text-2xl font-semibold">Solo accounts are for students outside Mongolia</h1>
      <p className="text-sm text-muted-foreground">Solo бүртгэл зөвхөн Монголоос гадна байгаа сурагчдад зориулагдсан. Монголд flowersos нь Flowers-ийн SAT сургалттай хамт ирдэг.</p>
      <p className="text-sm text-muted-foreground">Solo accounts are for students outside Mongolia. In Mongolia, flowersos comes with the Flowers SAT course.</p>
      <Button asChild className="w-full"><a href="/?lang=mon">Flowers SAT course</a></Button>
      <Button variant="link" size="sm" className="px-0" onClick={onHaveAccount}>I already have a solo account</Button>
    </Shell>
  );
}

export default function SoloSignIn() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const origin = window.location.origin;

  const run = async (fn: () => Promise<{ error?: { message?: string } | null }>) => {
    setBusy(true); setError(null);
    try { const { error: e } = await fn(); if (e) setError(e.message ?? 'Something went wrong. Try again.'); else return true; }
    catch (e) { setError((e as Error)?.message || 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
    return false;
  };

  const google = () => run(() => lovable.auth.signInWithOAuth('google', { redirect_uri: origin + '/solo' }) as Promise<{ error?: { message?: string } | null }>);
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: origin + '/solo', data: { full_name: name.trim() } } }));
    if (ok) setSent(true);
  };
  const verify = (token: string) => run(() => supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' }));

  return (
    <Shell>
      <div className="space-y-1">
        <h1 className="font-chillax text-2xl font-semibold">Start practicing SAT</h1>
        <p className="text-sm text-muted-foreground">Free, no card needed. <a className="underline" href="/?lang=eng#pricing">See plans</a></p>
      </div>
      <Button variant="outline" className="w-full" disabled={busy} onClick={google}>Continue with Google</Button>
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm">We sent a 6-digit code to {email.trim()}. Enter it here, or tap the link in the email.</p>
          <InputOTP maxLength={6} value={code} disabled={busy} onChange={v => { setCode(v); if (v.length === 6) void verify(v); }} aria-label="6-digit code">
            <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
          </InputOTP>
        </div>
      ) : (
        <form onSubmit={sendCode} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="solo-name">Your name</Label><Input id="solo-name" required autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="solo-email">Email</Label><Input id="solo-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy || !name.trim()}>Email me a code</Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Shell>
  );
}
