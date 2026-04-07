"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  return (
    <div
      className="space-y-8 md:space-y-9"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <ol className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="border-border flex gap-3 rounded-xl border bg-background px-3 py-3 md:px-4"
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-4 max-w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </section>

      <div className="flex w-full justify-center">
        <div className="border-border bg-muted flex h-auto w-full max-w-md gap-1 rounded-xl border p-1">
          <Skeleton className="min-h-11 flex-1 rounded-md" />
          <Skeleton className="min-h-11 flex-1 rounded-md" />
        </div>
      </div>

      <div className="border-border space-y-4 rounded-xl border bg-background p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex gap-3">
            <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 max-w-xl" />
            </div>
          </div>
          <Skeleton className="h-9 w-full shrink-0 rounded-md sm:ml-auto sm:w-24" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-3 max-w-md" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
