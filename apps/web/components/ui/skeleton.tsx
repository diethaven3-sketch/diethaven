import clsx from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton-shimmer rounded-md bg-gray-200/80 dark:bg-gray-700/50",
        className,
      )}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  showHeader = true,
}: {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full overflow-hidden">
      {showHeader && (
        <div className="flex border-b border-gray-200 bg-surface px-6 py-3.5">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="flex-1 px-2">
              <Skeleton className="h-4 w-3/4 max-w-[100px]" />
            </div>
          ))}
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="flex items-center px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div key={`cell-${r}-${c}`} className="flex-1 px-2">
                <Skeleton
                  className={clsx(
                    "h-4",
                    c === 0 ? "w-4/5 max-w-[140px]" : "w-3/5 max-w-[90px]",
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
