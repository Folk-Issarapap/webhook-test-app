"use client";

import type { ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
  children = "Create your endpoint",
}: OpenWorkspaceButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      size={size}
      className={
        className ??
        "bg-primary text-primary-foreground hover:bg-primary-hover " +
          "shadow-sm hover:shadow-md transition-all duration-200 " +
          "font-medium px-6"
      }
      onClick={() => {
        router.push("/webhook");
      }}
    >
      {children}
      <ArrowRight className="ml-2 w-4 h-4" />
    </Button>
  );
}
