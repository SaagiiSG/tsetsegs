import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        {/* Attendance tracker skeleton */}
        <div className="mt-3 flex gap-0.5">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-3 rounded-sm" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-6">
        {/* Session tracking skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Practice tests skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Notes skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </Card>
  );
}

export function StudentCardsLoadingSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="hidden lg:block w-64 border-r bg-card/50 p-4 space-y-2">
        <Skeleton className="h-6 w-32 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 flex-1" />
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-2 w-2 rounded-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <StudentCardSkeleton />
        </div>
      </div>
    </div>
  );
}
