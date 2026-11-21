import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { authInputClasses, authLabelClasses, authPrimaryButtonClasses } from '@/components/auth/AuthSplitLayout';
import { supabase } from '@/integrations/supabase/client';
import { partnerLink } from '../../supabase/functions/_shared/partner-rules';
import PartnerShell from './PartnerShell';
import PartnerRules from './PartnerRules';
import { inviteRow, totals, type Invite } from './status';

// Must match the email code length in the Supabase auth settings, same as solo.
const CODE_LENGTH = 8;
type Dash = { name: string; code: string; paused: boolean; invites: Invite[] };
// partner_dashboard is new and not in the generated types yet.
type Rpc = { rpc: (fn: string) => PromiseLike<{ data: Dash | null; error: { message?: string } | null }> };

const friendly = (m?: string) =>
  /signups not allowed/i.test(m ?? '') ? "That email isn't a partner yet. Apply first."
  : /token has expired or is invalid/i.test(m ?? '') ? 'That code is wrong or has expired. Send a new one.'
  : m || 'Something went wrong. Try again.';
const usd = (cents: number) => `$${cents / 100}`;

function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addr = email.trim();

  const run = async (fn: () => Promise<{ error: { message?: string } | null }>) => {
    setBusy(true); setError(null);
    try { const { error: e } = await fn(); if (e) setError(friendly(e.message)); else return true; }
    catch (e) { setError(friendly((e as Error)?.message)); }
    finally { setBusy(false); }
    return false;
  };
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (await run(() => supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: false } }))) setSent(true);
  };
  const verify = async (token: string) => { if (!(await run(() => supabase.auth.verifyOtp({ email: addr, token, type: 'email' })))) setCode(''); };

  return (
    <PartnerShell>
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Partners</p>
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">{sent ? 'Check your email' : 'Partner sign-in'}</h1>
      </div>
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm">We sent a code to {addr}. Enter it here.</p>
          <InputOTP maxLength={CODE_LENGTH} value={code} disabled={busy} onChange={v => { setCode(v); if (v.length === CODE_LENGTH) void verify(v); }} aria-label={`${CODE_LENGTH}-digit code`}>
            {/* w-9 below sm so 8 boxes fit a 360px phone. */}
            <InputOTPGroup>{Array.from({ length: CODE_LENGTH }, (_, i) => <InputOTPSlot key={i} index={i} className="w-9 sm:w-10" />)}</InputOTPGroup>
          </InputOTP>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">No email? <button type="button" className="font-medium text-foreground underline underline-offset-4" disabled={busy} onClick={() => void send()}>Send a new code</button></p>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="partner-email" className={authLabelClasses}>Email</Label>
            <Input id="partner-email" type="email" required autoComplete="email" className={authInputClasses} value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className={authPrimaryButtonClasses} disabled={busy || !addr}>Email me a code</Button>
          <p className="text-sm text-muted-foreground">Not a partner yet? <a href="/partner" className="font-medium text-foreground underline underline-offset-4">Apply</a></p>
        </form>
      )}
    </PartnerShell>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = () => navigator.clipboard.writeText(value).then(() => toast.success('Copied'), () => toast.error("Couldn't copy. Select it and copy by hand."));
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate font-medium">{value}</p></div>
      <Button variant="outline" size="sm" onClick={() => void copy()} aria-label={`Copy ${label.toLowerCase()}`}>Copy</Button>
    </div>
  );
}

function Signed({ d }: { d: Dash }) {
  const t = totals(d.invites);
  const counts: [string, string][] = [
    ['Signed up', String(t.signedUp)], ['In trial', String(t.inTrial)], ['Paid yearly', String(t.paidYearly)],
    ['On its way', usd(t.onItsWayCents)], ['Paid to you', usd(t.paidCents)],
  ];
  return (
    <PartnerShell wide>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Partner</p>
          <h1 className="text-3xl font-semibold tracking-tight">{d.name}</h1>
        </div>
        {d.paused && <Badge variant="secondary">Paused</Badge>}
      </div>
      <Card><CardContent className="space-y-4 pt-6">
        <CopyRow label="Your link" value={partnerLink(d.code)} />
        <CopyRow label="Your code" value={d.code} />
      </CardContent></Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(([label, n]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-2xl font-semibold">{n}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>
        ))}
      </div>
      <PartnerRules />
      <section className="space-y-3" aria-labelledby="invites-h">
        <h2 id="invites-h" className="text-lg font-semibold">Your invites</h2>
        {d.invites.length === 0 ? <p className="text-sm text-muted-foreground">No sign-ups yet. Share your link to get started.</p> : (
          <ul className="space-y-2">
            {d.invites.map((i, n) => { const r = inviteRow(i); return (
              <li key={n}><Card><CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4 text-sm">
                <span className="w-14 font-medium">{r.date}</span>
                <span className="min-w-0 flex-1">{r.status}</span>
                <span className="text-muted-foreground">{r.payout}</span>
              </CardContent></Card></li>
            ); })}
          </ul>
        )}
      </section>
      <div className="text-center"><Button variant="link" size="sm" onClick={() => void supabase.auth.signOut()}>Sign out</Button></div>
    </PartnerShell>
  );
}

export default function PartnerDashboard() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [dash, setDash] = useState<Dash | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id;
  const [tries, setTries] = useState(0); // Retry bumps this to run the load again
  useEffect(() => {
    if (!uid) { setDash(undefined); setError(null); return; }
    let live = true;
    (supabase as unknown as Rpc).rpc('partner_dashboard').then(({ data, error: e }) => {
      if (!live) return;
      if (e) setError(e.message || 'Something went wrong. Try again.'); else { setError(null); setDash(data); }
    });
    return () => { live = false; };
  }, [uid, tries]);

  if (session === undefined) return <PartnerShell><p className="text-sm text-muted-foreground" role="status">Loading…</p></PartnerShell>;
  if (!session) return <SignIn />;
  if (error) return (
    <PartnerShell>
      <p role="alert" className="text-sm text-destructive">{error}</p>
      <div className="flex gap-3">
        <Button onClick={() => { setError(null); setTries(n => n + 1); }}>Retry</Button>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>Sign out</Button>
      </div>
    </PartnerShell>
  );
  if (dash === undefined) return <PartnerShell><p className="text-sm text-muted-foreground" role="status">Loading…</p></PartnerShell>;
  if (dash === null) return (
    <PartnerShell>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">This account isn't a partner</h1>
        <p className="text-sm text-muted-foreground">Sign out and try the email you applied with, or <a href="/partner" className="underline underline-offset-4">apply</a>.</p>
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>Sign out</Button>
      </div>
    </PartnerShell>
  );
  return <Signed d={dash} />;
}
