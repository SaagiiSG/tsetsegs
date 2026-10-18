import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, GraduationCap, BarChart3, Users, Sparkles } from "lucide-react";
import AuthSplitLayout, {
  AuthGlassCard,
  authInputClasses,
  authLabelClasses,
  authPrimaryButtonClasses,
  authGhostButtonClasses,
} from "@/components/auth/AuthSplitLayout";

export default function Login() {
  const { text } = usePublicLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Determine initial tab from query param
  const initialTab = searchParams.get("role") === "teacher" ? "teacher" : "admin";
  const [activeTab, setActiveTab] = useState<"admin" | "teacher">(initialTab);

  // Admin form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Teacher form state
  const [teacherUsername, setTeacherUsername] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Auth contexts
  const { signIn: adminSignIn, signUp: adminSignUp, user: adminUser, isAdmin, isLoading: authLoading } = useAuth();
  const { signIn: teacherSignIn, user: teacherUser, needsPasswordChange } = useTeacherAuth();

  // Track whether a fresh login just succeeded
  const [loginSucceeded, setLoginSucceeded] = useState(false);

  // If user is already logged in as admin, redirect immediately on page load
  useEffect(() => {
    if (!authLoading && adminUser && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, adminUser, isAdmin, navigate]);

  // Handle redirect after a NEW successful login (not stale session)
  useEffect(() => {
    if (!loginSucceeded || authLoading) return;

    if (adminUser && isAdmin) {
      toast({
        title: text('Тавтай морил!', 'Welcome back!'),
        description: text('Админаар амжилттай нэвтэрлээ.', "You've successfully logged in as admin."),
      });
      navigate("/admin");
      setLoginSucceeded(false);
    } else if (adminUser && !isAdmin) {
      setAdminLoading(false);
      toast({
        title: text('Эрх хүрэхгүй', 'Access Denied'),
        description: text('Танд админ эрх байхгүй.', "You don't have admin privileges."),
        variant: "destructive",
      });
      setLoginSucceeded(false);
    }
  }, [adminUser, isAdmin, authLoading, loginSucceeded, navigate, toast]);

  // Handle teacher auth redirects
  useEffect(() => {
    if (teacherUser && activeTab === "teacher") {
      if (needsPasswordChange) {
        navigate("/teacher/change-password");
      } else {
        navigate("/teacher/dashboard");
      }
    }
  }, [teacherUser, needsPasswordChange, navigate, activeTab]);

  // Admin form submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast({
        title: text('Алдаа', 'Error'),
        description: text('Бүх талбарыг бөглөнө үү', 'Please fill in all fields'),
        variant: "destructive",
      });
      return;
    }

    setAdminLoading(true);
    try {
      if (isSignUp) {
        const { error } = await adminSignUp(adminEmail, adminPassword);
        if (error) throw error;
        toast({
          title: text('Амжилттай', 'Success'),
          description: text('Бүртгэл үүслээ. Админы зөвшөөрлийг хүлээнэ үү.', 'Account created successfully. Please wait for admin approval.'),
        });
        setIsSignUp(false);
        setAdminEmail("");
        setAdminPassword("");
        setAdminLoading(false);
      } else {
        const { error } = await adminSignIn(adminEmail, adminPassword);
        if (error) {
          toast({
            title: text('Нэвтрэхэд алдаа гарлаа', 'Login Failed'),
            description: error.message,
            variant: "destructive",
          });
          setAdminLoading(false);
        } else {
          // Signal that a fresh login succeeded — useEffect will handle redirect
          setLoginSucceeded(true);
        }
      }
    } catch (error: any) {
      toast({
        title: text('Алдаа', 'Error'),
        description: error.message || text('Алдаа гарлаа', 'An error occurred'),
        variant: "destructive",
      });
      setAdminLoading(false);
    }
  };

  // Teacher form submission
  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUsername || !teacherPassword) {
      toast({
        title: text('Алдаа', 'Error'),
        description: text('Хэрэглэгчийн нэр, нууц үгээ оруулна уу', 'Please enter your username and password'),
        variant: "destructive",
      });
      return;
    }

    setTeacherLoading(true);
    try {
      const { error, needsPasswordChange } = await teacherSignIn(teacherUsername, teacherPassword);
      if (error) {
        toast({
          title: text('Нэвтрэхэд алдаа гарлаа', 'Login Failed'),
          description: error.message || text('Хэрэглэгчийн нэр эсвэл нууц үг буруу', 'Invalid username or password'),
          variant: "destructive",
        });
        setTeacherLoading(false);
      } else {
        toast({
          title: text('Тавтай морил!', 'Welcome!'),
          description: needsPasswordChange
            ? text('Түр нууц үгээ солино уу.', 'Please change your temporary password.')
            : text('Амжилттай нэвтэрлээ.', 'Successfully logged in.'),
        });
      }
    } catch (error: any) {
      toast({
        title: text('Алдаа', 'Error'),
        description: error.message || text('Гэнэтийн алдаа гарлаа', 'An unexpected error occurred'),
        variant: "destructive",
      });
      setTeacherLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="STAFF WORKSPACE"
      headline={"Run the whole\noperation from\none place."}
      subline="Batches, attendance, question banks, sprints and analytics — everything your team needs, behind one sign-in."
      features={[
        { icon: <BarChart3 className="h-3.5 w-3.5" />, label: "Live analytics" },
        { icon: <Users className="h-3.5 w-3.5" />, label: "Class management" },
        { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Question banks" },
      ]}
    >
      <div className="space-y-10">
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {text('Багш, админ нэвтрэх', 'Staff sign in')}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground leading-[1.1]">
            {text('Тавтай морил', 'Welcome back')}
          </h1>
          <p className="text-sm text-muted-foreground">{text('flowersos багш, админы хэсэгт нэвтэрнэ үү.', 'Sign in to the flowersos staff workspace.')}</p>
        </div>

        <AuthGlassCard>
          <div className="space-y-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "admin" | "teacher")}>
              <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-border rounded-none p-0 h-auto gap-6">
                <TabsTrigger
                  value="admin"
                  className="flex items-center justify-center gap-2 rounded-none pb-3 text-sm text-muted-foreground border-b-2 border-transparent -mb-px data-[state=active]:border-border data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {text('Админ', 'Admin')}
                </TabsTrigger>
                <TabsTrigger
                  value="teacher"
                  className="flex items-center justify-center gap-2 rounded-none pb-3 text-sm text-muted-foreground border-b-2 border-transparent -mb-px data-[state=active]:border-border data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                >
                  <GraduationCap className="h-4 w-4" />
                  {text('Багш', 'Teacher')}
                </TabsTrigger>
              </TabsList>

              {/* Admin Login Form */}
              <TabsContent value="admin" className="mt-8">
                <form onSubmit={handleAdminSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="admin-email" className={authLabelClasses}>
                      {text('Имэйл', 'Email')}
                    </label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={adminLoading}
                      className={authInputClasses}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="admin-password" className={authLabelClasses}>
                      {text('Нууц үг', 'Password')}
                    </label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={adminLoading}
                      className={authInputClasses}
                    />
                  </div>
                  <Button type="submit" className={authPrimaryButtonClasses} disabled={adminLoading}>
                    {adminLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignUp ? text('Бүртгэж байна...', 'Creating Account...') : text('Нэвтэрч байна...', 'Signing In...')}
                      </>
                    ) : isSignUp ? (
                      text('Бүртгүүлэх', 'Sign Up')
                    ) : (
                      text('Нэвтрэх', 'Login')
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={authGhostButtonClasses}
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={adminLoading}
                  >
                    {isSignUp ? text('Бүртгэлтэй юу? Нэвтрэх', 'Already have an account? Login') : text('Бүртгэлгүй юу? Бүртгүүлэх', 'Need an account? Sign Up')}
                  </Button>
                </form>
              </TabsContent>

              {/* Teacher Login Form */}
              <TabsContent value="teacher" className="mt-8">
                <form onSubmit={handleTeacherSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="teacher-username" className={authLabelClasses}>
                      {text('Хэрэглэгчийн нэр', 'Username')}
                    </label>
                    <Input
                      id="teacher-username"
                      type="text"
                      placeholder="your-username"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      disabled={teacherLoading}
                      className={authInputClasses}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="teacher-password" className={authLabelClasses}>
                      {text('Нууц үг', 'Password')}
                    </label>
                    <Input
                      id="teacher-password"
                      type="password"
                      placeholder="••••••••"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      disabled={teacherLoading}
                      className={authInputClasses}
                    />
                  </div>
                  <Button type="submit" className={authPrimaryButtonClasses} disabled={teacherLoading}>
                    {teacherLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {text('Нэвтэрч байна...', 'Signing In...')}
                      </>
                    ) : (
                      text('Нэвтрэх', 'Sign In')
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {text('Нэвтрэх эрх авах бол админтай холбогдоно уу', 'Contact admin if you need account access')}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </AuthGlassCard>
      </div>
    </AuthSplitLayout>
  );
}
