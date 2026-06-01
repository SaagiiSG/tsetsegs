import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

type Stats = {
  considered: number;
  migrated: number;
  skipped_no_password: number;
  skipped_bad_phone: number;
  relinked_existing: number;
  errors: Array<{ id: string; phone: string; error: string }>;
  dry_run: boolean;
};

/**
 * One-shot admin utility for Phase 2 of the student → Supabase Auth migration.
 * Idempotent: safe to run multiple times. Only acts on accounts where
 * `auth_user_id` is still NULL.
 */
export function StudentAuthMigrationPanel() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const refreshPending = async () => {
    const { count } = await supabase
      .from('student_accounts')
      .select('id', { count: 'exact', head: true })
      .is('auth_user_id', null);
    setPendingCount(count ?? 0);
  };

  const run = async (dryRun: boolean) => {
    setRunning(true);
    setStats(null);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-students-to-auth', {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      setStats(data as Stats);
      await refreshPending();
      toast({
        title: dryRun ? 'Dry run complete' : 'Migration complete',
        description: `${(data as Stats).migrated} accounts ${dryRun ? 'would be' : ''} migrated.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Migration failed',
        description: err?.message ?? 'Unknown error',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          Student Auth Migration (Phase 2)
        </CardTitle>
        <CardDescription>
          Imports existing students into Supabase Auth (phone + bcrypt). Idempotent —
          only touches accounts that haven't been migrated yet. Run a dry run first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Unmigrated accounts:</span>
          <Badge variant="outline">{pendingCount ?? '—'}</Badge>
          <Button size="sm" variant="ghost" onClick={refreshPending} disabled={running}>
            Check
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={running} onClick={() => run(true)}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Dry run
          </Button>
          <Button disabled={running} onClick={() => run(false)}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Run migration
          </Button>
        </div>

        {stats && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono space-y-1">
            <div>considered: <b>{stats.considered}</b></div>
            <div>migrated: <b>{stats.migrated}</b> {stats.dry_run && '(dry run)'}</div>
            <div>relinked existing auth user: <b>{stats.relinked_existing}</b></div>
            <div>skipped (no password set yet): <b>{stats.skipped_no_password}</b></div>
            <div>skipped (bad phone format): <b>{stats.skipped_bad_phone}</b></div>
            {stats.errors.length > 0 && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" /> {stats.errors.length} errors
                </div>
                {stats.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-destructive/80">
                    {e.phone}: {e.error}
                  </div>
                ))}
                {stats.errors.length > 10 && <div>… and {stats.errors.length - 10} more</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
