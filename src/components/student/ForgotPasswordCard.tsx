import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { useEffect, useState } from 'react';
import { lovable } from '@/integrations/lovable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleMark } from '@/components/auth/BrandIcons';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  AuthGlassCard,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
} from '@/components/auth/AuthSplitLayout';

interface Props {
  initialPhone?: string;
  onBack: () => void;
  onSuccess?: (phone: string) => void;
}

type Step = 'request' | 'sent' | 'newpass';

export function ForgotPasswordCard({ initialPhone = '', onBack, onSuccess }: Props) {
  const { text } = usePublicLanguage();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [newPass, setNewPass] = useState('');
  // Returning from Google: the connected account proves ownership, so the student can set a new password.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('google_reset') !== '1') return;
    const saved = sessionStorage.getItem('google_reset_phone') ?? '';
    supabase.auth.getSession().then(({ data }) => { if (data.session && saved) { setPhone(saved); setStep('newpass'); } });
  }, []);
  const startGoogle = async () => {
    if (phone.length !== 8) return;
    sessionStorage.setItem('google_reset_phone', phone);
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/practice?google_reset=1` });
    if (r.error) { toast({ title: text('Google-ээр нэвтэрч чадсангүй', 'Google sign-in failed'), variant: 'destructive' }); return; }
    if (r.redirected) return;
    setStep('newpass');
  };
  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.functions.invoke('google-reset-password', { body: { phone_number: phone, password: newPass } });
    setLoading(false);
    await supabase.auth.signOut().catch(() => undefined);
    sessionStorage.removeItem('google_reset_phone');
    window.history.replaceState(null, '', window.location.pathname);
    const msg = (data as any)?.error;
    if (error || msg) { toast({ title: text('Сэргээж чадсангүй', 'Could not reset'), description: msg || text('Энэ Google бүртгэл тухайн дугаартай холбогдоогүй байна.', 'This Google account is not connected to that phone number.'), variant: 'destructive' }); setStep('request'); return; }
    onSuccess?.(phone);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 8) {
      toast({ title: text('Утасны дугаар буруу', 'Invalid phone'), description: text('8 оронтой утасны дугаар шаардлагатай', '8-digit phone required'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('request-password-reset', {
      body: { phone_number: phone },
    });
    setLoading(false);
    if (error || (data && (data as any).error)) {
      toast({
        title: text('Хүсэлт илгээж чадсангүй', 'Could not send request'),
        description: (data as any)?.error || error?.message || text('Дараа дахин оролдоно уу', 'Try again later'),
        variant: 'destructive',
      });
      return;
    }
    setStep('sent');
  };

  if (step === 'newpass') {
    return (
      <AuthGlassCard>
        <div className="space-y-3 pb-8"><h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Шинэ нууц үг', 'New password')}</h2><p className="text-sm text-muted-foreground">{text(`Google-ээр баталгаажлаа (${phone})`, `Verified with Google (${phone})`)}</p></div>
        <form onSubmit={submitNew} className="space-y-6">
          <div className="space-y-2"><Label htmlFor="new-pass" className={authLabelClasses}>{text('Шинэ нууц үг', 'New password')}</Label><Input id="new-pass" type="password" minLength={8} maxLength={72} value={newPass} onChange={e => setNewPass(e.target.value)} className={authInputClasses} /></div>
          <Button type="submit" className={authPrimaryButtonClasses} disabled={loading || newPass.length < 8}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{text('Нууц үг солих', 'Set new password')}</Button>
        </form>
      </AuthGlassCard>
    );
  }

  if (step === 'sent') {
    return (
      <AuthGlassCard>
        <div className="space-y-3 pb-8">
          <div className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-[hsl(var(--lv-green-ink))]" />
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Хүсэлт илгээгдлээ', 'Request sent')}</h2>
          <p className="text-sm text-muted-foreground">
            {text(`Хүсэлт админд илгээгдлээ (${phone})`, `Your request was sent to an admin (${phone})`)}
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground border-b border-border pb-4">
            {text('Админ зөвшөөрсний дараа дугаараа оруулж шинэ нууц үг тохируулна.', 'After an admin approves the reset, enter your phone number and set a new password.')}
          </p>
          <Button className={authPrimaryButtonClasses} onClick={onBack}>
            {text('Нэвтрэх хуудас руу буцах', 'Back to sign in')}
          </Button>
        </div>
      </AuthGlassCard>
    );
  }

  return (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <Button variant="ghost"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {text('Буцах', 'Back')}
        </Button>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Нууц үг сэргээх', 'Reset Password')}</h2>
        <p className="text-sm text-muted-foreground">
          {text('Админд нууц үг сэргээх хүсэлт илгээнэ', 'Send a password reset request to an admin')}
        </p>
      </div>
      <form onSubmit={handleRequest} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="reset-phone" className={authLabelClasses}>{text('Утасны дугаар', 'Phone Number')}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-phone"
              type="tel"
              placeholder="99112233"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className={cn(authInputClasses, "pl-10 text-lg tracking-wider")}
              maxLength={8}
            />
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {text('Админ баталгаажуулсны дараа шинэ нууц үг тохируулах боломжтой.', 'An admin must approve your request before you can set a new password.')}
          </span>
        </div>
        <Button
          type="submit"
          className={authPrimaryButtonClasses}
          disabled={loading || phone.length !== 8}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {text('Илгээж байна...', 'Sending...')}
            </>
          ) : (
            text('Нууц үг сэргээх хүсэлт илгээх', 'Request password reset')
          )}
        </Button>
        <Button type="button" variant="outline" className="w-full h-11 rounded-full gap-2.5" disabled={phone.length !== 8} onClick={() => void startGoogle()}>
          <GoogleMark />
          {text('Холбосон Google-ээрээ сэргээх', 'Reset with my connected Google')}
        </Button>
      </form>
    </AuthGlassCard>
  );
}
