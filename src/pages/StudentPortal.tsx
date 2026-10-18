import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Phone, BookOpen, GraduationCap, Loader2, Lock, ArrowLeft, Eye, EyeOff, CheckCircle2, User, Clock } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { getPostLoginRoute } from '@/lib/courseRouting';
import { cn } from '@/lib/utils';
import { ForgotPasswordCard } from '@/components/student/ForgotPasswordCard';
import { digitsOnly, sanitizePhoneInput } from '@/lib/phone';
import AuthSplitLayout, {
  AuthGlassCard,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
  authGhostButtonClasses,
} from '@/components/auth/AuthSplitLayout';


// Password validation rules
const PASSWORD_RULES = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/
};

const validatePassword = (password: string) => {
  return {
    minLength: password.length >= PASSWORD_RULES.minLength,
    hasUppercase: PASSWORD_RULES.hasUppercase.test(password),
    hasLowercase: PASSWORD_RULES.hasLowercase.test(password),
    hasNumber: PASSWORD_RULES.hasNumber.test(password),
    hasSpecial: PASSWORD_RULES.hasSpecial.test(password)
  };
};

const isPasswordValid = (password: string) => {
  const validation = validatePassword(password);
  return Object.values(validation).every(Boolean);
};

export default function StudentPortal() {
  const { text } = usePublicLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const { toast } = useToast();
  const { 
    student, 
    isLoading: authLoading, 
    authStep, 
    pendingPhone,
    checkPhone, 
    submitRegistrationRequest,
    loginWithPassword, 
    setPassword: setPasswordAuth,
    resetAuthFlow 
  } = useStudentAuth();

  // Redirect if already logged in — course-aware
  if (student) {
    return <Navigate to={getPostLoginRoute(student.linked_students)} replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (digitsOnly(phoneNumber).length < 8) {
      toast({
        title: text('Утасны дугаар буруу', 'Invalid phone number'),
        description: text('Утасны дугаараа бүтнээр оруулна уу', 'Please enter your full phone number'),
        variant: 'destructive'
      });
      return;
    }

    if (!password) {
      toast({
        title: text('Нууц үг шаардлагатай', 'Password required'),
        description: text('Нууц үгээ оруулна уу', 'Please enter your password'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const result = await checkPhone(phoneNumber);

    if (result.error) {
      toast({
        title: text('Алдаа', 'Error'),
        description: result.error,
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    // First-time / unregistered / pending flows move to their own steps.
    if (result.needsSetup || result.needsRegistration || result.pendingApproval) {
      setPassword('');
      setIsLoading(false);
      return;
    }

    const { error } = await loginWithPassword(password, result.account);

    if (error) {
      toast({
        title: text('Нэвтрэхэд алдаа гарлаа', 'Login failed'),
        description: error,
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid(password)) {
      toast({
        title: text('Нууц үг буруу', 'Invalid password'),
        description: text('Нууц үг бүх шаардлагыг хангасан байх ёстой', 'Password must meet all requirements'),
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: text('Нууц үг таарахгүй байна', 'Passwords do not match'),
        description: text('Хоёр нууц үг ижил байх ёстой', 'Please make sure both passwords are the same'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await setPasswordAuth(password);
    
    if (error) {
      toast({
        title: text('Нууц үг тохируулж чадсангүй', 'Failed to set password'),
        description: error,
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  const handleRegistrationRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast({
        title: text('Нэр буруу', 'Invalid name'),
        description: text('Бүтэн нэрээ оруулна уу', 'Please enter your full name'),
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const { error } = await submitRegistrationRequest(fullName);

    if (error) {
      toast({
        title: text('Алдаа', 'Error'),
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: text('Хүсэлт илгээгдлээ!', 'Request submitted!'),
        description: text('Багш удахгүй таны хүсэлтийг шалгана.', 'Your teacher will review your request shortly.')
      });
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    resetAuthFlow();
  };

  const passwordValidation = validatePassword(password);

  const renderLoginStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Сурагч нэвтрэх', 'Student Login')}</h2>
        <p className="text-sm text-muted-foreground">
          {text('Утасны дугаар, нууц үгээ оруулж нэвтэрнэ үү', 'Enter your phone number and password to access practice questions')}
        </p>
      </div>
      <form onSubmit={handleLogin} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="phone" className={authLabelClasses}>{text('Утасны дугаар', 'Phone Number')}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="99112233"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhoneInput(e.target.value))}
              className={cn(authInputClasses, "pl-10 text-lg tracking-wider")}
              maxLength={20}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {text('Ангидаа бүртгүүлсэн утасны дугаараа ашиглана уу.', 'Use the phone number registered with your class.')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClasses}>{text('Нууц үг', 'Password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={text('Нууц үгээ оруулна уу', 'Enter your password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authInputClasses, "pl-10 pr-10")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className={authPrimaryButtonClasses}
            disabled={isLoading || digitsOnly(phoneNumber).length < 8 || !password}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {text('Нэвтэрч байна...', 'Signing in...')}
              </>
            ) : (
              text('Нэвтрэх', 'Sign In')
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={authGhostButtonClasses}
            onClick={() => setForgotPassword(true)}
          >
            {text('Нууц үгээ мартсан уу?', 'Forgot password?')}
          </Button>
        </div>
      </form>
    </AuthGlassCard>
  );

  const renderRegistrationRequestStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <Button variant="ghost"
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {text('Буцах', 'Back')}
        </Button>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Эрх хүсэх', 'Request Access')}</h2>
        <p className="text-sm text-muted-foreground">
          {text(`Энэ дугаар (${pendingPhone}) бүртгэлгүй байна. Нэрээ илгээж багшийн зөвшөөрлийг хүлээнэ үү.`, `This phone number (${pendingPhone}) isn't registered yet. Submit your name for teacher approval.`)}
        </p>
      </div>
      <form onSubmit={handleRegistrationRequest} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={authLabelClasses}>{text('Бүтэн нэр', 'Full Name')}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder={text('Бүтэн нэрээ оруулна уу', 'Enter your full name')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn(authInputClasses, "pl-10")}
              maxLength={100}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {text('Багшийн тань мэдэх нэрийг ашиглана уу', 'Use the name your teacher knows you by')}
          </p>
        </div>

        <Button
          type="submit"
          className={authPrimaryButtonClasses}
          disabled={isLoading || fullName.trim().length < 2}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {text('Илгээж байна...', 'Submitting...')}
            </>
          ) : (
            text('Эрх хүсэх', 'Request Access')
          )}
        </Button>
      </form>
    </AuthGlassCard>
  );

  const renderPendingApprovalStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <div className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center">
          <Clock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Баталгаажуулалт хүлээж байна', 'Pending Approval')}</h2>
        <p className="text-sm text-muted-foreground">
          {text('Таны хүсэлт илгээгдлээ. Багш удахгүй шалгана.', 'Your registration request has been submitted. Your teacher will review it shortly.')}
        </p>
      </div>
      <div className="space-y-6">
        <div className="border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">{text('Утас:', 'Phone:')} <span className="font-mono font-medium text-foreground">{pendingPhone}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{text('Баталгаажуулсны дараа нэвтрэх боломжтой', "You'll be able to log in once approved")}</p>
        </div>
        <Button
          variant="ghost"
          className={authGhostButtonClasses}
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {text('Нэвтрэх хуудас руу буцах', 'Back to Login')}
        </Button>
      </div>
    </AuthGlassCard>
  );

  const renderSetPasswordStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <Button variant="ghost"
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {text('Буцах', 'Back')}
        </Button>
        <h2 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">{text('Нууц үгээ тохируулах', 'Set Your Password')}</h2>
        <p className="text-sm text-muted-foreground">
          {text(`Бүртгэлдээ нууц үг үүсгэнэ үү (${pendingPhone})`, `Create a password for your account (${pendingPhone})`)}
        </p>
      </div>
      <form onSubmit={handleSetPassword} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-password" className={authLabelClasses}>{text('Нууц үг', 'Password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={text('Хүчтэй нууц үг үүсгэнэ үү', 'Create a strong password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authInputClasses, "pl-10 pr-10")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Password requirements */}
        <div className="space-y-1.5 text-xs">
          <p className="text-muted-foreground font-medium">{text('Нууц үг дараах шаардлагатай:', 'Password must have:')}</p>
          <div className="grid grid-cols-2 gap-1">
            <PasswordRule met={passwordValidation.minLength} text={text('8 ба түүнээс олон тэмдэгт', '8+ characters')} />
            <PasswordRule met={passwordValidation.hasUppercase} text={text('Том үсэг', 'Uppercase letter')} />
            <PasswordRule met={passwordValidation.hasLowercase} text={text('Жижиг үсэг', 'Lowercase letter')} />
            <PasswordRule met={passwordValidation.hasNumber} text={text('Тоо', 'Number')} />
            <PasswordRule met={passwordValidation.hasSpecial} text={text('Тусгай тэмдэгт', 'Special character')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className={authLabelClasses}>{text('Нууц үг давтах', 'Confirm Password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder={text('Нууц үгээ давтана уу', 'Confirm your password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(authInputClasses, "pl-10")}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">{text('Нууц үг таарахгүй байна', 'Passwords do not match')}</p>
          )}
        </div>

        <Button
          type="submit"
          className={authPrimaryButtonClasses}
          disabled={isLoading || !isPasswordValid(password) || password !== confirmPassword}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {text('Тохируулж байна...', 'Setting up...')}
            </>
            ) : (
              text('Бүртгэл үүсгэж дасгаллах', 'Create Account & Start Practicing')
            )}
          </Button>
        </form>
    </AuthGlassCard>
  );

  return (
    <AuthSplitLayout
      eyebrow="STUDENT PORTAL"
      headline={"Learn.\nBuild.\nGrow Together."}
      subline="Your practice, sprints, badges and score prediction — all in one place."
      features={[
        { icon: <BookOpen className="h-3.5 w-3.5" />, label: "2,600+ problems" },
        { icon: <GraduationCap className="h-3.5 w-3.5" />, label: "Video lessons" },
        { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Track progress" },
      ]}
    >
      <div className="w-full space-y-6">
        {/* Auth Step Cards */}
        {forgotPassword ? (
          <ForgotPasswordCard
            initialPhone={pendingPhone || phoneNumber}
            onBack={() => setForgotPassword(false)}
            onSuccess={() => {
              setForgotPassword(false);
              resetAuthFlow();
              setPassword('');
              toast({
                title: text('Нууц үг сэргээгдлээ', 'Password reset'),
                description: text('Шинэ нууц үгээрээ нэвтэрнэ үү.', 'Please log in with your new password.'),
              });
            }}
          />
        ) : (
          <>
            {(authStep === 'phone' || authStep === 'password') && renderLoginStep()}
            {authStep === 'set_password' && renderSetPasswordStep()}
            {authStep === 'request_registration' && renderRegistrationRequestStep()}
            {authStep === 'pending_approval' && renderPendingApprovalStep()}
          </>
        )}

        <div className="text-center space-y-1">
          <Link to="/student-register" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            {text('Шинээр бүртгүүлэх', 'Sign up')}
          </Link>
          <p className="text-xs text-muted-foreground">
            {text('Нэвтрэхэд асуудал гарвал багштайгаа холбогдоно уу.', 'Having trouble logging in? Contact your teacher.')}
          </p>
        </div>
      </div>
    </AuthSplitLayout>
  );
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 transition-colors",
      met ? "text-[hsl(var(--lv-green-ink))]" : "text-muted-foreground"
    )}>
      <CheckCircle2 className={cn(
        "h-3 w-3",
        met ? "text-[hsl(var(--lv-green-ink))]" : "text-muted-foreground"
      )} />
      <span>{text}</span>
    </div>
  );
}
