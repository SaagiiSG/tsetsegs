import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { centerPortalUrl } from '@/lib/tenant';
import { centerAccounts } from '@/portal/centerApi';
import type { InstitutionCustomer } from '@/hooks/useInstitutionCustomers';

export function CenterPortalSetup({ customer, onClose, onSaved }: { customer: InstitutionCustomer; onClose: () => void; onSaved: () => void }) {
  const [slug, setSlug] = useState(customer.slug ?? '');
  const [enabled, setEnabled] = useState(customer.portal_enabled);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(customer.contact_name);
  const [email, setEmail] = useState(customer.contact_email);
  const [cred, setCred] = useState<{ email: string; temporaryPassword?: string; existingAccount?: boolean } | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const members = useQuery({
    queryKey: ['center-members', customer.id],
    queryFn: async () => (await supabase.from('tenant_members').select('*').eq('institution_id', customer.id).order('created_at')).data ?? [],
  });
  const counts = useQuery({
    queryKey: ['center-counts', customer.id],
    queryFn: async () => (await supabase.from('tenant_students').select('id', { count: 'exact', head: true }).eq('institution_id', customer.id)).count ?? 0,
  });
  useEffect(() => { if (!customer.slug) setSlug(customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)); }, [customer]);
  useEffect(() => { if (cred || accountError) document.getElementById('center-account-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [cred, accountError]);

  const valid = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) && !['www', 'app', 'admin', 'api'].includes(slug);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('institution_customers').update({ slug, portal_enabled: enabled }).eq('id', customer.id);
    setSaving(false);
    if (error) return toast.error(error.code === '23505' ? 'That address is already taken.' : error.message);
    toast.success('Portal saved'); onSaved();
  };
  const run = async (fn: () => Promise<NonNullable<typeof cred>>) => {
    setAccountError(null); setCred(null); setCreating(true);
    try { setCred(await fn()); members.refetch(); }
    catch (err) { setAccountError((err as Error).message); }
    finally { setCreating(false); }
  };
  const createAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => centerAccounts({ action: 'create_member', institution_id: customer.id, role: 'center_admin', name, email }));
  };
  const url = centerPortalUrl(slug || 'your-center');
  const previewUrl = `${window.location.origin}/?center=${slug}`;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Portal · {customer.name}</DialogTitle><DialogDescription>Separate login and data for this center's admins, teachers and students.</DialogDescription></DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Step 1 · Web address</h3>
            <div className="space-y-1"><Label htmlFor="slug">Address</Label>
              <div className="flex items-center gap-1"><Input id="slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} className="font-mono" /><span className="text-sm text-muted-foreground whitespace-nowrap">.flowersos.co</span></div>
              {!valid && <p className="text-xs text-destructive">Lowercase letters, numbers and dashes only.</p>}</div>
            <div className="flex items-center justify-between"><Label htmlFor="portal-on">Portal open</Label><Switch id="portal-on" checked={enabled} onCheckedChange={setEnabled} /></div>
            <Button onClick={save} disabled={!valid || saving}>{saving ? 'Saving…' : 'Save'}</Button>
            {customer.slug && <div className="rounded-md border p-3 text-xs space-y-2 text-muted-foreground">
              <p><span className="font-mono text-foreground">{centerPortalUrl(customer.slug)}</span> — add this address once under Project Settings → Domains before the center can use it.</p>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}><Copy className="h-3 w-3" />Copy address</Button>
                <Button size="sm" variant="ghost" asChild><a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" />Test in preview</a></Button></div>
            </div>}
            <p className="text-xs text-muted-foreground">Students enrolled: <span className="font-mono">{counts.data ?? '—'}</span></p>
          </section>
          <section className="space-y-3 border-t pt-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Step 2 · Create the center admin login</h3>
              <p className="text-xs text-muted-foreground">Check the name and email, then press <span className="font-medium text-foreground">Create login & show password</span>. The password appears right below.</p>
            </div>
            {members.data && members.data.length > 0 && <ul className="text-sm divide-y rounded-md border px-3">{members.data.map(m => <li key={m.id} className="py-2 flex justify-between items-center gap-2"><span>{m.display_name} <span className="text-xs text-muted-foreground">{m.email}</span></span><span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{m.role === 'center_admin' ? 'Admin' : 'Teacher'}{m.active ? '' : ' · off'}</span><Button size="sm" variant="outline" className="h-7 text-xs" disabled={creating} onClick={() => run(async () => { const r = await centerAccounts({ action: 'reset_member_password', institution_id: customer.id, member_id: m.id }); return { email: m.email, temporaryPassword: r.temporaryPassword }; })}>New password</Button></span></li>)}</ul>}
            <form onSubmit={createAdmin} className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="ca-name">Admin name</Label><Input id="ca-name" value={name} onChange={e => setName(e.target.value)} required /></div>
                <div className="space-y-1"><Label htmlFor="ca-email">Admin email</Label><Input id="ca-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              </div>
              <Button type="submit" className="w-full" disabled={creating}><Plus className="h-4 w-4" />{creating ? 'Creating…' : 'Create login & show password'}</Button>
            </form>
            <div id="center-account-result" aria-live="polite">
              {accountError && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{accountError}</p>}
              {cred?.existingAccount && <div className="rounded-md border border-primary/40 bg-muted/50 p-3 text-sm space-y-1"><p className="font-medium text-foreground">Added as center admin</p><p className="text-muted-foreground"><span className="font-mono">{cred.email}</span> already had a login, so no new password was made. They sign in to the center portal with their existing password.</p></div>}
              {cred?.temporaryPassword && <div className="rounded-md border border-primary/40 bg-muted/50 p-3 font-mono text-xs space-y-1"><p className="font-sans font-medium text-foreground">Login created — copy it now, it won't be shown again:</p><p>{cred.email}</p><p className="text-sm font-semibold select-all">{cred.temporaryPassword}</p><Button size="sm" variant="outline" className="h-7 text-xs font-sans" onClick={() => { navigator.clipboard.writeText(`${cred.email}\n${cred.temporaryPassword}`); toast.success('Copied'); }}><Copy className="h-3 w-3" />Copy login</Button></div>}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
