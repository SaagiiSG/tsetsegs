import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { healthLabels, type InstitutionCustomer } from '@/hooks/useInstitutionCustomers';

export function InstitutionCustomerEditor({ customer, onClose, onSaved }: { customer: InstitutionCustomer | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: customer?.name ?? '', country: customer?.country ?? '', contact_name: customer?.contact_name ?? '', contact_email: customer?.contact_email ?? '', status: customer?.status ?? 'prospect', health: customer?.health ?? 'not_assessed', health_notes: customer?.health_notes ?? '', last_check_in: customer?.last_check_in ?? '', next_check_in: customer?.next_check_in ?? '', notes: customer?.notes ?? '' });
  const [saving, setSaving] = useState(false);
  const field = (key: keyof typeof form, label: string, type = 'text') => <div className="space-y-1.5"><Label htmlFor={key}>{label}</Label><Input id={key} type={type} required={key === 'name'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, name: form.name.trim(), contact_email: form.contact_email.trim(), last_check_in: form.last_check_in || null, next_check_in: form.next_check_in || null };
    const { error } = customer ? await supabase.from('institution_customers').update(payload).eq('id', customer.id) : await supabase.from('institution_customers').insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Customer saved'); onSaved(); onClose();
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl rounded-lg"><DialogHeader><DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle><DialogDescription>International course center</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{field('name', 'Center name')}{field('country', 'Country')}{field('contact_name', 'Contact name')}{field('contact_email', 'Contact email', 'email')}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Status</Label><Select value={form.status} onValueChange={status => setForm({ ...form, status })}><SelectTrigger aria-label="Customer status"><SelectValue /></SelectTrigger><SelectContent>{['prospect', 'onboarding', 'active', 'paused', 'closed'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label>Health</Label><Select value={form.health} onValueChange={health => setForm({ ...form, health })}><SelectTrigger aria-label="Customer health"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(healthLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>{field('last_check_in', 'Last check-in', 'date')}{field('next_check_in', 'Next check-in', 'date')}</div>
      <div className="space-y-1.5"><Label htmlFor="health_notes">Health notes</Label><Textarea id="health_notes" value={form.health_notes} onChange={e => setForm({ ...form, health_notes: e.target.value })} /></div>
      <div className="space-y-1.5"><Label htmlFor="notes">Customer notes</Label><Textarea id="notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save customer'}</Button></div>
    </form></DialogContent></Dialog>;
}