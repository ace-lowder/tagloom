"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LogOut, User } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AccountType } from "./siteNavConfig";

type PrimaryAction = {
  label: string;
  icon: typeof CreditCard;
  onClick: () => void;
};

type ProfileMenuProps = {
  profileOpen: boolean;
  onToggleProfile: () => void;
  renderProfileCard: (mobile?: boolean) => ReactNode;
  profileMenuRef: RefObject<HTMLDivElement>;
};

type MobileProfileCardProps = {
  hasProfileMenu: boolean;
  renderProfileCard: (mobile?: boolean) => ReactNode;
  onOpenAuthModal: () => void;
};

type AccountTypeBadgeProps = {
  accountType: AccountType;
};

type ProfileCardProps = {
  accountType: AccountType | null;
  avatarInitials: string;
  currentUserEmail: string;
  isAuthResolving: boolean;
  isLoggingOut: boolean;
  mobile?: boolean;
  onPrimaryAction: (() => void) | null;
  onSignOut: () => void;
  primaryAction: PrimaryAction | null;
};

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

export function ProfileMenu({
  profileOpen,
  onToggleProfile,
  profileMenuRef,
  renderProfileCard,
}: ProfileMenuProps) {
  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={profileOpen}
        aria-controls="navbar-profile-menu"
        onClick={onToggleProfile}
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
  );
}

export function MobileProfileCard({
  hasProfileMenu,
  renderProfileCard,
  onOpenAuthModal,
}: MobileProfileCardProps) {
  if (hasProfileMenu) {
    return <>{renderProfileCard(true)}</>;
  }

  return (
    <button
      type="button"
      onClick={onOpenAuthModal}
      className="block w-full rounded-lg border border-stone-200 py-2.5 text-center text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
    >
      Log in
    </button>
  );
}

export function buildPrimaryAction(
  accountType: AccountType | null,
  goToPricing: () => void,
  goToBilling: () => void,
): PrimaryAction | null {
  if (!accountType) return null;

  return {
    label: accountType === "verified" ? "View Plans" : "Manage Plan",
    icon: CreditCard,
    onClick: accountType === "verified" ? goToPricing : goToBilling,
  };
}

export function ProfileCard({
  accountType,
  avatarInitials,
  currentUserEmail,
  isAuthResolving,
  isLoggingOut,
  mobile = false,
  onPrimaryAction,
  onSignOut,
  primaryAction,
}: ProfileCardProps) {
  if (isAuthResolving && !accountType) {
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

  if (!accountType || !primaryAction || !onPrimaryAction) {
    return null;
  }

  const PrimaryIcon = primaryAction.icon;

  return (
    <Card className={mobile ? "border-stone-100 p-4" : "p-4 shadow-xl"}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
          {avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{currentUserEmail}</p>
          {accountType !== "verified" ? <AccountTypeBadge accountType={accountType} /> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Button
          type="button"
          onClick={onPrimaryAction}
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
}

function AccountTypeBadge({ accountType }: AccountTypeBadgeProps) {
  return (
    <span
      className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ring-1 ${ACCOUNT_TYPE_STYLES[accountType]}`}
    >
      {ACCOUNT_TYPE_LABELS[accountType]}
    </span>
  );
}
