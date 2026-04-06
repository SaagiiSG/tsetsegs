import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, GraduationCap, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import flowersLogo from "@/assets/flowers-logo.png";

export default function Login() {
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
        title: "Welcome back!",
        description: "You've successfully logged in as admin.",
      });
      navigate("/admin");
      setLoginSucceeded(false);
    } else if (adminUser && !isAdmin) {
      setAdminLoading(false);
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
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
        title: "Error",
        description: "Please fill in all fields",
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
          title: "Success",
          description: "Account created successfully. Please wait for admin approval.",
        });
        setIsSignUp(false);
        setAdminEmail("");
        setAdminPassword("");
        setAdminLoading(false);
      } else {
        const { error } = await adminSignIn(adminEmail, adminPassword);
        if (error) {
          toast({
            title: "Login Failed",
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
        title: "Error",
        description: error.message || "An error occurred",
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
        title: "Error",
        description: "Please enter your username and password",
        variant: "destructive",
      });
      return;
    }

    setTeacherLoading(true);
    try {
      const { error, needsPasswordChange } = await teacherSignIn(teacherUsername, teacherPassword);
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid username or password",
          variant: "destructive",
        });
        setTeacherLoading(false);
      } else {
        toast({
          title: "Welcome!",
          description: needsPasswordChange
            ? "Please change your temporary password."
            : "Successfully logged in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setTeacherLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={flowersLogo} alt="Flowers Logo" className="h-16 w-16 object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {activeTab === "admin" ? (isSignUp ? "Create Account" : "Admin Login") : "Teacher Login"}
            </CardTitle>
            <CardDescription>
              {activeTab === "admin"
                ? isSignUp
                  ? "Sign up for a new admin account"
                  : "Sign in to access the admin dashboard"
                : "Sign in to access your classes"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "admin" | "teacher")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Teacher
                </TabsTrigger>
              </TabsList>

              {/* Admin Login Form */}
              <TabsContent value="admin" className="mt-6">
                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="admin-email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={adminLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="admin-password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={adminLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={adminLoading}>
                    {adminLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignUp ? "Creating Account..." : "Signing In..."}
                      </>
                    ) : isSignUp ? (
                      "Sign Up"
                    ) : (
                      "Login"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={adminLoading}
                  >
                    {isSignUp ? "Already have an account? Login" : "Need an account? Sign Up"}
                  </Button>
                </form>
              </TabsContent>

              {/* Teacher Login Form */}
              <TabsContent value="teacher" className="mt-6">
                <form onSubmit={handleTeacherSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="teacher-username" className="text-sm font-medium">
                      Username
                    </label>
                    <Input
                      id="teacher-username"
                      type="text"
                      placeholder="your-username"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      disabled={teacherLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="teacher-password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="teacher-password"
                      type="password"
                      placeholder="••••••••"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      disabled={teacherLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={teacherLoading}>
                    {teacherLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Contact admin if you need account access
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to main site
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
