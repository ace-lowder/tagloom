import * as React from "react";

import { cn } from "@/lib/utils";

// === Components ===

export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-stone-700", className)}
      {...props}
    />
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder-stone-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/35 disabled:bg-stone-50 disabled:text-stone-500",
        className,
      )}
      {...props}
    />
  ),
);
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder-stone-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/35 disabled:bg-stone-50 disabled:text-stone-500",
        className,
      )}
      {...props}
    />
  ),
);
TextArea.displayName = "TextArea";

export function FieldMessage({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { tone?: FieldMessageTone }) {
  return (
    <p
      className={cn("text-xs", toneClasses[tone], className)}
      {...props}
    />
  );
}

// === Constants ===

const toneClasses = {
  neutral: "text-stone-500",
  error: "text-red-700",
  success: "text-green-700",
};

// === Types ===

type FieldMessageTone = "neutral" | "error" | "success";
