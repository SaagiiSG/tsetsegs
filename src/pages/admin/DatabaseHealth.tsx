import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, RefreshCw, HardDrive, Activity, Cable, FileClock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Health = {
  generated_at: string;
  db_size: { bytes: number; pretty: string }[] | { error: string };
  connections: { active: number; max_connections: number }[] | { error: string };
  activity: { deadlocks: number; rolled_back: number; committed: number; temp_files: number; temp_bytes: number }[] | { error: string };
  wal_size: { bytes: number; pretty: string }[] | { error: string };
  top_tables: { table_name: string; total_bytes: number; total_pretty: string; row_estimate: number }[] | { error: string };
};

function first<T>(v: T[] | { error: string } | undefined): T | null {
  if (!v || 'error' in (v as any)) return null;
  return (v as T[])[0] ?? null;
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.min(100, Math.round((n / d) * 100));
}

function tone(percent: number) {
  if (percent >= 85) return 'text-red-500';
  if (percent >= 70) return 'text-amber-500';
  return 'text-emerald-500';
}

export default function DatabaseHealth() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-db-health');
      if (error) throw error;
      setData(data as Health);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load health snapshot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const dbSize = first<{ bytes: number; pretty: string }>(data?.db_size as any);
  const conn = first<{ active: number; max_connections: number }>(data?.connections as any);
  const act = first<{ deadlocks: number; rolled_back: number; committed: number; temp_files: number; temp_bytes: number }>(data?.activity as any);
  const wal = first<{ bytes: number; pretty: string }>(data?.wal_size as any);
  const tables = Array.isArray(data?.top_tables) ? (data!.top_tables as any[]) : [];

  const connPct = conn ? pct(conn.active, conn.max_connections) : 0;
  const largestBytes = useMemo(() => tables.reduce((m, t) => Math.max(m, Number(t.total_bytes ?? 0)), 0), [tables]);

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" /> Database Health
            </h1>
            <p className="text-sm text-muted-foreground">
              Live snapshot of the Lovable Cloud database powering this project.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data?.generated_at && (
              <span className="text-xs text-muted-foreground">
                Refreshed {new Date(data.generated_at).toLocaleTimeString()}
              </span>
            )}
            <Button onClick={load} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<HardDrive className="h-4 w-4" />}
            label="Database size"
            value={dbSize?.pretty ?? '—'}
            hint="Total bytes on disk used by all tables, indexes, and metadata in this Postgres database."
          />
          <MetricCard
            icon={<Cable className="h-4 w-4" />}
            label="Active connections"
            value={conn ? `${conn.active} / ${conn.max_connections}` : '—'}
            hint="Number of live client connections vs Postgres' hard connection limit. Rising near the max causes timeouts."
            progress={connPct}
            toneClass={tone(connPct)}
          />
          <MetricCard
            icon={<FileClock className="h-4 w-4" />}
            label="WAL size"
            value={wal?.pretty ?? '—'}
            hint="Write-ahead log — Postgres' crash-recovery buffer. Large values are fine; sustained growth is a warning sign."
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Deadlocks (since boot)"
            value={act ? String(act.deadlocks) : '—'}
            hint="Cumulative deadlocks since the database last restarted. A handful is normal; growth between refreshes is a warning."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatBox label="Committed txns" value={act?.committed} hint="Successful transactions since the last database restart." />
          <StatBox label="Rolled-back txns" value={act?.rolled_back} hint="Transactions that failed and rolled back since restart. Small numbers are normal." />
          <StatBox label="Temp files" value={act?.temp_files} hint="Times Postgres spilled a query's working set to disk. Frequent temp files hint at unindexed or memory-heavy queries." />
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <HardDrive className="h-4 w-4" /> Top 15 tables by size
            </h2>
            <span className="text-xs text-muted-foreground">
              Includes indexes and TOAST storage
            </span>
          </div>
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No data.</p>
          ) : (
            <div className="space-y-2">
              {tables.map((t) => {
                const p = pct(Number(t.total_bytes ?? 0), largestBytes);
                return (
                  <div key={t.table_name} className="flex items-center gap-3 text-sm">
                    <div className="w-56 truncate font-mono">{t.table_name}</div>
                    <Progress value={p} className="flex-1 h-2" />
                    <div className="w-20 text-right">{t.total_pretty}</div>
                    <div className="w-24 text-right text-xs text-muted-foreground">
                      ~{Number(t.row_estimate ?? 0).toLocaleString()} rows
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4 bg-muted/40">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Reading the numbers</p>
              <p className="text-muted-foreground">
                Green means comfortable, amber (~70%) is worth watching, red (~85%+) needs action.
                Memory and disk saturation are shown at the Lovable Cloud level and aren't exposed to
                Postgres — check the Cloud overview page for those.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function MetricCard({
  icon, label, value, hint, progress, toneClass,
}: {
  icon: React.ReactNode; label: string; value: string; hint: string;
  progress?: number; toneClass?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="p-4 cursor-help">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            {icon}<span>{label}</span>
          </div>
          <div className={`text-2xl font-semibold ${toneClass ?? ''}`}>{value}</div>
          {typeof progress === 'number' && (
            <Progress value={progress} className="h-1.5 mt-3" />
          )}
        </Card>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

function StatBox({ label, value, hint }: { label: string; value: number | undefined; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="p-4 cursor-help">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold mt-1">
            {value === undefined ? '—' : Number(value).toLocaleString()}
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}
