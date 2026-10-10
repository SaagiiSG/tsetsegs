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
  const [cred, setCred] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const members = useQuery({
    queryKey: ['center-members', customer.id],
    queryFn: async () => (await supabase.from('tenant_members').select('*').eq('institution_id', customer.id).order('created_at')).data ?? [],
  });
  const counts = useQuery({
    queryKey: ['center-counts', customer.id],
    queryFn: async () => (await supabase.from('tenant_students').select('id', { count: 'exact', head: true }).eq('institution_id', customer.id)).count ?? 0,
  });
  useEffect(() => { if (!customer.slug) setSlug(customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)); }, [customer]);

  const valid = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) && !['www', 'app', 'admin', 'api'].includes(slug);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('institution_customers').update({ slug, portal_enabled: enabled }).eq('id', customer.id);
    setSaving(false);
    if (error) return toast.error(error.code === '23505' ? 'That address is already taken.' : error.message);
    toast.success('Portal saved'); onSaved();
  };
  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { setCred(await centerAccounts({ action: 'create_member', institution_id: customer.id, role: 'center_admin', name, email })); members.refetch(); }
    catch (err) { toast.error((err as Error).message); }
  };
  const url = centerPortalUrl(slug || 'your-center');
  const previewUrl = `${window.location.origin}/?center=${slug}`;

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Portal · {customer.name}</DialogTitle><DialogDescription>Separate login and data for this center's admins, teachers and students.</DialogDescription></DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="space-y-1"><Label htmlFor="slug">Web address</Label>
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
            <h3 className="text-sm font-medium">Center admins & teachers</h3>
            <ul className="text-sm divide-y">{members.data?.map(m => <li key={m.id} className="py-2 flex justify-between gap-2"><span>{m.display_name} <span className="text-xs text-muted-foreground">{m.email}</span></span><span className="text-xs text-muted-foreground">{m.role === 'center_admin' ? 'Admin' : 'Teacher'}{m.active ? '' : ' · off'}</span></li>)}</ul>
            <form onSubmit={createAdmin} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
              <div className="space-y-1"><Label htmlFor="ca-name">Name</Label><Input id="ca-name" value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label htmlFor="ca-email">Email</Label><Input id="ca-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <Button><Plus className="h-4 w-4" />Center admin</Button>
            </form>
            {cred && <div className="rounded-md border p-3 font-mono text-xs space-y-1"><p className="font-sans text-muted-foreground">Share once — not shown again:</p><p>{cred.email}</p><p>{cred.temporaryPassword}</p></div>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
