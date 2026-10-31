import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { startGoogle } from './centerGoogle';
import { centerAccounts, localDate } from './centerApi';
import { useCenter } from './centerContext';
import { daysLeft, gateState } from './googleGate';

const LATER = 'center-google-later';
const readLater = () => { try { return sessionStorage.getItem(LATER) === '1'; } catch { return false; } };

type Row = { google_email: string | null; email_verified_at: string | null; google_due_on: string } | null;

// Students with neither a connected Google account nor a verified email see this before the portal.
export default function CenterGoogleGate({ children }: { children: ReactNode }) {
  const { center, userId, signOut } = useCenter();
  const [row, setRow] = useState<Row | undefined>(undefined);
  const [later, setLater] = useState(readLater);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'ask' | 'email' | 'code'>('ask');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('tenant_students' as any).select('google_email, email_verified_at, google_due_on').eq('institution_id', center.id).eq('user_id', userId).maybeSingle()
      // A failed read (columns not there yet) must never block a student.
      .then(({ data, error }) => { if (!cancelled) setRow(error ? null : (data as unknown as Row) ?? null); });
    return () => { cancelled = true; };
  }, [center.id, userId]);

  if (row === undefined) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  const today = localDate();
  const state = gateState(row, today, later);
  if (state === 'off' || verified) return <>{children}</>;

  const connect = async () => {
    setBusy(true);
    const { data: token, error } = await supabase.rpc('tenant_google_link_start' as any, { _institution: center.id });
    const msg = error ? error.message : await startGoogle({ kind: 'link', token: token as string }, '/student');
    if (msg) { toast.error(msg); setBusy(false); }
  };
  const n = daysLeft(row!.google_due_on, today);
  const go = (to: typeof step) => { setStep(to); setError(''); setNote(''); };
  // Runs one email call; errors show under the field and busy always resets.
  const run = async (action: string, extra: Record<string, unknown>, done: () => void) => {
    setBusy(true); setError(''); setNote('');
    try { await centerAccounts({ action, institution_id: center.id, email: email.trim(), ...extra }); done(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const send = (again = false) => run('student_email_code', {}, () => { setCode(''); if (again) setNote('We sent a new code.'); else go('code'); });
  const verify = () => run('student_email_verify', { email_code: code }, () => setVerified(true));

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <h1 className="font-chillax text-2xl font-semibold">Connect your Google account</h1>
          {step === 'ask' && <>
            <p className="text-sm text-muted-foreground">
              {state === 'required' ? 'Your center needs this before you go on. ' : ''}
              Can you sign in with a Google account?
            </p>
            <div className="space-y-2">
              <Button className="w-full" disabled={busy} onClick={connect}>Yes, connect Google</Button>
              <Button variant="outline" className="w-full" disabled={busy} onClick={() => go('email')}>No, use my email</Button>
              {state === 'ask'
                ? <Button variant="ghost" className="w-full" onClick={() => { try { sessionStorage.setItem(LATER, '1'); } catch { /* storage blocked: Later lasts until reload */ } setLater(true); }}>Later ({n} {n === 1 ? 'day' : 'days'} left)</Button>
                : <Button variant="ghost" className="w-full" onClick={signOut}>Sign out</Button>}
            </div>
          </>}
          {step === 'email' && <>
            <p className="text-sm text-muted-foreground">Type your email. We will send you a 6-digit code.</p>
            <div className="space-y-2 text-left">
              <Input type="email" autoFocus aria-label="Email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="space-y-2">
              <Button className="w-full" disabled={busy || !email.trim()} onClick={() => send()}>Send code</Button>
              <Button variant="ghost" className="w-full" disabled={busy} onClick={() => go('ask')}>Back</Button>
              {state === 'required' && <Button variant="ghost" className="w-full" onClick={signOut}>Sign out</Button>}
            </div>
          </>}
          {step === 'code' && <>
            <p className="text-sm text-muted-foreground">We sent a 6-digit code to {email.trim()}.</p>
            <div className="space-y-2">
              <div className="flex justify-center">
                <InputOTP autoFocus maxLength={6} inputMode="numeric" aria-label="6-digit code" value={code} onChange={v => setCode(v.replace(/\D/g, ''))}>
                  <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {note && <p className="text-sm text-muted-foreground">{note}</p>}
            </div>
            <div className="space-y-2">
              <Button className="w-full" disabled={busy || code.length < 6} onClick={verify}>Verify</Button>
              <Button variant="outline" className="w-full" disabled={busy} onClick={() => send(true)}>Send a new code</Button>
              <Button variant="ghost" className="w-full" disabled={busy} onClick={() => go('email')}>Back</Button>
              {state === 'required' && <Button variant="ghost" className="w-full" onClick={signOut}>Sign out</Button>}
            </div>
          </>}
        </CardContent>
      </Card>
    </main>
  );
}
