import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div className="space-y-1">
        <h1 className="font-chillax text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function StatRow({ stats }: { stats: [string, ReactNode, string?][] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y">
      {stats.map(([label, value, hint]) => (
        <div key={label} className="py-5 px-3 lg:border-r last:border-r-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-2xl mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h2 className="font-chillax text-lg font-semibold">{title}</h2>{actions}</div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6">{children}</p>;
}

export function Loading() {
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

/** Horizontal bar used in analytics lists. */
export function Bar({ value, max }: { value: number; max: number }) {
  return <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/60" style={{ width: `${max ? Math.round((100 * value) / max) : 0}%` }} /></div>;
}
