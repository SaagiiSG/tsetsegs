import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import {
  clearBorrowedGoogleSession,
  clearStudentEmailLinkPending,
  linkCurrentGoogleEmail,
  markStudentEmailLinkPending,
} from '@/lib/studentEmailLinking';
import { toast } from 'sonner';

/**
 * Shown once per student account: prompts them to connect a Google email so we
 * can send announcements. Skipping stamps `email_link_prompted_at` so we don't
 * nag every session — they can still connect later in Settings.
 */
export function LinkEmailModal() {
  const { student } = useStudentAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Detect whether to show on mount / route change
  useEffect(() => {
    if (!student?.id) return;
    const params = new URLSearchParams(window.location.search);
    // Don't auto-open while we're mid OAuth-return; the handler below decides.
    if (params.get('link_email') === '1') return;
    (async () => {
      const { data: link } = await supabase
        .from('student_email_links')
        .select('id')
        .eq('student_account_id', student.id)
        .maybeSingle();
      if (link) return;
      if ((student as any).email_link_prompted_at) return;
      setOpen(true);
    })();
  }, [student?.id]);

  // Handle OAuth return: ?link_email=1 means we just came back from Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('link_email') !== '1' || !student?.id) return;

    (async () => {
      try {
        setBusy(true);
        await linkCurrentGoogleEmail(student.id);
        await supabase
          .from('student_accounts')
          .update({ email_link_prompted_at: new Date().toISOString() })
          .eq('id', student.id);
        toast.success('Email connected — you\'ll get announcements');
        setOpen(false);
      } catch (e: any) {
        toast.error(e.message || 'Failed to link email');
      } finally {
        // CRITICAL: drop the Google session immediately so it doesn't
        // hijack the student's custom phone-based session on next login.
        await clearBorrowedGoogleSession();
        clearStudentEmailLinkPending();
        const url = new URL(window.location.href);
        url.searchParams.delete('link_email');
        window.history.replaceState({}, '', url.toString());
        setBusy(false);
      }
    })();
  }, [student?.id]);

  const connect = async () => {
    if (!student?.id) return;
    markStudentEmailLinkPending(student.id);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/practice/dashboard?link_email=1',
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        await linkCurrentGoogleEmail(student.id);
        await supabase
          .from('student_accounts')
          .update({ email_link_prompted_at: new Date().toISOString() })
          .eq('id', student.id);
        await clearBorrowedGoogleSession();
        clearStudentEmailLinkPending();
        toast.success('Email connected — you\'ll get announcements');
        setOpen(false);
      }
    } catch (e: any) {
      clearStudentEmailLinkPending();
      toast.error(e.message || 'Could not start Google sign-in');
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {

    if (!student?.id) return;
    setBusy(true);
    await supabase
      .from('student_accounts')
      .update({ email_link_prompted_at: new Date().toISOString() })
      .eq('id', student.id);
    setOpen(false);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Connect your email</DialogTitle>
          <DialogDescription className="text-center">
            We'll send important announcements (test dates, schedule changes, scholarship news) to your inbox.
            Connect once with Google — takes 5 seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2" onClick={connect} disabled={busy}>
            <Sparkles className="h-4 w-4" /> Connect with Google
          </Button>
          <Button variant="ghost" className="w-full" onClick={skip} disabled={busy}>
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
