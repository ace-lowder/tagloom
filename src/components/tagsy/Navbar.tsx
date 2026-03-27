"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CreditCard,
  LogOut,
  Menu,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import { useAuthController } from "@/components/auth/AuthController";
import { sanitizeNextPath } from "@/lib/authModal";
import { triggerGeneratorCta } from "@/lib/generatorCta";
import type { CurrentUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavLink = {
  label: string;
  href: string;
  type: "section" | "route";
};

type NavbarProps = {
  currentUser: CurrentUser | null;
};

type AccountType = "unverified" | "verified" | "monthly" | "yearly";

const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "features", type: "section" },
  { label: "Pricing", href: "pricing", type: "section" },
  { label: "Blog", href: "/blog", type: "route" },
  { label: "Support", href: "/support", type: "route" },
  { label: "FAQ", href: "faq", type: "section" },
];

const DESKTOP_NAV_LINK_CLASS =
  "relative pb-0.5 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-250 hover:after:scale-x-100";
const MOBILE_NAV_LINK_CLASS =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50";
const PROFILE_ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-400/90 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-900";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  unverified: "Unverified",
  verified: "Verified",
  monthly: "Monthly",
  yearly: "Yearly",
};

const ACCOUNT_TYPE_STYLES: Record<AccountType, string> = {
  unverified: "bg-amber-100 text-amber-800 ring-amber-200",
  verified: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  monthly: "bg-sky-100 text-sky-800 ring-sky-200",
  yearly: "bg-violet-100 text-violet-800 ring-violet-200",
};

export default function Navbar({ currentUser }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { openAuthModal } = useAuthController();
  const supabase = createSupabaseBrowserClient();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const closeAllMenus = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  const startGeneratorFlow = () => {
    setProfileOpen(false);
    triggerGeneratorCta({
      isHomePage: pathname === "/",
      navigateHome: () => router.push("/"),
    });
  };

  const goToSection = (sectionId: string) => {
    closeAllMenus();

    if (pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(`/#${sectionId}`);
  };

  const goToPricing = () => {
    closeAllMenus();

    if (pathname === "/") {
      const el = document.getElementById("pricing");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    router.push("/#pricing");
  };

  const goToBilling = () => {
    closeAllMenus();
    router.push("/billing");
  };

  const goToSupport = () => {
    closeAllMenus();

    if (pathname === "/support") {
      dispatchSupportReset();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/support");
  };

  const onSignOut = async () => {
    const nextTarget = getLogoutNextPath(pathname || "/");
    const loginHref = `/login?next=${encodeURIComponent(nextTarget)}`;

    if (!supabase) {
      router.push(loginHref);
      return;
    }

    setIsLoggingOut(true);
    closeAllMenus();
    await supabase.auth.signOut();
    router.push(loginHref);
    router.refresh();
    setIsLoggingOut(false);
  };

  useEffect(() => {
    if (!profileOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [profileOpen]);

  const accountType = currentUser ? resolveAccountType(currentUser) : null;
  const displayEmail = currentUser?.email || "Account";
  const avatarInitials = getAvatarInitials(currentUser?.email ?? null);

  const primaryAction = !accountType
    ? null
    : accountType === "unverified"
      ? {
          label: "Verify",
          icon: ShieldAlert,
          onClick: () => {
            closeAllMenus();
            openAuthModal({
              mode: "login",
              source: "profile_verify",
              next: pathname || "/",
            });
          },
        }
      : {
          label: accountType === "verified" ? "View Plans" : "Manage Plan",
          icon: CreditCard,
          onClick: accountType === "verified" ? goToPricing : goToBilling,
        };
  const hasProfileMenu = Boolean(currentUser && accountType && primaryAction);

  const renderProfileCard = (mobile = false) => {
    if (!currentUser || !accountType || !primaryAction) return null;
    const PrimaryIcon = primaryAction.icon;

    return (
      <div
        className={
          mobile
            ? "p-0"
            : "rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
        }
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-200 to-stone-300 text-sm font-semibold text-stone-700">
            {avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">
              {displayEmail}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ACCOUNT_TYPE_STYLES[accountType]}`}
            >
              <span className="relative top-px">
                {ACCOUNT_TYPE_LABELS[accountType]}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={primaryAction.onClick}
            className={PROFILE_ACTION_BUTTON_CLASS}
          >
            <PrimaryIcon className="h-3.5 w-3.5" />
            <span className="relative top-px">{primaryAction.label}</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isLoggingOut}
            className={`${PROFILE_ACTION_BUTTON_CLASS} disabled:opacity-60`}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="relative top-px">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderNavLink = (link: NavLink, mobile = false) => {
    const className = mobile ? MOBILE_NAV_LINK_CLASS : DESKTOP_NAV_LINK_CLASS;

    if (link.type === "section") {
      return (
        <button
          key={link.label}
          type="button"
          onClick={() => goToSection(link.href)}
          className={className}
        >
          {link.label}
        </button>
      );
    }

    if (link.href === "/support") {
      return (
        <button
          key={link.label}
          type="button"
          onClick={goToSupport}
          className={className}
        >
          {link.label}
        </button>
      );
    }

    return (
      <Link
        key={link.label}
        href={link.href}
        onClick={closeAllMenus}
        className={className}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <BrandMark href="/" size="nav" className="flex-shrink-0" />

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => renderNavLink(link))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {hasProfileMenu ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-controls="navbar-profile-menu"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                <User className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {profileOpen ? (
                  <motion.div
                    id="navbar-profile-menu"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    className="absolute right-0 top-[calc(100%+10px)] z-[70] w-72"
                  >
                    {renderProfileCard()}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
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
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex h-[calc(100dvh-73px)] flex-col border-b border-stone-100 bg-white px-5 pb-5 pt-2 md:hidden"
          >
            <div className="space-y-1">
              {NAV_LINKS.map((link) => renderNavLink(link, true))}
              <button
                onClick={() => {
                  startGeneratorFlow();
                  setMobileOpen(false);
                }}
                className="mt-3 w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 py-2.5 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Get Tags
              </button>
            </div>

            <div className="mt-auto flex flex-col gap-3 pt-5">
              {hasProfileMenu ? (
                renderProfileCard(true)
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

function dispatchSupportReset() {
  window.dispatchEvent(new CustomEvent("tagloom:support-reset"));
}

function resolveAccountType(currentUser: CurrentUser): AccountType {
  if (
    currentUser.subscriptionActive &&
    currentUser.subscriptionTier === "yearly"
  ) {
    return "yearly";
  }
  if (
    currentUser.subscriptionActive &&
    currentUser.subscriptionTier === "monthly"
  ) {
    return "monthly";
  }
  if (!currentUser.emailVerified) {
    return "unverified";
  }
  return "verified";
}

function getAvatarInitials(email: string | null) {
  const initials = (email ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return initials || "AC";
}

function getLogoutNextPath(pathname: string) {
  const currentPath =
    typeof window === "undefined"
      ? pathname
      : `${window.location.pathname}${window.location.search}`;
  const safePath = sanitizeNextPath(currentPath);
  if (safePath === "/login" || safePath.startsWith("/login?")) {
    return "/";
  }
  return safePath;
}
