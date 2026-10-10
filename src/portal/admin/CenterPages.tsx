import { useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Copy, KeyRound, Moon, Plus, Sun, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { centerPortalUrl } from '@/lib/tenant';
import { CenterLogo, useCenter, type PortalSettings } from '../centerContext';
import { centerAccounts, localDate } from '../centerApi';
import { useCenterAdminData, useRefreshCenter, money } from './useCenterAdminData';
import { Empty, Loading, PageHeader, Section } from './ui';

function CredentialDialog({ cred, onClose }: { cred: { email: string; password: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!cred} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Login details</DialogTitle><DialogDescription>Share these once — the password isn't shown again.</DialogDescription></DialogHeader>
        {cred && <div className="space-y-2 text-sm">{([['Email', cred.email], ['Password', cred.password]] as const).map(([l, v]) => (
          <div key={l} className="flex items-center justify-between gap-2 rounded-md border p-2"><span><span className="text-muted-foreground">{l}: </span><span className="font-mono font-semibold select-all">{v}</span></span>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(v); toast.success(`${l} copied`); }}><Copy className="h-3 w-3" />Copy</Button></div>
        ))}</div>}
      </DialogContent>
    </Dialog>
  );
}

export function TeamPage() {
  const { center, userId } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState<{ email: string; password: string } | null>(null);
  if (isLoading || !data) return <Loading />;
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await centerAccounts<{ email: string; temporaryPassword: string }>({ action: 'create_member', institution_id: center.id, role: 'teacher', name, email });
      setCred({ email: r.email, password: r.temporaryPassword }); setName(''); setEmail(''); refresh();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const reset = async (m: (typeof data.members)[number]) => {
    try { const r = await centerAccounts<{ temporaryPassword: string }>({ action: 'reset_member_password', institution_id: center.id, member_id: m.id }); setCred({ email: m.email, password: r.temporaryPassword }); }
    catch (err) { toast.error((err as Error).message); }
  };
  const toggle = async (m: (typeof data.members)[number]) => {
    const { error } = await supabase.from('tenant_members').update({ active: !m.active }).eq('id', m.id);
    if (error) toast.error(error.message); else refresh();
  };
  const batches = (memberId: string) => data.classes.filter(c => c.teacher_member_id === memberId).map(c => c.name).join(', ');
  return (
    <div className="space-y-8">
      <PageHeader title="Team" description="Teachers and admins who can sign in to your center." />
      <form onSubmit={add} className="flex flex-wrap gap-3 items-end rounded-lg border p-4">
        <div className="space-y-1"><Label htmlFor="t-name">Teacher name</Label><Input id="t-name" value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="t-email">Email</Label><Input id="t-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <Button disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Adding…' : 'Add teacher'}</Button>
      </form>
      <ul className="divide-y">{data.members.map(m => (
        <li key={m.id} className="py-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="flex-1 min-w-48"><p className={m.active ? 'font-medium' : 'text-muted-foreground line-through'}>{m.display_name}{m.user_id === userId && <span className="ml-2 text-xs text-muted-foreground font-normal">You</span>}</p>
            <p className="text-xs text-muted-foreground">{m.email}{batches(m.id) && ` · ${batches(m.id)}`}</p></div>
          <span className="text-xs rounded px-2 py-0.5 bg-muted text-muted-foreground">{m.role === 'center_admin' ? 'Admin' : 'Teacher'}</span>
          {m.role === 'teacher' && <>
            <Button variant="outline" size="sm" onClick={() => reset(m)}><KeyRound className="h-4 w-4" />New password</Button>
            <Button variant="ghost" size="sm" onClick={() => toggle(m)}>{m.active ? 'Deactivate' : 'Reactivate'}</Button></>}
        </li>
      ))}</ul>
      {!data.members.some(m => m.role === 'teacher') && <Empty>No teachers yet. Add one above to get their login.</Empty>}
      <CredentialDialog cred={cred} onClose={() => setCred(null)} />
    </div>
  );
}

