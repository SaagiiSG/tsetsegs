import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { phoneDigits } from '@/lib/tenant';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { PasswordInput } from './PasswordInput';

export default function CenterSignIn({ signedInWithoutAccess }: { signedInWithoutAccess: boolean }) {
  const { center, signOut } = useCenter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // student
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<'phone' | 'password' | 'create'>('phone');
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

  const lookup = run(async () => {
    const res = await call({ action: 'student_lookup', phone: phoneDigits(phone) });
    if (res.activated) { setStudentEmail(res.email); setStage('password'); } else setStage('create');
  });
  const studentSignIn = run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: studentEmail, password });
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
    <main className="min-h-screen grid place-items-center p-4 bg-muted/30">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1 flex flex-col items-center">
          <CenterLogo center={center} className="h-12 w-12 mb-2" />
          <h1 className="font-chillax text-3xl font-semibold tracking-tight">{centerDisplayName(center)}</h1>
          <p className="text-sm text-muted-foreground">SAT prep portal</p>
        </div>
        {signedInWithoutAccess ? (
          <div className="rounded-lg border bg-card p-5 space-y-3 text-sm">
            <p>This account doesn't have access to {centerDisplayName(center)}.</p>
            <Button variant="outline" className="w-full" onClick={signOut}>Use a different account</Button>
          </div>
        ) : (
          <Tabs defaultValue="student" onValueChange={() => setError('')} className="rounded-lg border bg-card p-5">
            <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="student">Student</TabsTrigger><TabsTrigger value="staff">Teacher / Admin</TabsTrigger></TabsList>
            <TabsContent value="student" className="mt-5">
              {stage === 'phone' && (
                <form onSubmit={lookup} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="cp-phone">Phone number</Label>
                    <Input id="cp-phone" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Use the phone number registered with your class" required /></div>
                  <Button className="w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</Button>
                </form>
              )}
              {stage === 'password' && (
                <form onSubmit={studentSignIn} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="cp-pw">Password</Label>
                    <PasswordInput id="cp-pw" autoComplete="current-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setStage('phone'); setPassword(''); }}>Use a different number</Button>
                </form>
              )}
              {stage === 'create' && (
                <form onSubmit={createPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">First time here — create a password (8+ characters, letters and numbers).</p>
                  <div className="space-y-2"><Label htmlFor="cp-new">New password</Label>
                    <PasswordInput id="cp-new" autoComplete="new-password" autoFocus value={password} onChange={e => setPassword(e.target.value)} required minLength={8} /></div>
                  <div className="space-y-2"><Label htmlFor="cp-confirm">Confirm password</Label>
                    <PasswordInput id="cp-confirm" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
                  <Button className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create password'}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setStage('phone')}>Back</Button>
                </form>
              )}
            </TabsContent>
            <TabsContent value="staff" className="mt-5">
              <form onSubmit={staffSignIn} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="cp-email">Email</Label>
                  <Input id="cp-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="cp-spw">Password</Label>
                  <PasswordInput id="cp-spw" autoComplete="current-password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required /></div>
                <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
              </form>
            </TabsContent>
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          </Tabs>
        )}
      </div>
    </main>
  );
}
