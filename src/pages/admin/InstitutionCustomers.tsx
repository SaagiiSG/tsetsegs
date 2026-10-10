import { useState } from 'react';
import { Building2, Plus, Search, Pencil, Check, RotateCcw, Globe } from 'lucide-react';
import { CenterPortalSetup } from '@/components/admin/CenterPortalSetup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInstitutionCustomers, healthLabels, healthStyles, localToday, money, type InstitutionCustomer, type InstitutionPayment } from '@/hooks/useInstitutionCustomers';
import { InstitutionCustomerEditor } from '@/components/admin/InstitutionCustomerEditor';
import { InstitutionPaymentEditor } from '@/components/admin/InstitutionPaymentEditor';

export default function InstitutionCustomers() {
  const { customers, payments, isLoading, error, refresh } = useInstitutionCustomers();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<InstitutionCustomer | null | undefined>(undefined);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [portalFor, setPortalFor] = useState<InstitutionCustomer | null>(null);
  const today = localToday();
  const unpaid = payments.filter(p => !p.paid_at);
  const balances = unpaid.reduce<Record<string, number>>((totals, p) => ({ ...totals, [p.currency]: (totals[p.currency] ?? 0) + Number(p.amount) }), {});
  const filtered = customers.filter(c => `${c.name} ${c.country} ${c.contact_name} ${c.contact_email}`.toLowerCase().includes(search.toLowerCase()));
  const ids = new Set(filtered.map(c => c.id));
  async function togglePaid(p: InstitutionPayment) {
    if (busy) return;
    setBusy(p.id);
    const { error } = await supabase.from('institution_payment_dues').update({ paid_at: p.paid_at ? null : new Date().toISOString() }).eq('id', p.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(p.paid_at ? 'Payment reopened' : 'Payment marked paid'); refresh();
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground mb-1">Business / International</p><h1 className="text-2xl font-semibold font-chillax">Customers</h1></div><div className="flex gap-2"><Button variant="outline" disabled={!customers.length || isLoading} onClick={() => setPaymentOpen(true)}><Plus />Payment due</Button><Button onClick={() => setEditor(null)}><Plus />Add customer</Button></div></header>
    {error ? <div className="border rounded-lg p-4 flex items-center gap-3"><p className="text-sm text-destructive">Could not load customer records.</p><Button variant="outline" onClick={() => refresh()}>Retry</Button></div> : isLoading ? <p role="status" className="py-10 text-muted-foreground">Loading customers…</p> : <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-y py-5"><Metric label="Course centers" value={String(customers.length)} /><Metric label="Needs attention" value={String(customers.filter(c => c.health === 'watch' || c.health === 'at_risk').length)} /><Metric label="Overdue payments" value={String(unpaid.filter(p => p.due_date < today).length)} /><Metric label="Outstanding" value={Object.entries(balances).map(([currency, amount]) => money(amount, currency)).join(' · ') || '—'} /></div>
    <Tabs defaultValue="centers"><div className="flex flex-wrap justify-between gap-3 items-center"><TabsList><TabsTrigger value="centers">Centers</TabsTrigger><TabsTrigger value="payments">Payments <span className="ml-2 text-muted-foreground">{unpaid.length}</span></TabsTrigger></TabsList><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search customers" placeholder="Search customers…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div></div>
    <TabsContent value="centers" className="mt-4"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground border-b"><tr>{['Course center', 'Status', 'Health', 'Next check-in', 'Next payment', 'Portal', ''].map((h, i) => <th key={i} className="py-3 px-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y">{filtered.map(c => {
      const next = unpaid.find(p => p.customer_id === c.id);
      return <tr key={c.id} className="hover:bg-muted/40"><td className="px-3 py-4 min-w-48"><Button variant="link" className="h-auto p-0 font-medium text-foreground" onClick={() => setEditor(c)}>{c.name}</Button><p className="text-xs text-muted-foreground mt-1">{[c.country, c.contact_name].filter(Boolean).join(' · ')}</p>{c.health_notes && <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate" title={c.health_notes}>{c.health_notes}</p>}</td><td className="px-3 py-4 capitalize">{c.status}</td><td className="px-3 py-4"><span className={`inline-block whitespace-nowrap text-xs rounded px-2 py-1 ${healthStyles[c.health]}`}>{healthLabels[c.health]}</span></td><td className={`px-3 py-4 whitespace-nowrap font-mono text-xs ${c.next_check_in && c.next_check_in < today ? 'text-status-watch' : 'text-muted-foreground'}`}>{c.next_check_in || '—'}</td><td className="px-3 py-4 whitespace-nowrap">{next ? <><p className="font-mono text-xs">{money(Number(next.amount), next.currency)}</p><p className={`text-xs mt-1 ${next.due_date < today ? 'text-status-risk' : 'text-muted-foreground'}`}>{next.due_date < today ? 'Overdue · ' : ''}{next.due_date}</p></> : '—'}</td><td className="px-3 py-4"><Button variant="outline" size="sm" onClick={() => setPortalFor(c)}><Globe />{c.portal_enabled && c.slug ? c.slug : 'Set up'}</Button></td><td><Button variant="ghost" size="icon" title="Edit customer" aria-label={`Edit ${c.name}`} onClick={() => setEditor(c)}><Pencil /></Button></td></tr>;
    })}</tbody></table></div>{!filtered.length && <Empty text={customers.length ? 'No matching customers.' : 'No international customers yet.'} />}</TabsContent>
    <TabsContent value="payments" className="mt-4"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted-foreground border-b"><tr>{['Customer', 'Description', 'Amount', 'Due date', 'Status', ''].map((h, i) => <th key={i} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody className="divide-y">{payments.filter(p => ids.has(p.customer_id)).map(p => <tr key={p.id}><td className="px-3 py-4">{customers.find(c => c.id === p.customer_id)?.name}</td><td className="px-3 py-4 text-muted-foreground">{p.description || '—'}</td><td className="px-3 py-4 font-mono whitespace-nowrap">{money(Number(p.amount), p.currency)}</td><td className="px-3 py-4 whitespace-nowrap font-mono text-xs">{p.due_date}</td><td className="px-3 py-4"><span className={`text-xs rounded px-2 py-1 whitespace-nowrap ${p.paid_at ? healthStyles.healthy : p.due_date < today ? healthStyles.at_risk : healthStyles.not_assessed}`}>{p.paid_at ? 'Paid' : p.due_date < today ? 'Overdue' : p.due_date === today ? 'Due today' : 'Upcoming'}</span></td><td className="px-3"><Button variant="outline" size="sm" disabled={busy !== null} onClick={() => togglePaid(p)}>{p.paid_at ? <RotateCcw /> : <Check />}{busy === p.id ? 'Saving…' : p.paid_at ? 'Reopen' : 'Mark paid'}</Button></td></tr>)}</tbody></table></div>{!payments.filter(p => ids.has(p.customer_id)).length && <Empty text="No payment records." />}</TabsContent>
    </Tabs></>}
    {editor !== undefined && <InstitutionCustomerEditor customer={editor} onClose={() => setEditor(undefined)} onSaved={refresh} />}
    {portalFor && <CenterPortalSetup customer={portalFor} onClose={() => setPortalFor(null)} onSaved={() => { refresh(); setPortalFor(null); }} />}
    {paymentOpen && <InstitutionPaymentEditor customers={customers} onClose={() => setPaymentOpen(false)} onSaved={refresh} />}
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-muted-foreground mb-2">{label}</p><p className="text-xl font-mono font-medium break-words">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="flex flex-col items-center py-14 gap-3 text-muted-foreground"><Building2 className="h-6 w-6" /><p className="text-sm">{text}</p></div>; }