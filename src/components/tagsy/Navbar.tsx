"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LogOut, Menu, User, X } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import { useAuthController } from "@/components/auth/AuthController";
import { AUTH_SUCCESS_EVENT, sanitizeNextPath } from "@/lib/authModal";
import { triggerGeneratorCta } from "@/lib/generatorCta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type AccountType = "verified" | "monthly" | "yearly";

const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "features", type: "section" },
  { label: "Pricing", href: "pricing", type: "section" },
  { label: "Blog", href: "/blog", type: "route" },
  { label: "Support", href: "/support", type: "route" },
  { label: "FAQ", href: "faq", type: "section" },
];

const DESKTOP_NAV_LINK_CLASS =
  "-m-2 px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900";
const DESKTOP_NAV_LABEL_CLASS =
  "relative pb-0.5 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-[250ms] group-hover:after:scale-x-100";
const MOBILE_NAV_LINK_CLASS =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  verified: "Verified",
  monthly: "Monthly",
  yearly: "Yearly",
};

const ACCOUNT_TYPE_STYLES: Record<AccountType, string> = {
  verified: "bg-green-100 text-green-700 ring-green-200",
  monthly: "bg-blue-100 text-blue-700 ring-blue-200",
  yearly: "bg-red-100 text-red-700 ring-red-200",
};

export default function Navbar({ currentUser }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthResolving, setIsAuthResolving] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { openAuthModal } = useAuthController();
  const supabase = createSupabaseBrowserClient();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const authResolvingTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (currentUser) {
      setIsAuthResolving(false);
      if (authResolvingTimeoutRef.current) {
        window.clearTimeout(authResolvingTimeoutRef.current);
        authResolvingTimeoutRef.current = null;
      }
      return;
    }

    const onAuthSuccess = () => {
      setIsAuthResolving(true);
      if (authResolvingTimeoutRef.current) {
        window.clearTimeout(authResolvingTimeoutRef.current);
      }
      authResolvingTimeoutRef.current = window.setTimeout(() => {
        setIsAuthResolving(false);
        authResolvingTimeoutRef.current = null;
      }, 7000);
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => {
      if (authResolvingTimeoutRef.current) {
        window.clearTimeout(authResolvingTimeoutRef.current);
        authResolvingTimeoutRef.current = null;
      }
      window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    };
  }, [currentUser, pathname]);

  const accountType = currentUser ? resolveAccountType(currentUser) : null;
  const displayEmail = currentUser?.email || "Account";
  const avatarInitials = getAvatarInitials(currentUser?.email ?? null);

  const primaryAction = !accountType
    ? null
    : {
        label: accountType === "verified" ? "View Plans" : "Manage Plan",
        icon: CreditCard,
        onClick: accountType === "verified" ? goToPricing : goToBilling,
      };
  const hasProfileMenu = Boolean(
    (currentUser && accountType && primaryAction) || isAuthResolving,
  );

  const renderProfileCard = (mobile = false) => {
    if (isAuthResolving && !currentUser) {
      return (
        <Card className={mobile ? "border-stone-100 p-4" : "p-4 shadow-xl"}>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-orange-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
            </div>
          </div>
          <div className="mt-4 h-9 animate-pulse rounded-xl bg-stone-100" />
        </Card>
      );
    }

    if (!currentUser || !accountType || !primaryAction) return null;
    const PrimaryIcon = primaryAction.icon;

    return (
      <Card className={mobile ? "border-stone-100 p-4" : "p-4 shadow-xl"}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
            {avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">
              {displayEmail}
            </p>
            {accountType !== "verified" ? (
              <span
                className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ring-1 ${ACCOUNT_TYPE_STYLES[accountType]}`}
              >
                {ACCOUNT_TYPE_LABELS[accountType]}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button
            type="button"
            onClick={primaryAction.onClick}
            variant="secondary"
            size="md"
            className="px-3 py-2.5"
          >
            <PrimaryIcon className="h-3.5 w-3.5" />
            <span>{primaryAction.label}</span>
          </Button>
          <Button
            type="button"
            onClick={onSignOut}
            variant="secondary"
            size="md"
            isLoading={isLoggingOut}
            loadingLabel="Logging out"
            className="px-3 py-2.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </Button>
        </div>
      </Card>
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
          className={mobile ? className : `group ${className}`}
        >
          {mobile ? (
            link.label
          ) : (
            <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
          )}
        </button>
      );
    }

    if (link.href === "/support") {
      return (
        <button
          key={link.label}
          type="button"
          onClick={goToSupport}
          className={mobile ? className : `group ${className}`}
        >
          {mobile ? (
            link.label
          ) : (
            <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
          )}
        </button>
      );
    }

    return (
      <Link
        key={link.label}
        href={link.href}
        onClick={closeAllMenus}
        className={mobile ? className : `group ${className}`}
      >
        {mobile ? (
          link.label
        ) : (
          <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
        )}
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
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-600"
              >
                <User className="h-4 w-4" aria-hidden="true" />
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
                  source: "navbar",
                  next: pathname || "/",
                })
              }
              className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              Log in
            </button>
          )}
          <Button
            type="button"
            onClick={startGeneratorFlow}
            size="sm"
            className="rounded-lg px-4 py-2 shadow-[0_3px_14px_rgba(249,115,22,0.3)]"
          >
            Get Tags
          </Button>
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
              <Button
                type="button"
                onClick={() => {
                  startGeneratorFlow();
                  setMobileOpen(false);
                }}
                className="mt-3 w-full rounded-lg py-2.5 shadow-[0_3px_14px_rgba(249,115,22,0.3)]"
              >
                Get Tags
              </Button>
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
