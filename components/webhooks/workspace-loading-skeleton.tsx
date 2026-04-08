"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="space-y-6 md:space-y-7" aria-busy="true" aria-label="Loading workspace">
      <div className="flex w-full">
        <div className="flex h-auto w-full max-w-xs gap-2 rounded-full border border-zinc-200/50 bg-zinc-100/60 p-1 dark:border-zinc-800/50 dark:bg-zinc-900/40">
          <Skeleton className="min-h-10 flex-1 rounded-full" />
          <Skeleton className="min-h-10 flex-1 rounded-full" />
        </div>
      </div>

      <div className="flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-zinc-200/50 bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.03)] lg:min-h-[300px] lg:flex-row dark:border-zinc-800/50 dark:bg-zinc-950/20 dark:shadow-none">
        <div className="flex w-full flex-col border-b border-zinc-200/50 lg:w-[280px] lg:shrink-0 lg:border-r lg:border-b-0 dark:border-zinc-800/50">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/50 p-4 dark:border-zinc-800/50">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-xl" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
            <Skeleton className="size-9 shrink-0 rounded-xl" />
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-5 p-5 md:p-7">
          <div className="space-y-3 border-b border-zinc-200/50 pb-5 dark:border-zinc-800/50">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3 max-w-md rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl md:h-36" />
          <Skeleton className="h-24 w-full rounded-2xl md:h-28" />
        </div>
      </div>
    </div>
  );
}
