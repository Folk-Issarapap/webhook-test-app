"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function FloatingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div
        className="bg-background/90 pointer-events-none fixed top-4 right-4 z-50 size-10 rounded-full border border-zinc-200/60 shadow-sm dark:border-zinc-800/80"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="bg-background/90 fixed top-4 right-4 z-50 size-10 rounded-full border border-zinc-200/60 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-zinc-300 dark:border-zinc-800/80 dark:hover:border-zinc-700"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="size-4.5" aria-hidden />
      ) : (
        <Moon className="size-4.5" aria-hidden />
      )}
    </Button>
  );
}
