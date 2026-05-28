import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ConnectedEmailCard() {
  const { student } = useStudentAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!student?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('student_email_links')
      .select('email')
      .eq('student_account_id', student.id)
      .maybeSingle();
    setEmail((data as any)?.email ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [student?.id]);

  // Handle return from OAuth on the settings page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('link_email') !== '1' || !student?.id) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setBusy(true);
      const { error } = await supabase.functions.invoke('link-google-email', {
        body: { student_account_id: student.id },
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else toast.success('Email connected');
      const url = new URL(window.location.href);
      url.searchParams.delete('link_email');
      window.history.replaceState({}, '', url.toString());
      load();
    })();
  }, [student?.id]);

  const connect = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin + '/practice/settings?link_email=1',
    });
    if (result.error) {
      toast.error('Could not start Google sign-in');
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!student?.id || !confirm('Disconnect your email?')) return;
    setBusy(true);
    await supabase.from('student_email_links').delete().eq('student_account_id', student.id);
    setBusy(false);
    setEmail(null);
    toast.success('Email disconnected');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Connected email</CardTitle>
        <CardDescription>Used to send you announcements from the team</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : email ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{email}</p>
              <p className="text-xs text-muted-foreground">Connected with Google</p>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>Disconnect</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">No email connected yet.</p>
            <Button onClick={connect} disabled={busy} className="gap-2">
              <Sparkles className="h-4 w-4" /> Connect with Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
