"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyUrlButtonProps = {
  url: string;
  label?: string;
};

export function CopyUrlButton({ url, label }: CopyUrlButtonProps) {
  const t = useTranslations("common");
  const resolvedLabel = label ?? t("copyUrl");
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
      variant="default"
      size="sm"
      className="shrink-0 gap-1.5 text-xs"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="size-3.5" aria-hidden />
          {t("copied")}
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden />
          {resolvedLabel}
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
export function CopyTextButton({ text, label }: CopyTextButtonProps) {
  const t = useTranslations("common");
  const resolvedLabel = label ?? t("copy");
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
          {t("copied")}
        </>
      ) : (
        <>
          <Copy className="size-3" aria-hidden />
          {resolvedLabel}
        </>
      )}
    </Button>
  );
}
