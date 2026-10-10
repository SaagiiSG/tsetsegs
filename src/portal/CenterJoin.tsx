import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { centerAccounts } from './centerApi';

/** Public class sign-up page reached from a class join link / QR code. */
export default function CenterJoin() {
  const { code = '' } = useParams();
  const { center } = useCenter();
  const [cls, setCls] = useState<{ class_id: string; class_name: string } | null | undefined>(undefined);
  const [form, setForm] = useState({ name: '', phone: '', email: '', school: '', grade: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.rpc('tenant_join_lookup', { _slug: center.slug, _code: code }).then(({ data }) => setCls(data?.[0] ?? null));
  }, [center.slug, code]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await centerAccounts({ action: 'register', slug: center.slug, code, ...form }); setDone(true); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-muted/30">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center flex flex-col items-center gap-1">
          <CenterLogo center={center} className="h-12 w-12 mb-2" />
          <h1 className="font-chillax text-2xl font-semibold tracking-tight">{centerDisplayName(center)}</h1>
          {cls && <p className="text-sm text-muted-foreground">Sign up for <span className="text-foreground font-medium">{cls.class_name}</span></p>}
        </div>
        <div className="rounded-lg border bg-card p-5">
          {cls === undefined ? <p className="text-sm text-muted-foreground">Loading…</p>
            : cls === null ? <p className="text-sm">This sign-up link isn't valid. Ask your center for a new one.</p>
            : done ? (
              <div className="space-y-3 text-center" role="status">
                <CheckCircle2 className="h-8 w-8 mx-auto text-status-healthy" />
                <p className="font-medium">You're on the list</p>
                <p className="text-sm text-muted-foreground">Your center will review your sign-up. Once approved, sign in with this phone number and create your password.</p>
                <Button asChild variant="outline" className="w-full"><Link to="/">Go to sign in</Link></Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="j-name">Full name</Label><Input id="j-name" autoComplete="name" value={form.name} onChange={set('name')} required /></div>
                <div className="space-y-2"><Label htmlFor="j-phone">Phone number</Label><Input id="j-phone" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} required /></div>
                <div className="space-y-2"><Label htmlFor="j-email">Email (optional)</Label><Input id="j-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} /></div>
                <div className="grid grid-cols-[1fr_6rem] gap-3">
                  <div className="space-y-2"><Label htmlFor="j-school">School</Label><Input id="j-school" value={form.school} onChange={set('school')} /></div>
                  <div className="space-y-2"><Label htmlFor="j-grade">Grade</Label><Input id="j-grade" value={form.grade} onChange={set('grade')} /></div>
                </div>
                <Button className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Sign up'}</Button>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </form>
            )}
        </div>
      </div>
    </main>
  );
}
