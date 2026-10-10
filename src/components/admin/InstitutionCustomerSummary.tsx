import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstitutionCustomers, localToday, healthLabels, healthStyles } from '@/hooks/useInstitutionCustomers';

export function InstitutionCustomerSummary() {
  const { customers, payments, isLoading, error, refresh } = useInstitutionCustomers();
  const today = localToday();
  const overdue = payments.filter(p => !p.paid_at && p.due_date < today);
  return <section className="border-y py-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold flex gap-2 items-center"><Building2 className="h-4 w-4 text-muted-foreground" />International customers</h2><Button variant="ghost" size="sm" asChild><Link to="/admin/customers">View customers<ArrowUpRight className="h-4 w-4" /></Link></Button></div>
    {isLoading ? <p className="text-sm text-muted-foreground">Loading customers…</p> : error ? <div className="flex gap-3 items-center"><p className="text-sm text-destructive">Customer data unavailable.</p><Button variant="outline" size="sm" onClick={() => refresh()}>Retry</Button></div> : <>
    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><span><strong className="font-mono">{customers.length}</strong> <span className="text-muted-foreground">centers</span></span><span><strong className="font-mono">{customers.filter(c => c.health === 'at_risk').length}</strong> <span className="text-muted-foreground">at risk</span></span><span><strong className={`font-mono ${overdue.length ? 'text-status-risk' : ''}`}>{overdue.length}</strong> <span className="text-muted-foreground">overdue payments</span></span></div>
    {customers.length === 0 ? <p className="text-sm text-muted-foreground">No international customers yet.</p> : <div className="divide-y">{customers.slice(0, 3).map(c => <Link key={c.id} to="/admin/customers" className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/40"><span className="truncate">{c.name}</span><span className={`text-xs rounded px-2 py-1 shrink-0 ${healthStyles[c.health]}`}>{healthLabels[c.health]}</span></Link>)}</div>}</>}
  </section>;
}