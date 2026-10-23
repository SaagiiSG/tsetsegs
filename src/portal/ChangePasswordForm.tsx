import { useId, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { authInputClasses, authLabelClasses, authPrimaryButtonClasses } from '@/components/auth/AuthSplitLayout';
import { PasswordInput } from './PasswordInput';

/** Sets a new password for whoever is signed in: staff settings, or after a reset-password email link. */
export function ChangePasswordForm({ onDone, onAuthPage = false }: { onDone?: () => void; onAuthPage?: boolean }) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setPassword(''); setConfirm(''); toast.success('Password changed'); onDone?.();
  };
  const label = onAuthPage ? authLabelClasses : undefined;
  const input = onAuthPage ? authInputClasses : undefined;
  return (
    <form onSubmit={save} className={onAuthPage ? 'space-y-6' : 'space-y-3'}>
      <div className="space-y-1"><Label htmlFor={`${id}-new`} className={label}>New password</Label>
        <PasswordInput id={`${id}-new`} autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className={input} /></div>
      <div className="space-y-1"><Label htmlFor={`${id}-confirm`} className={label}>Confirm new password</Label>
        <PasswordInput id={`${id}-confirm`} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={input} /></div>
      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      <Button disabled={busy} className={onAuthPage ? authPrimaryButtonClasses : undefined}>{busy ? 'Saving…' : 'Change password'}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
