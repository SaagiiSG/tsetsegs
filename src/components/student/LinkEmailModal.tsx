import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { GoogleMark } from '@/components/auth/BrandIcons';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import {
  clearBorrowedGoogleSession,
  clearStudentEmailLinkPending,
  getErrorMessage,
  linkCurrentGoogleEmail,
  markStudentEmailLinkPending,
} from '@/lib/studentEmailLinking';
import { toast } from 'sonner';

/**
 * Blocking prompt: existing students must connect a Google account (used for
 * self password reset and announcements) before using the portal.
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
      const { data: connected, error } = await supabase.rpc('student_google_connected');
      if (error || connected) return;
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
        toast.success('Google connected — you can now reset your password yourself');
        setOpen(false);
      } catch (e: unknown) {
        toast.error(getErrorMessage(e, 'Failed to link email'));
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
        toast.success('Google connected — you can now reset your password yourself');
        setOpen(false);
      }
    } catch (e: unknown) {
      clearStudentEmailLinkPending();
      toast.error(getErrorMessage(e, 'Could not start Google sign-in'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Connect your Google account</DialogTitle>
          <DialogDescription className="text-center">
            If you ever forget your password, you can reset it yourself with this Google account. We'll also send important announcements to your inbox.
            Connect once with Google — takes 5 seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2" onClick={connect} disabled={busy}>
            <GoogleMark /> Connect with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Required to keep using the platform.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
