import * as React from "react";

import { cn } from "@/lib/utils";

// === Components ===

export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-testid="spinner"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current",
        className,
      )}
      {...props}
    />
  );
}
