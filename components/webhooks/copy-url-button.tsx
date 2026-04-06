"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyUrlButtonProps = {
  url: string;
  label?: string;
};

export function CopyUrlButton({ url, label = "Copy URL" }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0 gap-2 font-mono text-xs"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden />
      
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
       
        </>
      )}
    </Button>
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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-7 shrink-0 gap-1 px-2 text-[11px]"
      onClick={(e) => {
        e.stopPropagation();
        void handleCopy();
      }}
    >
      {copied ? (
        <>
          <Check className="size-3" aria-hidden />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}
