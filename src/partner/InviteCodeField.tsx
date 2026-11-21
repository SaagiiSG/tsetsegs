import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authInputClasses, authLabelClasses } from '@/components/auth/AuthSplitLayout';
import { supabase } from '@/integrations/supabase/client';
import { normalizeCode, rememberInvite, storedInvite } from './invite';

type Rpc<T> = { rpc: (fn: string, args: object) => PromiseLike<T> };
// partner_code_ok is new and not in the generated types yet.
const codeOk = (code: string) =>
  (supabase as unknown as Rpc<{ data: boolean | null; error?: unknown }>).rpc('partner_code_ok', { _code: code });

const linkClasses = 'h-auto p-0 font-medium text-foreground';

/** Optional invite code at sign-up. Never blocks sign-up: a bad or unchecked code is simply dropped. */
export default function InviteCodeField() {
  const [saved, setSaved] = useState(storedInvite);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [bad, setBad] = useState(false);

  const req = useRef(0); // a newer blur, Cancel or edit makes an older answer stale
  const checked = useRef('');

  // A stored code (from a ?ref= link) was never checked; drop a dead one, but keep it on an RPC error since the server re-checks at attach.
  useEffect(() => {
    if (!saved) return;
    const mine = ++req.current;
    codeOk(saved).then(({ data, error }) => {
      if (mine !== req.current || error || data !== false) return;
      rememberInvite(null); setSaved(null); setBad(true);
    }, () => { /* keep the code */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Store the typed code right away: the OAuth click that blurs this box can unload the page before the check answers.
  const check = async () => {
    const code = normalizeCode(value);
    if (!code || code === checked.current) return;
    checked.current = code;
    const mine = ++req.current;
    rememberInvite(code);
    let ok = false;
    try { ok = !!(await codeOk(code)).data; } catch { /* treat a failed check as a bad code */ }
    if (mine !== req.current) return;
    if (ok) { setSaved(code); setOpen(false); setValue(''); setBad(false); }
    else { rememberInvite(saved); setBad(true); }
  };
  const cancel = () => { req.current++; checked.current = ''; rememberInvite(saved); setOpen(false); setBad(false); };

  if (saved && !open) {
    return (
      <p className="text-sm text-muted-foreground">
        Invite code {saved} added <Button type="button" variant="link" className={linkClasses} onClick={() => { req.current++; setOpen(true); setValue(saved); }}>Change</Button>
      </p>
    );
  }
  if (!open) {
    return (
      <div className="space-y-1">
        {bad && <p role="status" className="text-xs text-muted-foreground">That code doesn't work. You can still sign up without one.</p>}
        <p className="text-sm"><Button type="button" variant="link" className={linkClasses} onClick={() => { setBad(false); setOpen(true); }}>Have an invite code?</Button></p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="solo-invite" className={authLabelClasses}>Invite code</Label>
      <Input id="solo-invite" autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={30}
        className={authInputClasses} value={value} onChange={e => { setValue(e.target.value); setBad(false); checked.current = ''; }}
        onBlur={() => void check()} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void check(); } }} />
      {bad && <p role="status" className="text-xs text-muted-foreground">That code doesn't work. You can still sign up without one.</p>}
      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={cancel}>Cancel</Button>
    </div>
  );
}
