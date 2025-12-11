import { useState } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Settings, Moon, Sun, LogOut, User, Phone, School, GraduationCap,
  Share2, Copy, RefreshCw, Link2, Loader2
} from 'lucide-react';

export default function StudentSettings() {
  const { student, logout } = useStudentAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const linkedStudent = student?.linked_student as {
    first_name: string;
    last_name: string;
    school_name?: string;
    grade?: string;
  } | null;

  // Fetch current share token
  const { data: accountData, isLoading: loadingAccount } = useQuery({
    queryKey: ['student-share-token', student?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_accounts')
        .select('share_token, share_token_created_at')
        .eq('id', student!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!student?.id
  });

  // Generate/regenerate share token
  const generateToken = useMutation({
    mutationFn: async () => {
      // Generate a random hex token
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
      
      const { error } = await supabase
        .from('student_accounts')
        .update({ 
          share_token: token,
          share_token_created_at: new Date().toISOString()
        })
        .eq('id', student!.id);
      
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-share-token'] });
      toast.success('Share link generated!');
    },
    onError: () => {
      toast.error('Failed to generate share link');
    }
  });

  // Revoke share token
  const revokeToken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('student_accounts')
        .update({ 
          share_token: null,
          share_token_created_at: null
        })
        .eq('id', student!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-share-token'] });
      toast.success('Share link revoked');
    },
    onError: () => {
      toast.error('Failed to revoke share link');
    }
  });

  const shareUrl = accountData?.share_token 
    ? `${window.location.origin}/student/share/${accountData.share_token}`
    : null;

  const copyShareLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

      {/* Share with Parents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share with Parents
          </CardTitle>
          <CardDescription>
            Generate a link to share your progress with parents (read-only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAccount ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={copyShareLink}
                >
                  <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateToken.mutate()}
                  disabled={generateToken.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${generateToken.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => revokeToken.mutate()}
                  disabled={revokeToken.isPending}
                >
                  Revoke Link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Parents can view your progress, stats, and recent activity through this link.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No share link generated yet. Create one to let your parents track your progress.
              </p>
              <Button 
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
              >
                {generateToken.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Generate Share Link
              </Button>
            </div>
          )}
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
