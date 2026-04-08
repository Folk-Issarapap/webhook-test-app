"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoadingSkeleton() {
  const t = useTranslations("loading");

  return (
    <div
      className="flex min-h-[50vh] flex-col gap-0 md:flex-row md:gap-0"
      aria-busy="true"
      aria-label={t("workspace")}
    >
      <aside className="border-border/60 flex w-full flex-col border-b md:w-104 md:border-b-0 md:border-r">
        <div className="border-border/50 space-y-3 border-b px-4 py-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-3 px-4 py-3">
          <Skeleton className="h-3 w-20" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
        <div className="px-4 pb-3">
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="min-h-0 flex-1 space-y-2 px-3 py-2">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <section className="min-h-[40vh] flex-1 space-y-4 p-6 md:min-h-0">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </section>
    </div>
  );
}
