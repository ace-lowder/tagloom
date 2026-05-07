import * as React from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

// === Components ===

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  leftIcon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading = false,
      leftIcon,
      loadingLabel = "Loading...",
      size = "md",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        {...props}
        aria-label={isLoading ? loadingLabel : props["aria-label"]}
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
      >
        <span
          aria-hidden={isLoading ? "true" : undefined}
          className={cn(
            "inline-flex items-center justify-center gap-2",
            isLoading && "invisible",
          )}
        >
          {leftIcon ? <span className="inline-flex flex-none">{leftIcon}</span> : null}
          {children}
        </span>

        {isLoading ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 inline-flex items-center justify-center gap-2"
          >
            <Spinner className="h-4 w-4" />
            <span>{loadingLabel}</span>
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";

// === Constants ===

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-3 text-sm",
};

const variantClasses = {
  primary:
    "bg-gradient-to-br from-primary to-primary-hover text-white shadow-sm shadow-orange-500/20 hover:from-primary-hover hover:to-primary-hover disabled:hover:from-primary disabled:hover:to-primary-hover",
  secondary:
    "border border-line bg-surface text-ink hover:border-primary/50 hover:bg-surface-hover",
  ghost: "text-ink-weak hover:bg-surface-hover hover:text-ink",
  danger:
    "border border-red-200 bg-white text-danger hover:border-danger hover:bg-red-50",
};

// === Types ===

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";
