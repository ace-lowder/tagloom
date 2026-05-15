"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DESKTOP_NAV_LABEL_CLASS,
  DESKTOP_NAV_LINK_CLASS,
  MOBILE_NAV_LINK_CLASS,
  type NavLink,
} from "./siteNavConfig";

type DesktopNavLinksProps = {
  links: NavLink[];
  onSectionClick: (sectionId: string) => void;
  onSupportClick: () => void;
  onRouteClick: () => void;
};

type MobileNavLinksProps = {
  links: NavLink[];
  onSectionClick: (sectionId: string) => void;
  onSupportClick: () => void;
  onRouteClick: () => void;
};

type PrimaryNavActionProps = {
  onClick: () => void;
  mobile?: boolean;
};

export function DesktopNavLinks({
  links,
  onSectionClick,
  onSupportClick,
  onRouteClick,
}: DesktopNavLinksProps) {
  return (
    <div className="hidden items-center gap-7 md:flex">
      {links.map((link) => {
        if (link.type === "section") {
          return (
            <button
              key={link.label}
              type="button"
              onClick={() => onSectionClick(link.href)}
              className={`group ${DESKTOP_NAV_LINK_CLASS}`}
            >
              <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
            </button>
          );
        }

        if (link.href === "/support") {
          return (
            <button
              key={link.label}
              type="button"
              onClick={onSupportClick}
              className={`group ${DESKTOP_NAV_LINK_CLASS}`}
            >
              <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={link.label}
            href={link.href}
            onClick={onRouteClick}
            className={`group ${DESKTOP_NAV_LINK_CLASS}`}
          >
            <span className={DESKTOP_NAV_LABEL_CLASS}>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function MobileNavLinks({
  links,
  onSectionClick,
  onSupportClick,
  onRouteClick,
}: MobileNavLinksProps) {
  return (
    <div className="space-y-1">
      {links.map((link) => {
        if (link.type === "section") {
          return (
            <button
              key={link.label}
              type="button"
              onClick={() => onSectionClick(link.href)}
              className={MOBILE_NAV_LINK_CLASS}
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
              onClick={onSupportClick}
              className={MOBILE_NAV_LINK_CLASS}
            >
              {link.label}
            </button>
          );
        }

        return (
          <Link
            key={link.label}
            href={link.href}
            onClick={onRouteClick}
            className={MOBILE_NAV_LINK_CLASS}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PrimaryNavAction({ onClick, mobile = false }: PrimaryNavActionProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      size={mobile ? undefined : "sm"}
      className={
        mobile
          ? "mt-3 w-full rounded-lg py-2.5 shadow-[0_3px_14px_rgba(249,115,22,0.3)]"
          : "rounded-lg px-4 py-2 shadow-[0_3px_14px_rgba(249,115,22,0.3)]"
      }
    >
      Get Tags
    </Button>
  );
}
