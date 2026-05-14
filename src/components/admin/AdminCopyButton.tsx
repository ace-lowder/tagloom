"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function AdminCopyButton({
  payload,
  label = "Copy JSON",
  ariaLabel,
  iconOnly = false,
}: {
  payload: unknown;
  label?: ReactNode;
  ariaLabel?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const resolvedAriaLabel =
    ariaLabel ?? (typeof label === "string" ? label : "Copy JSON");

  return (
    <Button
      size="sm"
      variant={iconOnly ? "ghost" : "secondary"}
      aria-label={resolvedAriaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className={
        iconOnly
          ? "h-8 w-8 bg-transparent px-0 text-stone-500 hover:bg-orange-100 hover:text-orange-700 focus-visible:bg-orange-100 focus-visible:text-orange-700"
          : undefined
      }
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
