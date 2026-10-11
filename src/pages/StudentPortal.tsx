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
import BrandMark from '@/components/BrandMark';


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
        title: 'Invalid phone number',
        description: 'Please enter your full phone number',
        variant: 'destructive'
      });
      return;
    }

    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const result = await checkPhone(phoneNumber);

    if (result.error) {
      toast({
        title: 'Error',
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

    const { error } = await loginWithPassword(password);

    if (error) {
      toast({
        title: 'Login failed',
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
        title: 'Invalid password',
        description: 'Password must meet all requirements',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await setPasswordAuth(password);
    
    if (error) {
      toast({
        title: 'Failed to set password',
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
        title: 'Invalid name',
        description: 'Please enter your full name',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const { error } = await submitRegistrationRequest(fullName);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Request submitted!',
        description: 'Your teacher will review your request shortly.'
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
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">Student sign in</p>
        <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Student Login</h2>
        <p className="text-sm text-white/50">
          Enter your phone number and password to access practice questions
        </p>
      </div>
      <form onSubmit={handleLogin} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="phone" className={authLabelClasses}>Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="phone"
              type="tel"
              placeholder="99112233"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(sanitizePhoneInput(e.target.value))}
              className={cn(authInputClasses, "pl-7 text-lg tracking-wider")}
              maxLength={20}
            />
          </div>
          <p className="text-xs text-white/40">
            Use the phone number registered with your class.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={authLabelClasses}>Password</Label>
          <div className="relative">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authInputClasses, "pl-7 pr-10")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-white/50 hover:text-white hover:bg-transparent"
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={authGhostButtonClasses}
            onClick={() => setForgotPassword(true)}
          >
            Forgot password?
          </Button>
        </div>
      </form>
    </AuthGlassCard>
  );

  const renderRegistrationRequestStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Request Access</h2>
        <p className="text-sm text-white/50">
          This phone number ({pendingPhone}) isn't registered yet. Submit your name and your teacher will approve your access.
        </p>
      </div>
      <form onSubmit={handleRegistrationRequest} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="fullName" className={authLabelClasses}>Full Name</Label>
          <div className="relative">
            <User className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn(authInputClasses, "pl-7")}
              maxLength={100}
            />
          </div>
          <p className="text-xs text-white/40">
            Use the name your teacher knows you by
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
              Submitting...
            </>
          ) : (
            'Request Access'
          )}
        </Button>
      </form>
    </AuthGlassCard>
  );

  const renderPendingApprovalStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <div className="h-14 w-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Clock className="h-7 w-7 text-white/70" />
        </div>
        <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Pending Approval</h2>
        <p className="text-sm text-white/50">
          Your registration request has been submitted. Your teacher will review it shortly.
        </p>
      </div>
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <p className="text-sm text-white/50">Phone: <span className="font-mono font-medium text-white">{pendingPhone}</span></p>
          <p className="text-xs text-white/40 mt-1">You'll be able to log in once approved</p>
        </div>
        <Button
          variant="ghost"
          className={authGhostButtonClasses}
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>
      </div>
    </AuthGlassCard>
  );

  const renderSetPasswordStep = () => (
    <AuthGlassCard>
      <div className="space-y-3 pb-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="text-4xl font-semibold tracking-tight text-white leading-[1.1]">Set Your Password</h2>
        <p className="text-sm text-white/50">
          Create a password for your account ({pendingPhone})
        </p>
      </div>
      <form onSubmit={handleSetPassword} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-password" className={authLabelClasses}>Password</Label>
          <div className="relative">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authInputClasses, "pl-7 pr-10")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-white/50 hover:text-white hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Password requirements */}
        <div className="space-y-1.5 text-xs">
          <p className="text-white/50 font-medium">Password must have:</p>
          <div className="grid grid-cols-2 gap-1">
            <PasswordRule met={passwordValidation.minLength} text="8+ characters" />
            <PasswordRule met={passwordValidation.hasUppercase} text="Uppercase letter" />
            <PasswordRule met={passwordValidation.hasLowercase} text="Lowercase letter" />
            <PasswordRule met={passwordValidation.hasNumber} text="Number" />
            <PasswordRule met={passwordValidation.hasSpecial} text="Special character" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className={authLabelClasses}>Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(authInputClasses, "pl-7")}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-400">Passwords do not match</p>
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
              Setting up...
            </>
            ) : (
              'Create Account & Start Practicing'
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
                title: 'Password reset',
                description: 'Please log in with your new password.',
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

        {/* Features Preview - only show on phone step */}
        {authStep === 'phone' && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto">
                <BookOpen className="h-5 w-5 text-white/70" />
              </div>
              <p className="text-xs text-white/45">68 Questions</p>
            </div>
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </div>
              <p className="text-xs text-white/45">Video Lessons</p>
            </div>
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p className="text-xs text-white/45">Track Progress</p>
            </div>
          </div>
        )}

        <div className="text-center space-y-1">
          <Link to="/student-register" className="text-sm text-white/80 hover:text-white hover:underline">
            Шинээр бүртгүүлэх
          </Link>
          <p className="text-xs text-white/40">
            Having trouble logging in? Contact your teacher.
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
      met ? "text-emerald-400" : "text-white/40"
    )}>
      <CheckCircle2 className={cn(
        "h-3 w-3",
        met ? "text-emerald-400" : "text-white/25"
      )} />
      <span>{text}</span>
    </div>
  );
}
