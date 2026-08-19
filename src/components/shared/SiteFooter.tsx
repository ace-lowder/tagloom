"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandMark from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";

function dispatchSupportReset() {
  window.dispatchEvent(new CustomEvent("updatetags:support-reset"));
}

type SiteFooterProps = {
  flushTop?: boolean;
};

export default function SiteFooter({ flushTop = false }: SiteFooterProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <footer className={cn("border-t border-stone-200 bg-white px-5 py-6", !flushTop && "mt-8")}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
        <BrandMark
          href="/"
          size="footer"
          className="justify-self-center sm:justify-self-start"
        />

        <div className="flex items-center justify-center gap-7 text-sm text-stone-400">
          <Link
            href="/privacy"
            className="transition-colors hover:text-stone-700"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-stone-700"
          >
            Terms
          </Link>
          {pathname === "/support" ? (
            <button
              type="button"
              onClick={() => {
                dispatchSupportReset();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="transition-colors hover:text-stone-700"
            >
              Support
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/support")}
              className="transition-colors hover:text-stone-700"
            >
              Support
            </button>
          )}
        </div>

        <p className="justify-self-center text-xs text-stone-400 sm:justify-self-end">
          © 2026 UpdateTags. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
