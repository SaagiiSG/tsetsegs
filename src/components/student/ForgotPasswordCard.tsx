import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Phone, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const PASSWORD_RULES = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

function validatePassword(p: string) {
  return {
    minLength: p.length >= PASSWORD_RULES.minLength,
    hasUppercase: PASSWORD_RULES.hasUppercase.test(p),
    hasLowercase: PASSWORD_RULES.hasLowercase.test(p),
    hasNumber: PASSWORD_RULES.hasNumber.test(p),
    hasSpecial: PASSWORD_RULES.hasSpecial.test(p),
  };
}

function isPasswordValid(p: string) {
  return Object.values(validatePassword(p)).every(Boolean);
}

interface Props {
  initialPhone?: string;
  onBack: () => void;
  onSuccess: (phone: string) => void;
}

type Step = 'request' | 'verify';

export function ForgotPasswordCard({ initialPhone = '', onBack, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
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
        title: 'Could not send code',
        description: (data as any)?.error || error?.message || 'Try again later',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Code sent', description: `An SMS code was sent to ${phone}` });
    setStep('verify');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ title: 'Invalid code', description: '6-digit code required', variant: 'destructive' });
      return;
    }
    if (!isPasswordValid(newPassword)) {
      toast({ title: 'Weak password', description: 'Password must meet all rules', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('verify-password-reset', {
      body: { phone_number: phone, code, new_password: newPassword },
    });
    setLoading(false);
    if (error || (data && (data as any).error)) {
      toast({
        title: 'Reset failed',
        description: (data as any)?.error || error?.message || 'Invalid or expired code',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Password reset', description: 'You can now sign in with your new password' });
    onSuccess(phone);
  };

  const pwd = validatePassword(newPassword);

  if (step === 'request') {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription className="pl-10">
            Бид таны утсанд 6 оронтой SMS код илгээнэ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-phone"
                  type="tel"
                  placeholder="99112233"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="pl-10 text-lg tracking-wider"
                  maxLength={8}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={loading || phone.length !== 8}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send SMS code'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep('request')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Enter code</CardTitle>
        </div>
        <CardDescription className="pl-10">
          Phone: {phone}. Кодын хүчинтэй хугацаа 10 минут.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-code">SMS Code</Label>
            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, ''))}
                id="reset-code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-new-pwd">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-new-pwd"
                type={showPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="text-muted-foreground font-medium">Password must have:</p>
            <div className="grid grid-cols-2 gap-1">
              <Rule met={pwd.minLength} text="8+ characters" />
              <Rule met={pwd.hasUppercase} text="Uppercase letter" />
              <Rule met={pwd.hasLowercase} text="Lowercase letter" />
              <Rule met={pwd.hasNumber} text="Number" />
              <Rule met={pwd.hasSpecial} text="Special character" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-pwd">Confirm Password</Label>
            <Input
              id="reset-confirm-pwd"
              type={showPwd ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={
              loading ||
              code.length !== 6 ||
              !isPasswordValid(newPassword) ||
              newPassword !== confirmPassword
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Rule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', met ? 'text-primary' : 'text-muted-foreground')}>
      <CheckCircle2 className={cn('h-3 w-3', met ? 'text-primary' : 'text-muted-foreground/50')} />
      <span>{text}</span>
    </div>
  );
}
