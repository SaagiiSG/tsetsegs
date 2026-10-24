import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const ROLE_LABEL: Record<string, string> = { center_admin: 'Center admin', teacher: 'Teacher' };

/** Requests center staff send with "Contact FlowersOS"; each one also emails the owner. */
export default function SupportRequests() {
  const [filter, setFilter] = useState<'open' | 'closed'>('open'), [page, setPage] = useState(0), [busy, setBusy] = useState<string | null>(null);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['support-requests', filter, page],
    queryFn: async () => {
      const { data, error, count } = await supabase.from('support_requests').select('*, institution_customers(name)', { count: 'exact' })
        .eq('status', filter).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const setStatus = async (id: string, status: 'open' | 'closed') => {
    setBusy(id);
    const { error } = await supabase.from('support_requests').update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null }).eq('id', id);
    setBusy(null);
    if (error) { toast.error('Could not update request'); return; }
    // Also refreshes the open count on the sidebar badge.
    await cache.invalidateQueries({ queryKey: ['support-requests'] });
    toast.success(status === 'closed' ? 'Marked closed' : 'Reopened');
  };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-chillax text-3xl font-semibold">Support requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">Messages from center staff. Reply by email, then mark them closed.</p>
      </header>
      <Tabs value={filter} onValueChange={v => { setFilter(v as 'open' | 'closed'); setPage(0); }}>
        <TabsList><TabsTrigger value="open">Open</TabsTrigger><TabsTrigger value="closed">Closed</TabsTrigger></TabsList>
      </Tabs>
      {query.isLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
        : query.error ? <div role="alert"><p className="text-destructive">Could not load support requests.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div>
        : !query.data?.rows.length ? (
          <div className="border-y py-16 text-center">
            <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-semibold">No {filter} requests</h2>
            <p className="mt-2 text-sm text-muted-foreground">Requests from the center portals appear here.</p>
          </div>
        ) : (
          <div className="divide-y border-y">{query.data.rows.map(r => (
            <article key={r.id} className="space-y-2 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold break-words">{r.subject}</h2>
                <Badge variant="outline">{r.institution_customers?.name ?? 'Deleted center'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground break-words">
                {r.name} · {ROLE_LABEL[r.role] ?? r.role} · {r.email} · {new Date(r.created_at).toLocaleString()}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{r.message}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject}`)}`}><Mail className="h-4 w-4" />Reply by email</a>
                </Button>
                <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => setStatus(r.id, r.status === 'open' ? 'closed' : 'open')}>
                  {r.status === 'open' ? 'Mark closed' : 'Reopen'}
                </Button>
              </div>
            </article>
          ))}</div>
        )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{query.data?.count ?? 0} {filter} requests</span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="outline" disabled={(page + 1) * 20 >= (query.data?.count ?? 0)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
