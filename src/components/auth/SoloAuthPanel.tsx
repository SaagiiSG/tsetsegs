import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppleMark, GoogleMark, MicrosoftMark } from '@/components/auth/BrandIcons';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { usePublicLanguage } from '@/hooks/usePublicLanguage';

type Provider = 'google' | 'apple' | 'microsoft';
const PROVIDERS: { id: Provider; label: string; Mark: React.ComponentType<{ className?: string }> }[] = [
  { id: 'google', label: 'Google', Mark: GoogleMark },
  { id: 'apple', label: 'Apple', Mark: AppleMark },
  { id: 'microsoft', label: 'Microsoft', Mark: MicrosoftMark },
];

/** Solo student sign-up / sign-in: Google, Apple, Microsoft or email. Lands on /solo after the session exists. */
export function SoloAuthPanel() {
  const { text, lang } = usePublicLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState<null | 'signup' | 'signin'>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [sent, setSent] = useState(false);

  const oauth = async (p: Provider) => {
    setError(null); setBusy(p);
    sessionStorage.setItem('solo_after_auth', '1');
    const result = await lovable.auth.signInWithOAuth(p, { redirect_uri: `${window.location.origin}/solo` });
    if (result.error) { setError(text('Нэвтэрч чадсангүй. Дахин оролдоно уу.', 'Sign-in failed. Please try again.')); setBusy(null); return; }
    if (result.redirected) return;
    window.location.assign(`/solo?lang=${lang}`);
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy('email');
    if (emailMode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/solo`, data: { full_name: name.trim() } } });
      setBusy(null);
      if (err) { setError(err.message); return; }
      if (data.session) window.location.assign(`/solo?lang=${lang}`); else setSent(true);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(null);
      if (err) { setError(text('Имэйл эсвэл нууц үг буруу.', 'Wrong email or password.')); return; }
      window.location.assign(`/solo?lang=${lang}`);
    }
  };

  if (sent) return <div role="status" className="rounded-2xl border p-4 text-sm"><p className="font-semibold">{text('Имэйлээ шалгана уу', 'Check your email')}</p><p className="text-muted-foreground mt-1">{text('Бүртгэлээ баталгаажуулах холбоос илгээлээ.', 'We sent a link to confirm your account.')}</p></div>;

  return (
    <div className="space-y-3">
      {PROVIDERS.map(({ id, label, Mark }) => (
        <Button key={id} type="button" variant="outline" className="w-full h-11 rounded-full gap-2.5" disabled={!!busy} onClick={() => void oauth(id)}>
          {busy === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mark />}
          {text(`${label}-ээр үргэлжлүүлэх`, `Continue with ${label}`)}
        </Button>
      ))}
      {!emailMode ? (
        <Button type="button" variant="ghost" className="w-full h-11 rounded-full" onClick={() => setEmailMode('signup')}><Mail className="h-4 w-4" />{text('Имэйлээр бүртгүүлэх', 'Sign up with email')}</Button>
      ) : (
        <form onSubmit={submitEmail} className="space-y-3 pt-1">
          {emailMode === 'signup' && <div className="space-y-1"><Label htmlFor="solo-name">{text('Нэр', 'Name')}</Label><Input id="solo-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} required /></div>}
          <div className="space-y-1"><Label htmlFor="solo-email">{text('Имэйл', 'Email')}</Label><Input id="solo-email" type="email" maxLength={255} value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="space-y-1"><Label htmlFor="solo-pass">{text('Нууц үг', 'Password')}</Label><Input id="solo-pass" type="password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full h-11 rounded-full" disabled={!!busy}>{busy === 'email' && <Loader2 className="h-4 w-4 animate-spin" />}{emailMode === 'signup' ? text('Бүртгүүлэх', 'Sign up') : text('Нэвтрэх', 'Sign in')}</Button>
          <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setEmailMode(emailMode === 'signup' ? 'signin' : 'signup')}>{emailMode === 'signup' ? text('Бүртгэлтэй юу? Нэвтрэх', 'Have an account? Sign in') : text('Шинэ бүртгэл үүсгэх', 'Create a new account')}</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
