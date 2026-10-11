import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { centerAccounts } from './centerApi';
import { PasswordInput } from './PasswordInput';
import {
  AuthSplitLayout,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
} from '@/components/auth/AuthSplitLayout';

/** Public class sign-up reached from a class join link / QR code. The code is the invitation, so students are enrolled instantly. */
export default function CenterJoin() {
  const { code = '' } = useParams();
  const { center } = useCenter();
  const name = centerDisplayName(center);
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
    <AuthSplitLayout
      eyebrow={name.toUpperCase()}
      headline={cls ? `Join\n${cls.class_name}.` : 'Join your\nclass.'}
      subline={`Create your ${name} account — it takes less than a minute.`}
      accent={center.portal_settings?.brand_color || undefined}
      features={[{ label: 'Instant enrollment' }, { label: 'SAT practice' }, { label: 'Live classes' }]}
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <CenterLogo center={center} className="h-12 w-12" />
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {cls ? <>Join <span className="text-white/60">{cls.class_name}</span></> : 'Create your account'}
          </h1>
          <p className="text-sm text-white/50">{name}</p>
        </div>

        {cls === undefined ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : cls === null ? (
          <p className="text-sm text-white/60">This join link isn't valid. Ask your teacher for a new one.</p>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="j-name" className={authLabelClasses}>Full name</Label>
              <Input id="j-name" autoComplete="name" value={form.name} onChange={set('name')} required className={authInputClasses} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="j-phone" className={authLabelClasses}>Phone number</Label>
              <Input id="j-phone" inputMode="tel" autoComplete="tel" placeholder="+1 555 123 4567" value={form.phone} onChange={set('phone')} required className={authInputClasses} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="j-email" className={authLabelClasses}>Email (optional)</Label>
              <Input id="j-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={authInputClasses} />
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-4">
              <div className="space-y-2">
                <Label htmlFor="j-school" className={authLabelClasses}>School</Label>
                <Input id="j-school" value={form.school} onChange={set('school')} className={authInputClasses} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="j-grade" className={authLabelClasses}>Grade</Label>
                <Input id="j-grade" value={form.grade} onChange={set('grade')} className={authInputClasses} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="j-pw" className={authLabelClasses}>Create a password</Label>
              <PasswordInput id="j-pw" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} className={authInputClasses} />
              <p className="text-xs text-white/35">8+ characters with letters and numbers. You'll sign in with your phone number.</p>
            </div>
            <Button className={authPrimaryButtonClasses} disabled={busy}>{busy ? 'Joining…' : 'Join class'}</Button>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
}
