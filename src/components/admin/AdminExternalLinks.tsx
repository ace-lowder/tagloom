import { Card } from "@/components/ui/card";
import { BarChart3, Boxes, DollarSign, Gauge, Sparkles } from "lucide-react";
import Link from "next/link";

const items = [
  { key: "supabase", label: "Supabase", icon: Boxes },
  { key: "stripe", label: "Stripe", icon: DollarSign },
  { key: "googleAnalytics", label: "Google Analytics", icon: BarChart3 },
  { key: "vercel", label: "Vercel", icon: Gauge },
  { key: "openai", label: "OpenAI", icon: Sparkles },
] as const;

export default function AdminExternalLinks({
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
      {items.map((item) => {
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
