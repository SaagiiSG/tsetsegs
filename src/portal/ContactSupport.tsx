import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/** Center staff's way to reach FlowersOS. The server checks they are staff of `centerId`, even when it is blocked. */
export function ContactSupport({ centerId, variant = 'outline', className }: { centerId: string; variant?: ButtonProps['variant']; className?: string }) {
  const [open, setOpen] = useState(false), [sent, setSent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [subject, setSubject] = useState(''), [message, setMessage] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data: id, error: failure } = await supabase.rpc('submit_support_request', { _institution: centerId, _subject: subject, _message: message });
      if (failure) throw failure;
      // Owner email alert, fire-and-forget: the request is already saved, so a failed alert must not block success.
      void supabase.functions.invoke('notify-support-request', { body: { id } });
      setSent(true); setSubject(''); setMessage('');
    } catch (err) { setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Could not send. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setSent(false); setError(''); } }}>
      <DialogTrigger asChild><Button type="button" variant={variant} className={className}>Contact FlowersOS</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Contact FlowersOS</DialogTitle><DialogDescription>Questions about your plan, billing or a problem. We'll reply by email.</DialogDescription></DialogHeader>
        {sent ? <p role="status" className="text-sm">Sent. We'll reply by email.</p> : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1"><Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" required minLength={3} maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="support-message">Message</Label>
              <Textarea id="support-message" required minLength={10} maxLength={4000} rows={6} value={message} onChange={e => setMessage(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
