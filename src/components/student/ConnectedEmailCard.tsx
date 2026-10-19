import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import {
  clearStudentEmailLinkPending,
  getErrorMessage,
  completeStudentGoogleLink,
  STUDENT_EMAIL_LINKED_EVENT,
  markStudentEmailLinkPending,
} from '@/lib/studentEmailLinking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { GoogleMark } from '@/components/auth/BrandIcons';
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
    setEmail(data?.email ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [student?.id]);

  // The layout owns OAuth returns; settings observes completion.
  useEffect(() => {
    const onLinked = (event: Event) => {
      const detail = (event as CustomEvent<{ studentAccountId: string; email: string | null }>).detail;
      if (detail.studentAccountId !== student?.id) return;
      setEmail(detail.email);
      setLoading(false);
    };
    window.addEventListener(STUDENT_EMAIL_LINKED_EVENT, onLinked);
    return () => window.removeEventListener(STUDENT_EMAIL_LINKED_EVENT, onLinked);
  }, [student?.id]);

  const connect = async () => {
    if (!student?.id) return;
    markStudentEmailLinkPending(student.id);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/practice/settings?link_email=1',
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const linkedEmail = await completeStudentGoogleLink(student.id);
        setEmail(linkedEmail);
        toast.success('Email connected');
      }
    } catch (e: unknown) {
      clearStudentEmailLinkPending();
      toast.error(getErrorMessage(e, 'Could not start Google sign-in'));
    } finally {
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
              <GoogleMark /> Connect with Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
