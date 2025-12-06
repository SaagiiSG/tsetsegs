import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Lock, Palette, Moon, Sun, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const colorThemes = [
  { id: "rose", name: "Rose", color: "hsl(345 75% 65%)" },
  { id: "blue", name: "Ocean", color: "hsl(217 91% 60%)" },
  { id: "green", name: "Forest", color: "hsl(142 76% 45%)" },
  { id: "purple", name: "Violet", color: "hsl(270 70% 60%)" },
  { id: "orange", name: "Sunset", color: "hsl(25 95% 55%)" },
  { id: "gold", name: "Gold", color: "hsl(43 88% 50%)" },
];

export default function TeacherSettings() {
  const { teacherName, user, changePassword } = useTeacherAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Color theme state
  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem("color-theme") || "rose";
  });

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Apply color theme on mount and change
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    colorThemes.forEach((t) => root.classList.remove(`theme-${t.id}`));
    // Add current theme class
    root.classList.add(`theme-${colorTheme}`);
    localStorage.setItem("color-theme", colorTheme);
  }, [colorTheme]);

  // Load theme on initial mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme");
    if (savedTheme) {
      document.documentElement.classList.add(`theme-${savedTheme}`);
    }
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    const { error } = await changePassword(newPassword);
    setIsChangingPassword(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const isDarkMode = theme === "dark";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher/dashboard")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your preferences
            </p>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Name</Label>
                <p className="text-lg font-medium">{teacherName || "Teacher"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Username</Label>
                <p className="text-sm font-mono text-muted-foreground">
                  {user?.user_metadata?.username || "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <Label htmlFor="dark-mode" className="text-base font-medium cursor-pointer">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                </div>
                <Switch
                  id="dark-mode"
                  checked={isDarkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-3">
                <div>
                  <Label className="text-base font-medium">Accent Color</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred accent color
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {colorThemes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setColorTheme(t.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        colorTheme === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full shadow-md flex items-center justify-center"
                        style={{ backgroundColor: t.color }}
                      >
                        {colorTheme === t.id && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <span className="text-xs font-medium">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={8}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
                <Button
                  type="submit"
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
