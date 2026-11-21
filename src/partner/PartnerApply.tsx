import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { authInputClasses, authLabelClasses, authPrimaryButtonClasses } from '@/components/auth/AuthSplitLayout';
import { supabase } from '@/integrations/supabase/client';
import PartnerShell from './PartnerShell';
import PartnerRules from './PartnerRules';

// submit_partner_application is new and not in the generated types yet.
type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ data: string | null; error: { message?: string } | null }> };

export default function PartnerApply() {
  const [f, setF] = useState({ name: '', email: '', link: '', country: '', message: '', website: '' });
  const [kind, setKind] = useState('tutor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { data, error: err } = await (supabase as unknown as Rpc).rpc('submit_partner_application', {
        _name: f.name, _email: f.email, _kind: kind, _link: f.link, _country: f.country, _message: f.message, _website: f.website,
      });
      if (err) { setError(err.message || 'Something went wrong. Try again.'); return; }
      if (data) void supabase.functions.invoke('notify-partner-application', { body: { id: data } }).catch(() => {}); // the admin email is best effort
      setSent(true);
    } catch (e) { setError((e as Error)?.message || 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  };

  if (sent) return (
    <PartnerShell>
      <div className="space-y-3" role="status">
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">Thanks!</h1>
        <p className="text-sm text-muted-foreground">We read every application and email you if it's a fit.</p>
      </div>
    </PartnerShell>
  );

  const field = (id: string, label: string, k: keyof typeof f, type = 'text', required = true) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={authLabelClasses}>{label}</Label>
      <Input id={id} type={type} required={required} className={authInputClasses} value={f[k]} onChange={set(k)} />
    </div>
  );
  return (
    <PartnerShell>
      <div className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Partners</p>
        <h1 className="text-4xl font-semibold tracking-tight leading-[1.1]">Become a flowersos partner</h1>
        <p className="text-sm text-muted-foreground">Tutors and creators: earn $10 for every student you bring who pays for a year of Premium.</p>
      </div>
      <PartnerRules />
      <form onSubmit={submit} className="space-y-4">
        {field('p-name', 'Name', 'name')}
        {field('p-email', 'Email', 'email', 'email')}
        <div className="space-y-1.5">
          <Label id="p-kind" className={authLabelClasses}>I am a</Label>
          <RadioGroup value={kind} onValueChange={setKind} aria-labelledby="p-kind" className="flex gap-6">
            <div className="flex items-center gap-2"><RadioGroupItem value="tutor" id="p-tutor" /><Label htmlFor="p-tutor">Tutor</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="creator" id="p-creator" /><Label htmlFor="p-creator">Creator</Label></div>
          </RadioGroup>
        </div>
        {field('p-link', 'Where you teach or post (a link)', 'link', 'url')}
        {field('p-country', 'Country', 'country')}
        <div className="space-y-1.5">
          <Label htmlFor="p-message" className={authLabelClasses}>Anything else (optional)</Label>
          <Textarea id="p-message" rows={4} value={f.message} onChange={set('message')} />
        </div>
        {/* Honeypot: people never see it, bots fill it. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className={authPrimaryButtonClasses} disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
      </form>
    </PartnerShell>
  );
}
