import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { fmtDate } from '@/partner/status';

type Application = { id: string; name: string; email: string; kind: string; link: string | null; country: string | null; message: string | null; status: 'new' | 'approved' | 'declined'; created_at: string };
type Partner = { id: string; name: string; email: string; kind: string; code: string; paused: boolean; created_at: string; signed_up: number; paid_yearly: number; owed_cents: number; paid_cents: number };
type Earning = { id: string; partner_name: string; code: string; paid_at: string; due_at: string; status: 'pending' | 'void' | 'paid'; amount_cents: number; paid_marked_at: string | null };
type Missing = { partner_name: string; code: string; signed_up: string };
type AdminData = { applications: Application[]; partners: Partner[]; earnings: Earning[]; missing: Missing[] };
type Res<T> = PromiseLike<{ data: T | null; error: { message?: string } | null }>;
// The partner RPCs and function aren't in the generated types yet, so a narrow cast like src/partner/PartnerDashboard.tsx.
type Api = { rpc: <T>(fn: string, args?: object) => Res<T>; functions: { invoke: (fn: string, o: { body: object }) => Res<{ sent?: boolean; alreadySent?: boolean }> } };
const api = supabase as unknown as Api;

const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
const errText = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong');
const call = async (fn: string, args?: object) => { const { error } = await api.rpc(fn, args); if (error) throw error; };

