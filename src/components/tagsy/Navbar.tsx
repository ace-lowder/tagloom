"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import { useAuthController } from "@/components/auth/AuthController";
import { triggerGeneratorCta } from "@/lib/generatorCta";
import type { CurrentUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavLink = {
  label: string;
  href: string;
  type: "section" | "route";
};

const navLinks: NavLink[] = [
  { label: "Features", href: "features", type: "section" },
  { label: "Pricing", href: "pricing", type: "section" },
  { label: "Blog", href: "/blog", type: "route" },
  { label: "Support", href: "/support", type: "route" },
  { label: "FAQ", href: "faq", type: "section" },
];

function dispatchSupportReset() {
  window.dispatchEvent(new CustomEvent("tagloom:support-reset"));
}

type NavbarProps = {
  currentUser: CurrentUser | null;
};

export default function Navbar({ currentUser }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { openAuthModal } = useAuthController();
  const supabase = createSupabaseBrowserClient();

  const startGeneratorFlow = () => {
    triggerGeneratorCta({
      isHomePage: pathname === "/",
      navigateHome: () => router.push("/"),
    });
  };

  const goToSection = (sectionId: string) => {
    setMobileOpen(false);

    if (pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(`/#${sectionId}`);
  };

  const goToSupport = () => {
    setMobileOpen(false);

    if (pathname === "/support") {
      dispatchSupportReset();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/support");
  };

  const onSignOut = async () => {
    if (!supabase) {
      router.push("/login");
      return;
    }

    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/");
    router.refresh();
    setIsLoggingOut(false);
  };

  const renderSectionLink = (label: string, sectionId: string, mobile = false) => {
    const classes = mobile
      ? "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
      : "relative pb-0.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-250 hover:after:scale-x-100";

    return (
      <button
        key={label}
        type="button"
        onClick={() => goToSection(sectionId)}
        className={classes}
      >
        {label}
      </button>
    );
  };

  const renderRouteLink = (label: string, href: string, mobile = false) => {
    const classes = mobile
      ? "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
      : "relative pb-0.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-250 hover:after:scale-x-100";

    if (href === "/support") {
      return (
        <button
          key={label}
          type="button"
          onClick={goToSupport}
          className={classes}
        >
          {label}
        </button>
      );
    }

    return (
      <Link key={label} href={href} onClick={() => setMobileOpen(false)} className={classes}>
        {label}
      </Link>
    );
  };

  const renderNavLink = (link: NavLink, mobile = false) => {
    if (link.type === "section") {
      return renderSectionLink(link.label, link.href, mobile);
    }
    return renderRouteLink(link.label, link.href, mobile);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <BrandMark href="/" size="nav" className="flex-shrink-0" />

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => renderNavLink(link))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {currentUser ? (
            <>
              <span className="text-sm font-medium text-stone-600">
                {currentUser.fullName || currentUser.email || "Account"}
              </span>
              <button
                onClick={onSignOut}
                disabled={isLoggingOut}
                className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() =>
                openAuthModal({
                  mode: "login",
                  source: "navbar",
                  next: pathname || "/",
                })
              }
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              Log in
            </button>
          )}
          <button
            onClick={startGeneratorFlow}
            className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
          >
            Get Tags
          </button>
        </div>

        <button
          className="rounded-lg p-2 transition-colors hover:bg-stone-100 md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-stone-700" />
          ) : (
            <Menu className="h-5 w-5 text-stone-700" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-1 border-b border-stone-100 bg-white px-5 pb-5 pt-2 md:hidden"
          >
            {navLinks.map((link) => renderNavLink(link, true))}
            <div className="flex flex-col gap-2 pt-3">
              {currentUser ? (
                <button
                  onClick={onSignOut}
                  disabled={isLoggingOut}
                  className="w-full rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openAuthModal({
                      mode: "login",
                      source: "navbar_mobile",
                      next: pathname || "/",
                    });
                  }}
                  className="block w-full rounded-lg border border-stone-200 py-2.5 text-center text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Log in
                </button>
              )}
              <button
                onClick={() => {
                  startGeneratorFlow();
                  setMobileOpen(false);
                }}
                className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Get Tags
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
