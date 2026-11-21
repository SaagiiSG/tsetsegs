import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authInputClasses, authLabelClasses } from '@/components/auth/AuthSplitLayout';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCode, rememberInvite, storedInvite } from './invite';

type Rpc<T> = { rpc: (fn: string, args: object) => PromiseLike<T> };
// partner_code_ok is new and not in the generated types yet.
const codeOk = (code: string) =>
  (supabase as unknown as Rpc<{ data: boolean | null }>).rpc('partner_code_ok', { _code: code });

const linkClasses = 'font-medium text-foreground underline underline-offset-4';

/** Optional invite code at sign-up. Never blocks sign-up: a bad or unchecked code is simply dropped. */
export default function InviteCodeField() {
  const [saved, setSaved] = useState(storedInvite);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [bad, setBad] = useState(false);

  const check = async () => {
    const code = normalizeCode(value);
    if (!code) { setBad(false); return; }
    let ok = false;
    try { ok = !!(await codeOk(code)).data; } catch { /* treat a failed check as a bad code */ }
    if (ok) { rememberInvite(code); setSaved(code); setOpen(false); setValue(''); setBad(false); }
    else setBad(true);
  };

  if (saved && !open) {
    return (
      <p className="text-sm text-muted-foreground">
        Invite code {saved} added <button type="button" className={linkClasses} onClick={() => { setOpen(true); setValue(saved); }}>Change</button>
      </p>
    );
  }
  if (!open) {
    return <p className="text-sm"><button type="button" className={linkClasses} onClick={() => setOpen(true)}>Have an invite code?</button></p>;
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="solo-invite" className={authLabelClasses}>Invite code</Label>
      <Input id="solo-invite" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={30}
        className={authInputClasses} value={value} onChange={e => { setValue(e.target.value); setBad(false); }}
        onBlur={() => void check()} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void check(); } }} />
      {bad && <p role="status" className="text-xs text-muted-foreground">That code doesn't work. You can still sign up without one.</p>}
      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => { setOpen(false); setBad(false); }}>Cancel</Button>
    </div>
  );
}