export default function Partners() {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState<Application | null>(null);
  const [code, setCode] = useState('');
  const [paying, setPaying] = useState<Earning | null>(null);
  const query = useQuery({ queryKey: ['partners-admin'], queryFn: async () => { const { data, error } = await api.rpc<AdminData>('partner_admin_data'); if (error) throw error; return data as AdminData; } });
  const refresh = () => cache.invalidateQueries({ queryKey: ['partners-admin'] });

  // One wrapper so every action disables the buttons while it runs, toasts the raised message as-is, and refreshes.
  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try { await job(); } catch (e) { toast.error(errText(e)); } finally { setBusy(false); await refresh(); }
  };

  const welcome = async (partnerId: string): Promise<void> => {
    const { error } = await api.functions.invoke('partner-welcome', { body: { partner_id: partnerId } });
    if (error) toast.error('Approved, but the email failed. Try Resend.', { action: { label: 'Resend', onClick: () => void run(() => welcome(partnerId)) } });
    else toast.success('Approved. Welcome email sent.');
  };

  const approve = (a: Application) => run(async () => {
    const { data, error } = await api.rpc<string>('approve_partner_application', { _id: a.id, _code: code });
    if (error) throw error;
    setApproving(null);
    await welcome(data as string);
  });

  const decline = (a: Application) => run(async () => { await call('decline_partner_application', { _id: a.id }); toast.success('Declined'); });
  const pause = (p: Partner, paused: boolean) => run(async () => { await call('set_partner_paused', { _partner: p.id, _paused: paused }); toast.success(paused ? `${p.name} paused` : `${p.name} active again`); });
  const markPaid = (e: Earning) => run(async () => { await call('partner_mark_paid', { _earning: e.id }); setPaying(null); toast.success('Marked as paid'); });

  const d = query.data;
  const now = Date.now();
  const pending = d?.earnings.filter(e => e.status === 'pending') ?? [];
  const due = pending.filter(e => new Date(e.due_at).getTime() <= now);
  const coming = pending.filter(e => new Date(e.due_at).getTime() > now);
  const paid = d?.earnings.filter(e => e.status === 'paid') ?? [];
  const newApps = d?.applications.filter(a => a.status === 'new') ?? [];

  const earningRow = (e: Earning, action?: React.ReactNode) => (
    <li key={e.id} className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-medium break-words">{e.partner_name} <span className="text-sm text-muted-foreground">({e.code})</span></p>
        <p className="text-sm text-muted-foreground">{usd(e.amount_cents)} · student paid {fmtDate(e.paid_at)} · {e.status === 'paid' && e.paid_marked_at ? `marked paid ${fmtDate(e.paid_marked_at)}` : `due ${fmtDate(e.due_at)}`}</p>
      </div>
      {action}
    </li>
  );
  const empty = (text: string) => <p className="border-y py-8 text-center text-sm text-muted-foreground">{text}</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-chillax text-3xl font-semibold">Partners</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review applications, pause partners, and mark each $10 paid once it is due.</p>
      </header>
      {query.isLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        : query.error || !d ? <div role="alert" className="space-y-3"><p className="text-destructive">Could not load partners.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>
        : (
          <Tabs defaultValue="applications">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="applications">Applications{newApps.length ? ` (${newApps.length})` : ''}</TabsTrigger>
              <TabsTrigger value="partners">Partners</TabsTrigger>
              <TabsTrigger value="payouts">Payouts{due.length ? ` (${due.length})` : ''}</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-4">
              {!d.applications.length ? <div className="border-y py-16 text-center"><Handshake className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">No applications yet</h2></div>
                : <ul className="divide-y border-y">{d.applications.map(a => (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold break-words">{a.name}</h2><Badge variant="outline" className="capitalize">{a.kind}</Badge><Badge variant={a.status === 'new' ? 'default' : 'secondary'} className="capitalize">{a.status}</Badge></div>
                      <p className="text-sm text-muted-foreground break-all"><a href={`mailto:${a.email}`}>{a.email}</a> · {a.country || 'No country'} · {fmtDate(a.created_at)}</p>
                      {a.link && <p className="text-sm break-all">{a.link}</p>}
                      {a.message && <p className="text-sm whitespace-pre-wrap break-words">{a.message}</p>}
                    </div>
                    {a.status === 'new' && (
                      <div className="flex gap-2">
                        <Button disabled={busy} onClick={() => { setCode(''); setApproving(a); }}><Check className="h-4 w-4" />Approve</Button>
                        <Button variant="outline" disabled={busy} onClick={() => decline(a)}><X className="h-4 w-4" />No</Button>
                      </div>
                    )}
                  </li>
                ))}</ul>}
            </TabsContent>

            <TabsContent value="partners" className="mt-4">
              {!d.partners.length ? empty('No partners yet.') : <ul className="divide-y border-y">{d.partners.map(p => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold break-words">{p.name}</h2><Badge variant="outline" className="capitalize">{p.kind}</Badge><code className="text-sm">{p.code}</code></div>
                    <p className="mt-1 text-sm text-muted-foreground break-all">{p.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.signed_up} signed up · {p.paid_yearly} paid yearly · owed {usd(p.owed_cents)} · paid {usd(p.paid_cents)}</p>
                  </div>
                  <div className="flex items-center gap-2"><Switch id={`pause-${p.id}`} checked={p.paused} disabled={busy} onCheckedChange={v => pause(p, v)} /><Label htmlFor={`pause-${p.id}`}>Pause</Label></div>
                </li>
              ))}</ul>}
            </TabsContent>

            <TabsContent value="payouts" className="mt-4 space-y-6">
              {d.missing.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Yearly payments we did not record</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 list-disc pl-5">{d.missing.map((m, i) => <li key={i}>{m.partner_name} ({m.code}): a student who signed up {fmtDate(m.signed_up)} is on a yearly plan with no $10 recorded.</li>)}</ul>
                  </AlertDescription>
                </Alert>
              )}
              <section><h2 className="mb-2 font-semibold">Due now</h2>
                {due.length ? <ul className="divide-y border-y">{due.map(e => earningRow(e, <Button disabled={busy} onClick={() => setPaying(e)}>Mark paid</Button>))}</ul> : empty('Nothing is due.')}
              </section>
              <section><h2 className="mb-2 font-semibold">Coming up</h2>
                {coming.length ? <ul className="divide-y border-y">{coming.map(e => earningRow(e))}</ul> : empty('Nothing coming up.')}
              </section>
              <section><h2 className="mb-2 font-semibold">Paid</h2>
                {paid.length ? <ul className="divide-y border-y">{paid.map(e => earningRow(e))}</ul> : empty('Nothing paid yet.')}
              </section>
            </TabsContent>
          </Tabs>
        )}

      <Dialog open={!!approving} onOpenChange={o => { if (!o && !busy) setApproving(null); }}>
        <DialogContent>
          <form onSubmit={ev => { ev.preventDefault(); if (approving && !busy) void approve(approving); }} className="space-y-4">
            <DialogHeader><DialogTitle>Approve {approving?.name}</DialogTitle><DialogDescription>Pick their code, 3 to 20 letters or numbers. Their link will be flowersos.co/solo?ref=CODE.</DialogDescription></DialogHeader>
            <div className="space-y-2"><Label htmlFor="partner-code">Code</Label><Input id="partner-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={20} autoComplete="off" autoFocus placeholder="BRODY" /></div>
            <DialogFooter><Button type="button" variant="ghost" disabled={busy} onClick={() => setApproving(null)}>Cancel</Button><Button type="submit" disabled={busy || code.trim().length < 3}>Approve and send email</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paying} onOpenChange={o => { if (!o && !busy) setPaying(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Mark {paying ? usd(paying.amount_cents) : ''} to {paying?.partner_name} as paid?</AlertDialogTitle><AlertDialogDescription>Only do this after you have sent the money. It cannot be undone here.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={ev => { ev.preventDefault(); if (paying) void markPaid(paying); }}>Mark paid</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
