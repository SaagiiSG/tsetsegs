import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Skeleton primitives for the customer student portal (sky system, docs/design/student-sky.md §15.2). */

export function SkyCardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('sky-card space-y-4', className)} aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded-full" />
          <Skeleton className="h-3 w-1/2 rounded-full" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 rounded-full" style={{ width: `${88 - i * 14}%` }} />
      ))}
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

export function SkyLineSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-4 rounded-full', className)} aria-busy="true" />;
}

export function SkyListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-3/5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Home-page shaped skeleton: goal ring + set cards row, then a wide card. */
export function SkyHomeSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 rounded-full" />
        <Skeleton className="h-5 w-48 rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkyCardSkeleton lines={2} />
        <SkyCardSkeleton lines={2} />
        <SkyCardSkeleton lines={2} />
        <SkyCardSkeleton lines={2} />
      </div>
      <SkyCardSkeleton lines={2} />
      <div className="grid gap-4 lg:grid-cols-4">
        <SkyCardSkeleton className="lg:col-span-2" lines={2} />
        <SkyCardSkeleton lines={2} />
        <SkyCardSkeleton lines={2} />
      </div>
    </div>
  );
}
