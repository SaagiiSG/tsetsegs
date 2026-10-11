import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

type Step = 'request' | 'sent';

export function ForgotPasswordCard({ initialPhone = '', onBack }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 8) {
      toast({ title: 'Invalid phone', description: '8-digit phone required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('request-password-reset', {
      body: { phone_number: phone },
    });
    setLoading(false);
    if (error || (data && (data as any).error)) {
      toast({
        title: 'Could not send request',
        description: (data as any)?.error || error?.message || 'Try again later',
        variant: 'destructive',
      });
      return;
    }
    setStep('sent');
  };

  if (step === 'sent') {
    return (
      <AuthGlassCard>
        <div className="space-y-3 pb-8">
          <div className="h-14 w-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Request sent</h2>
          <p className="text-sm text-white/50">
            Хүсэлт админд илгээгдлээ ({phone})
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-sm text-white/50 border-b border-white/10 pb-4">
            Админ таны нэвтрэх эрхийг цоожгүй болгосны дараа та дугаараа оруулаад шинэ нууц үг
            тохируулна.
          </p>
          <Button className={authPrimaryButtonClasses} onClick={onBack}>
            Back to sign in
          </Button>
        </div>
      </AuthGlassCard>
    );
  }

  return (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Reset Password</h2>
        <p className="text-sm text-white/50">
          Админд нууц үг сэргээх хүсэлт илгээнэ
        </p>
      </div>
      <form onSubmit={handleRequest} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="reset-phone" className={authLabelClasses}>Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="reset-phone"
              type="tel"
              placeholder="99112233"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className={cn(authInputClasses, "pl-7 text-lg tracking-wider")}
              maxLength={8}
            />
          </div>
        </div>
        <div className="flex items-start gap-2 text-xs text-white/40">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Хүсэлтийг админ баталгаажуулсны дараа та дугаараа оруулаад шинэ нууц үг тохируулах
            боломжтой болно.
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
              Sending...
            </>
          ) : (
            'Request password reset'
          )}
        </Button>
      </form>
    </AuthGlassCard>
  );
}