/** Downscale an uploaded logo to a small PNG data URL so it can live with the brand settings. */
async function shrinkLogo(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const size = 192, scale = Math.min(1, size / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Edmonton', 'Europe/London', 'Europe/Berlin', 'Asia/Ulaanbaatar', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney'];

export function SettingsPage() {
  const { center, reloadCenter } = useCenter();
  const { data } = useCenterAdminData();
  const initial = center.portal_settings ?? {};
  const [s, setS] = useState<PortalSettings>({ display_name: initial.display_name ?? center.name, brand_color: initial.brand_color ?? '#171717', logo_url: initial.logo_url, contact_email: initial.contact_email ?? '', timezone: initial.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = { ...center, portal_settings: s };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast.error('Use a PNG, JPG or WebP image.');
    try { setS(v => ({ ...v, logo_url: undefined })); const url = await shrinkLogo(f); setS(v => ({ ...v, logo_url: url })); }
    catch { toast.error('Could not read that image.'); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.rpc('tenant_update_settings', { _institution: center.id, _settings: s as never });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Settings saved'); reloadCenter();
  };
  const today = localDate();
  return (
    <div className="space-y-10 max-w-2xl">
      <PageHeader title="Settings" description="Brand details appear on sign-in, and in the admin, teacher and student portals." />
      <form onSubmit={save} className="space-y-6">
        <Section title="Brand">
          <div className="flex items-center gap-4">
            <CenterLogo center={preview} className="h-16 w-16" />
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Upload logo</Button>
              {s.logo_url && <Button type="button" variant="ghost" size="sm" onClick={() => setS({ ...s, logo_url: undefined })}><X className="h-4 w-4" />Remove</Button>}
            </div>
          </div>
          <div className="space-y-1"><Label htmlFor="st-name">Display name</Label><Input id="st-name" value={s.display_name ?? ''} onChange={e => setS({ ...s, display_name: e.target.value })} maxLength={80} /></div>
          <div className="space-y-1"><Label htmlFor="st-color">Brand color</Label>
            <div className="flex items-center gap-2"><input id="st-color" type="color" value={s.brand_color} onChange={e => setS({ ...s, brand_color: e.target.value })} className="h-9 w-12 rounded border bg-background cursor-pointer" />
              <Input aria-label="Brand color hex" value={s.brand_color} onChange={e => setS({ ...s, brand_color: e.target.value })} className="w-32 font-mono" />
              <span className="rounded-md px-3 h-9 inline-flex items-center text-sm" style={{ background: s.brand_color, color: '#fff' }}>Button preview</span></div>
            <p className="text-xs text-muted-foreground">Used for buttons and highlights. Pick a darker color so white text stays readable.</p></div>
        </Section>
        <Section title="Contact & region">
          <div className="space-y-1"><Label htmlFor="st-email">Contact email for students</Label><Input id="st-email" type="email" value={s.contact_email ?? ''} onChange={e => setS({ ...s, contact_email: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="st-tz">Time zone</Label>
            <select id="st-tz" value={s.timezone} onChange={e => setS({ ...s, timezone: e.target.value })} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              {[...new Set([s.timezone!, ...TIMEZONES])].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        </Section>
        <Button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
      </form>
      <Section title="Appearance">
        <DarkModeSetting />
      </Section>
      <Section title="Portal address">
        <p className="text-sm"><span className="font-mono">{centerPortalUrl(center.slug)}</span></p>
      </Section>
      <Section title="Billing">
        {data?.dues.length ? <table className="w-full text-sm"><tbody className="divide-y">{data.dues.map(d => (
          <tr key={d.id}><td className="py-2">{d.description || 'Payment'}</td><td className="font-mono">{money(d.amount, d.currency)}</td><td className="font-mono text-xs">{d.due_date}</td>
            <td className="text-xs">{d.paid_at ? 'Paid' : d.due_date < today ? <span className="rounded px-2 py-0.5 bg-status-risk/10 text-status-risk">Overdue</span> : 'Upcoming'}</td></tr>
        ))}</tbody></table> : <Empty>No payments on file.</Empty>}
        <p className="text-xs text-muted-foreground">Questions about billing? Contact your Tsetsegs account manager.</p>
      </Section>
    </div>
  );
}

/** Light/dark toggle for the center portals; persists with the rest of the theme preferences. */
export function DarkModeSetting({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isDark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
        <div>
          <Label htmlFor="center-dark-mode" className="text-base font-medium cursor-pointer">Dark mode</Label>
          <p className="text-sm text-muted-foreground">Switch the portal between light and dark themes</p>
        </div>
      </div>
      <Switch id="center-dark-mode" checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
    </div>
  );
}
