import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { 
  Settings, Moon, Sun, LogOut, User, Phone, School, GraduationCap
} from 'lucide-react';

export default function StudentSettings() {
  const { student, logout } = useStudentAuth();
  const { theme, setTheme } = useTheme();

  const linkedStudent = student?.linked_student as {
    first_name: string;
    last_name: string;
    school_name?: string;
    grade?: string;
  } | null;

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {linkedStudent 
                  ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`
                  : 'Student'}
              </h3>
              <p className="text-sm text-muted-foreground">
                SAT Practice Student
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{student?.phone_number}</span>
            </div>
            {linkedStudent?.school_name && (
              <div className="flex items-center gap-3 text-sm">
                <School className="h-4 w-4 text-muted-foreground" />
                <span>{linkedStudent.school_name}</span>
              </div>
            )}
            {linkedStudent?.grade && (
              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>Grade {linkedStudent.grade}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use dark theme for better night visibility
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>SAT Practice Portal</p>
          <p>Tsetsegs Talent Agency</p>
          <p>Version 1.0.0</p>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        variant="destructive" 
        className="w-full"
        onClick={logout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}
