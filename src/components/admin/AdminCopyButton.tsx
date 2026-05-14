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
      variant="secondary"
      aria-label={resolvedAriaLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(JSON.stringify(payload));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className={iconOnly ? "h-8 w-8 px-0" : undefined}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
