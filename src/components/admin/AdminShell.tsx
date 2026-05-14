"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Headset, LayoutGrid, MessageCircle, Palette, ShieldCheck, Tags } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import AdminRangeSwitch from "@/components/admin/AdminRangeSwitch";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/usage", label: "Usage", icon: Tags },
  { href: "/admin/feedback", label: "Feedback", icon: MessageCircle },
  { href: "/admin/support", label: "Support", icon: Headset },
  { href: "/admin/health", label: "Health", icon: ShieldCheck },
  { href: "/admin/style", label: "Style", icon: Palette },
];

function pageTitle(pathname: string) {
  const item = navItems.find((entry) => entry.href === pathname);
  if (item) return item.label;
  if (pathname.startsWith("/admin/")) return pathname.replace("/admin/", "").replace(/-/g, " ");
  return "Overview";
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range");
  const currentTitle = pageTitle(pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-lower text-ink">
      <aside className="hidden h-full w-64 flex-col border-r border-line px-4 py-4 lg:flex">
        <BrandMark href="/admin" />
        <nav className="mt-6 grid gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const params = new URLSearchParams();
            if (range) params.set("range", range);
            const href = params.toString() ? `${item.href}?${params.toString()}` : item.href;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-orange-100 text-orange-800"
                    : "text-ink-weak hover:bg-surface hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-hidden p-0 lg:p-2">
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-0 border-line bg-surface lg:rounded-xl lg:border">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <h1 className="text-lg font-semibold capitalize">{currentTitle}</h1>
            <AdminRangeSwitch />
          </header>
          <main className={cn("min-h-0 flex-1 overflow-auto", pathname === "/admin/style" ? "p-0" : "px-4 py-5")}>{children}</main>
        </div>
      </div>
    </div>
  );
}
