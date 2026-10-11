import { useMemo } from "react";
import { TrendingUp, Target, Sparkles, BarChart3 } from "lucide-react";
import { useTeacherMathAnalytics, DOMAIN_LABEL, type DomainKey } from "@/hooks/useTeacherMathAnalytics";

interface Props {
  batchId: string;
}

/* Domain bars stay monochrome — the accuracy number carries the meaning. */
const BAR_TONE = "bg-foreground/70";

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
      <div className="space-y-2 animate-pulse">
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-foreground/65 inline-flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Math domains · last 30 days
          </div>
          <span className="text-[11px] text-foreground/70 tabular-nums">needs more data</span>
        </div>

        <div className="space-y-1.5">
          {(["algebra", "advanced", "data", "geometry"] as DomainKey[]).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs text-foreground/60 truncate">{DOMAIN_LABEL[k]}</span>
              <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-full" style={{ width: "8%" }} />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-foreground/60">—</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-xl border border-border/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-foreground/65 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Strong
            </div>
            <div className="text-xs font-medium text-foreground/55 truncate mt-0.5">—</div>
            <div className="text-[10px] text-foreground/50 tabular-nums">—</div>
          </div>
          <div className="rounded-xl border border-border/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-foreground/65 inline-flex items-center gap-1">
              <Target className="h-3 w-3" /> Focus
            </div>
            <div className="text-xs font-medium text-foreground/55 truncate mt-0.5">—</div>
            <div className="text-[10px] text-foreground/50 tabular-nums">—</div>
          </div>
        </div>
      </div>
    );
  }

  const strong = data!.strongest[0];
  const focus = data!.weakest[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-foreground/65 inline-flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Math domains · last 30 days
        </div>
        <span className="text-[11px] text-foreground/55 tabular-nums">
          {data!.totalAttempts.toLocaleString()} attempts
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-xs text-foreground/70 truncate">{r.label}</span>
            <div className="relative flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${BAR_TONE} rounded-full transition-all`}
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
          <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-foreground/60 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Strong
            </div>
            <div className="text-xs font-medium truncate mt-0.5">{strong.topic}</div>
            <div className="text-[10px] text-foreground/55 tabular-nums">
              {Math.round(strong.accuracy * 100)}% · {strong.attempts}
            </div>
          </div>
        )}
        {focus && (
          <div className="rounded-xl bg-muted/40 border border-border/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-foreground/60 inline-flex items-center gap-1">
              <Target className="h-3 w-3" /> Focus
            </div>
            <div className="text-xs font-medium truncate mt-0.5">{focus.topic}</div>
            <div className="text-[10px] text-foreground/55 tabular-nums">
              {Math.round(focus.accuracy * 100)}% · {focus.attempts}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
