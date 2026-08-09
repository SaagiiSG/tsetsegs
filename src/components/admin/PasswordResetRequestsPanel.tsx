import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Loader2, RefreshCw, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ResetRequest {
  id: string;
  student_account_id: string;
  phone_number: string;
  created_at: string;
  studentName?: string;
  batchName?: string | null;
}

interface Props {
  onResolved?: () => void;
}

const last8 = (p: string | null) => (p || '').replace(/\D/g, '').slice(-8);

export function PasswordResetRequestsPanel({ onResolved }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('id, student_account_id, phone_number, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: ResetRequest[] = data || [];

      // Enrich with student name / class where we can match by phone
      await Promise.all(
        rows.map(async (r) => {
          const tail = last8(r.phone_number);
          if (!tail) return;
          const { data: students } = await supabase
            .from('students')
            .select('first_name, last_name, batches(batch_name)')
            .ilike('phone', `%${tail}`)
            .limit(1);
          const s: any = students?.[0];
          if (s) {
            r.studentName = [s.first_name, s.last_name].filter(Boolean).join(' ');
            r.batchName = s.batches?.batch_name ?? null;
          }
        }),
      );

      setRequests(rows);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const resolve = async (req: ResetRequest, approve: boolean) => {
    setBusyId(req.id);
    try {
      if (approve) {
        const { error: acctError } = await supabase
          .from('student_accounts')
          .update({ password_hash: null, password_set_at: null })
          .eq('id', req.student_account_id);
        if (acctError) throw acctError;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('password_reset_requests')
        .update({
          status: approve ? 'approved' : 'dismissed',
          resolved_at: new Date().toISOString(),
          resolved_by: userData?.user?.id ?? null,
        })
        .eq('id', req.id);
      if (error) throw error;

      toast({
        title: approve ? 'Reset approved' : 'Request dismissed',
        description: approve
          ? `${req.studentName || req.phone_number} can now set a new password on next login.`
          : undefined,
      });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      if (approve) onResolved?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && requests.length === 0) return null;

  return (
    <Card className="border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-4 w-4 text-primary" />
            Reset requests
            {requests.length > 0 && <Badge variant="default">{requests.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Students who asked for a password reset. Approving clears their password so they set a new
            one at next login.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && requests.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests...
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate font-medium">
                  {req.studentName || 'Unlinked account'}{' '}
                  <span className="font-mono text-sm text-muted-foreground">{req.phone_number}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {req.batchName ? `${req.batchName} · ` : ''}
                  requested {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolve(req, false)}
                  disabled={busyId === req.id}
                >
                  <X className="mr-1 h-4 w-4" />
                  Dismiss
                </Button>
                <Button size="sm" onClick={() => resolve(req, true)} disabled={busyId === req.id}>
                  {busyId === req.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Approve reset
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
