import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { centerAccounts } from './centerApi';
import { PasswordInput } from './PasswordInput';

/** Public class sign-up reached from a class join link / QR code. The code is the invitation, so students are enrolled instantly. */
export default function CenterJoin() {
  const { code = '' } = useParams();
  const { center } = useCenter();
  const navigate = useNavigate();
  const [cls, setCls] = useState<{ class_id: string; class_name: string } | null | undefined>(undefined);
  const [form, setForm] = useState({ name: '', phone: '', email: '', school: '', grade: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.rpc('tenant_join_lookup', { _slug: center.slug, _code: code }).then(({ data }) => setCls(data?.[0] ?? null));
  }, [center.slug, code]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await centerAccounts<{ email: string }>({ action: 'register', slug: center.slug, code, ...form });
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: res.email, password: form.password });
      if (sErr) throw new Error('Account created — sign in with your phone number and password.');
      navigate('/student', { replace: true });
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen grid place-items-center p-4 relative">
      <div aria-hidden className="admin-page-atmosphere" />
      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center flex flex-col items-center gap-1">
          <CenterLogo center={center} className="h-12 w-12 mb-2" />
          <h1 className="font-chillax text-2xl font-semibold tracking-tight">{centerDisplayName(center)}</h1>
          {cls && <p className="text-sm text-muted-foreground">Join <span className="text-foreground font-medium">{cls.class_name}</span></p>}
        </div>
        <div className="admin-glass-card rounded-xl border p-5">
          {cls === undefined ? <p className="text-sm text-muted-foreground">Loading…</p>
            : cls === null ? <p className="text-sm">This join link isn't valid. Ask your teacher for a new one.</p>
            : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="j-name">Full name</Label><Input id="j-name" autoComplete="name" value={form.name} onChange={set('name')} required /></div>
                <div className="space-y-2"><Label htmlFor="j-phone">Phone number</Label><Input id="j-phone" inputMode="tel" autoComplete="tel" placeholder="+1 555 123 4567" value={form.phone} onChange={set('phone')} required /></div>
                <div className="space-y-2"><Label htmlFor="j-email">Email (optional)</Label><Input id="j-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></div>
                <div className="grid grid-cols-[1fr_6rem] gap-3">
                  <div className="space-y-2"><Label htmlFor="j-school">School</Label><Input id="j-school" value={form.school} onChange={set('school')} /></div>
                  <div className="space-y-2"><Label htmlFor="j-grade">Grade</Label><Input id="j-grade" value={form.grade} onChange={set('grade')} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="j-pw">Create a password</Label>
                  <PasswordInput id="j-pw" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
                  <p className="text-xs text-muted-foreground">8+ characters with letters and numbers. You'll sign in with your phone number.</p></div>
                <Button className="w-full" disabled={busy}>{busy ? 'Joining…' : 'Join class'}</Button>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </form>
            )}
        </div>
      </div>
    </main>
  );
}
