import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Phone, BookOpen, GraduationCap, Loader2, Lock, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { 
    student, 
    isLoading: authLoading, 
    authStep, 
    pendingPhone,
    checkPhone, 
    loginWithPassword, 
    setPassword: setPasswordAuth,
    resetAuthFlow 
  } = useStudentAuth();

  // Redirect if already logged in
  if (student) {
    return <Navigate to="/practice/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phoneNumber.length !== 8) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter an 8-digit phone number',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    const { error } = await checkPhone(phoneNumber);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    }
    
    setIsLoading(false);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: 'Password required',
        description: 'Please enter your password',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
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

  const handleBack = () => {
    setPassword('');
    setConfirmPassword('');
    resetAuthFlow();
  };

  const passwordValidation = validatePassword(password);

  const renderPhoneStep = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Student Login</CardTitle>
        <CardDescription className="text-center">
          Enter your phone number to access practice questions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="99112233"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="pl-10 text-lg tracking-wider"
                maxLength={8}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the phone number registered with your class
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={isLoading || phoneNumber.length !== 8}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Enter Password</CardTitle>
        </div>
        <CardDescription className="pl-10">
          Phone: {pendingPhone}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
            disabled={isLoading || !password}
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
        </form>
      </CardContent>
    </Card>
  );

  const renderSetPasswordStep = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
        </div>
        <CardDescription className="pl-10">
          Create a password for your account ({pendingPhone})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Password requirements */}
          <div className="space-y-1.5 text-xs">
            <p className="text-muted-foreground font-medium">Password must have:</p>
            <div className="grid grid-cols-2 gap-1">
              <PasswordRule met={passwordValidation.minLength} text="8+ characters" />
              <PasswordRule met={passwordValidation.hasUppercase} text="Uppercase letter" />
              <PasswordRule met={passwordValidation.hasLowercase} text="Lowercase letter" />
              <PasswordRule met={passwordValidation.hasNumber} text="Number" />
              <PasswordRule met={passwordValidation.hasSpecial} text="Special character" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 text-lg"
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
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SAT Practice</h1>
          <p className="text-muted-foreground">Tsetsegs Talent Agency</p>
        </div>

        {/* Auth Step Cards */}
        {authStep === 'phone' && renderPhoneStep()}
        {authStep === 'password' && renderPasswordStep()}
        {authStep === 'set_password' && renderSetPasswordStep()}

        {/* Features Preview - only show on phone step */}
        {authStep === 'phone' && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">68 Questions</p>
            </div>
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">Video Lessons</p>
            </div>
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">Track Progress</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Having trouble logging in? Contact your teacher.
        </p>
      </div>
    </div>
  );
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 transition-colors",
      met ? "text-primary" : "text-muted-foreground"
    )}>
      <CheckCircle2 className={cn(
        "h-3 w-3",
        met ? "text-primary" : "text-muted-foreground/50"
      )} />
      <span>{text}</span>
    </div>
  );
}
