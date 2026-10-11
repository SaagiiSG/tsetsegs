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
      <AuthGlassCard className="p-6 sm:p-8">
        <div className="space-y-1 pb-5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.06]"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Request sent</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-white">Хүсэлт админд илгээгдлээ ({phone})</p>
              <p className="text-white/50">
                Админ таны нэвтрэх эрхийг цоожгүй болгосны дараа та дугаараа оруулаад шинэ нууц үг
                тохируулна.
              </p>
            </div>
          </div>
          <Button className={cn(authPrimaryButtonClasses, "h-12 text-base")} onClick={onBack}>
            Back to sign in
          </Button>
        </div>
      </AuthGlassCard>
    );
  }

  return (
    <AuthGlassCard className="p-6 sm:p-8">
      <div className="space-y-1 pb-5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/[0.06]"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Reset Password</h2>
        </div>
        <p className="text-sm text-white/50 pl-10">
          Админд нууц үг сэргээх хүсэлт илгээнэ
        </p>
      </div>
      <form onSubmit={handleRequest} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-phone" className={authLabelClasses}>Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
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
        <div className="flex items-start gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-xs text-white/50">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Хүсэлтийг админ баталгаажуулсны дараа та дугаараа оруулаад шинэ нууц үг тохируулах
            боломжтой болно.
          </span>
        </div>
        <Button
          type="submit"
          className={cn(authPrimaryButtonClasses, "h-12 text-base")}
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
