"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CopyUrlButtonProps = {
  url: string;
  label?: string;
  /** Premium row style for ingest URL strip */
  variant?: "default" | "ingest";
};

export function CopyUrlButton({
  url,
  label = "Copy URL",
  variant = "default",
}: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  const ingest = variant === "ingest";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={copied ? true : undefined}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 gap-2 rounded-lg text-xs font-medium transition-all duration-200",
              ingest
                ? "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                : "border border-zinc-200/80 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 opacity-70" aria-hidden />
                {label}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {copied ? (
          <TooltipContent
            side="top"
            sideOffset={6}
            className="border-0 bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Copied to clipboard
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}

type CopyTextButtonProps = {
  text: string;
  label?: string;
};

/** Copy arbitrary text (e.g. headers or body blocks). */
export function CopyTextButton({ text, label = "Copy" }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={copied ? true : undefined}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              void handleCopy();
            }}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 opacity-60" aria-hidden />
                {label}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {copied ? (
          <TooltipContent
            side="top"
            sideOffset={6}
            className="border-0 bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Copied
          </TooltipContent>
        ) : null}
      </Tooltip>
    </TooltipProvider>
  );
}
