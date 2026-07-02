"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import BrandMark from "@/components/brand/BrandMark";
import { useAuthController } from "@/components/auth/AuthController";
import { AUTH_SUCCESS_EVENT, sanitizeNextPath } from "@/lib/authModal";
import { triggerGeneratorCta } from "@/lib/generatorCta";
import type { CurrentUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildPrimaryAction,
  DesktopNavLinks,
  MobileNavLinks,
  MobileProfileCard,
  NAV_LINKS,
  PrimaryNavAction,
  ProfileCard,
  ProfileMenu,
  type AccountType,
} from "@/components/site/SiteNavParts";

// === Types ===

type SiteNavProps = {
  currentUser: CurrentUser | null;
};

// === Components ===

export default function SiteNav({ currentUser }: SiteNavProps) {
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

  const goToPlans = () => {
    closeAllMenus();

    if (pathname === "/") {
      const el = document.getElementById("plans");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    router.push("/#plans");
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

  const primaryAction = buildPrimaryAction(accountType, goToPlans, goToBilling);

  const hasProfileMenu = Boolean(
    (currentUser && accountType && primaryAction) || isAuthResolving,
  );

  const renderProfileCard = (mobile = false) => (
    <ProfileCard
      accountType={accountType}
      avatarInitials={avatarInitials}
      currentUserEmail={displayEmail}
      isAuthResolving={isAuthResolving && !currentUser}
      isLoggingOut={isLoggingOut}
      mobile={mobile}
      onPrimaryAction={primaryAction?.onClick ?? null}
      onSignOut={onSignOut}
      primaryAction={primaryAction}
    />
  );

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <BrandMark href="/" size="nav" className="flex-shrink-0" />

        <DesktopNavLinks
          links={NAV_LINKS}
          onSectionClick={goToSection}
          onSupportClick={goToSupport}
          onRouteClick={closeAllMenus}
        />

        <div className="hidden items-center gap-4 md:flex">
          {hasProfileMenu ? (
            <ProfileMenu
              profileOpen={profileOpen}
              onToggleProfile={() => setProfileOpen((open) => !open)}
              profileMenuRef={profileMenuRef}
              renderProfileCard={renderProfileCard}
            />
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

          <PrimaryNavAction onClick={startGeneratorFlow} />
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
            <MobileNavLinks
              links={NAV_LINKS}
              onSectionClick={goToSection}
              onSupportClick={goToSupport}
              onRouteClick={closeAllMenus}
            />

            <PrimaryNavAction
              mobile
              onClick={() => {
                startGeneratorFlow();
                setMobileOpen(false);
              }}
            />

            <div className="mt-auto flex flex-col gap-3 pt-5">
              <MobileProfileCard
                hasProfileMenu={hasProfileMenu}
                renderProfileCard={renderProfileCard}
                onOpenAuthModal={() => {
                  setMobileOpen(false);
                  openAuthModal({
                    source: "navbar_mobile",
                    next: pathname || "/",
                  });
                }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}

// === Helpers ===

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
