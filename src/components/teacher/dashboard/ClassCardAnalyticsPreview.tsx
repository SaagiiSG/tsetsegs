import { useMemo } from "react";
import { TrendingUp, Target, Sparkles, BarChart3 } from "lucide-react";
import { useTeacherMathAnalytics, DOMAIN_LABEL, type DomainKey } from "@/hooks/useTeacherMathAnalytics";

interface Props {
  batchId: string;
}

const DOMAIN_TONE: Record<DomainKey, string> = {
  algebra: "bg-primary",
  advanced: "bg-accent",
  data: "bg-emerald-500",
  geometry: "bg-orange-500",
  other: "bg-muted-foreground",
};

export function ClassCardAnalyticsPreview({ batchId }: Props) {
  const { data, isLoading } = useTeacherMathAnalytics({
    batchIds: [batchId],
    window: "30d",
    enabled: true,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    return (["algebra", "advanced", "data", "geometry"] as DomainKey[]).map((k) => {
      const d = data.domains.find((x) => x.key === k);
      return {
        key: k,
        label: DOMAIN_LABEL[k],
        accuracy: d ? Math.round(d.accuracy * 100) : 0,
        attempts: d?.attempts ?? 0,
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="mt-5 space-y-2 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-2.5 bg-muted/60 rounded-full" />
        ))}
      </div>
    );
  }

  const hasData = data && data.totalAttempts > 0;

  if (!hasData) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border/60 p-4 text-center">
        <BarChart3 className="h-5 w-5 mx-auto text-muted-foreground/60 mb-1.5" />
        <p className="text-xs text-muted-foreground">Not enough practice data yet</p>
      </div>
    );
  }

  const strong = data!.strongest[0];
  const focus = data!.weakest[0];

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 inline-flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Math domains · last 30 days
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {data!.totalAttempts.toLocaleString()} attempts
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-xs text-muted-foreground truncate">{r.label}</span>
            <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${DOMAIN_TONE[r.key]} rounded-full transition-all`}
                style={{ width: r.attempts ? `${Math.max(3, r.accuracy)}%` : "0%" }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums font-medium">
              {r.attempts ? `${r.accuracy}%` : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {strong && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Strong
            </div>
            <div className="text-xs font-medium truncate mt-0.5">{strong.topic}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {Math.round(strong.accuracy * 100)}% · {strong.attempts}
            </div>
          </div>
        )}
        {focus && (
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-orange-600 dark:text-orange-400 inline-flex items-center gap-1">
              <Target className="h-3 w-3" /> Focus
            </div>
            <div className="text-xs font-medium truncate mt-0.5">{focus.topic}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {Math.round(focus.accuracy * 100)}% · {focus.attempts}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
