"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { BarChart3, Boxes, Copy, DollarSign, Gauge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// === Components ===

export function AdminCopyButton({
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

export function AdminRowCopyButton({ payload }: { payload: unknown }) {
  return (
    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <AdminCopyButton
        payload={payload}
        label={<Copy className="h-3.5 w-3.5" />}
        ariaLabel="Copy row JSON"
        iconOnly
      />
    </div>
  );
}

export function AdminExportButton({ payload }: { payload: unknown }) {
  return <AdminCopyButton payload={payload} label="Export JSON" ariaLabel="Export JSON" />;
}

export function AdminEmptyState({ message }: { message: string }) {
  return <Card className="p-6 text-sm text-ink-weak">{message}</Card>;
}

export function AdminExternalLinks({
  links,
}: {
  links: {
    supabase: string;
    stripe: string;
    googleAnalytics: string;
    vercel: string;
    openai: string;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {EXTERNAL_LINK_ITEMS.map((item) => {
        const Icon = item.icon;
        const href = links[item.key];

        return (
          <Link key={item.key} href={href} target="_blank" rel="noreferrer">
            <Card className="h-full border-line p-4 transition hover:border-primary/40 hover:shadow-md">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{item.label}</p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

// === Constants ===

const EXTERNAL_LINK_ITEMS = [
  { key: "supabase", label: "Supabase", icon: Boxes },
  { key: "stripe", label: "Stripe", icon: DollarSign },
  { key: "googleAnalytics", label: "Google Analytics", icon: BarChart3 },
  { key: "vercel", label: "Vercel", icon: Gauge },
  { key: "openai", label: "OpenAI", icon: Sparkles },
] as const;
