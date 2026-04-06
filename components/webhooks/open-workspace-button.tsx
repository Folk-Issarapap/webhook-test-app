"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type OpenWorkspaceButtonProps = {
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  children?: React.ReactNode;
};

/** Navigates to `/webhook` (workspace cookie + D1 provision first catcher on load). */
export function OpenWorkspaceButton({
  size = "lg",
  className,
  children = "Open webhook workspace",
}: OpenWorkspaceButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size={size}
      className={className}
      onClick={() => {
        router.push("/webhook");
      }}
    >
      {children}
    </Button>
  );
}
