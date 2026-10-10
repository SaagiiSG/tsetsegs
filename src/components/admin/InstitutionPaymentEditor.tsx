import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { InstitutionCustomer } from '@/hooks/useInstitutionCustomers';

export function InstitutionPaymentEditor({ customers, onClose, onSaved }: { customers: InstitutionCustomer[]; onClose: () => void; onSaved: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [due, setDue] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving || !customerId || Number(amount) <= 0) return;
    setSaving(true);
    const { error } = await supabase.from('institution_payment_dues').insert({ customer_id: customerId, amount: Number(amount), currency, due_date: due, description });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Payment due added'); onSaved(); onClose();
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>Add payment due</DialogTitle><DialogDescription>Record a customer payment deadline.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
    <div className="space-y-1.5"><Label>Customer</Label><Select value={customerId} onValueChange={setCustomerId} required><SelectTrigger aria-label="Payment customer"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div><div className="space-y-1.5"><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger aria-label="Payment currency"><SelectValue /></SelectTrigger><SelectContent>{['USD', 'CAD', 'EUR', 'GBP', 'MNT'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-1.5"><Label htmlFor="due_date">Due date</Label><Input id="due_date" type="date" required value={due} onChange={e => setDue(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="description">Description</Label><Input id="description" value={description} onChange={e => setDescription(e.target.value)} /></div>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || !customerId}>{saving ? 'Saving…' : 'Save payment due'}</Button></div>
  </form></DialogContent></Dialog>;
}