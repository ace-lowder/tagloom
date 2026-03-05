"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";

type NavLink = {
  label: string;
  href: string;
};

const navLinks: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Support", href: "/support" },
  { label: "FAQ", href: "#faq" },
];

function scrollToGenerator() {
  document
    .getElementById("generator")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setMobileOpen(false);
  };

  const renderNavLink = (link: NavLink, mobile = false) => {
    const classes = mobile
      ? "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
      : "text-sm font-medium text-stone-600 transition-colors hover:text-stone-900";

    if (link.href.startsWith("#")) {
      return (
        <a
          key={link.label}
          href={link.href}
          onClick={(e) => handleNavClick(e, link.href)}
          className={classes}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.label}
        href={link.href}
        onClick={() => setMobileOpen(false)}
        className={classes}
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
          {navLinks.map((link) => renderNavLink(link))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900">
            Log in
          </button>
          <button
            onClick={scrollToGenerator}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              boxShadow: "0 3px 14px rgba(249,115,22,0.3)",
            }}
          >
            Try Free
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
              <button className="w-full rounded-lg border border-stone-200 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
                Log in
              </button>
              <button
                onClick={() => {
                  scrollToGenerator();
                  setMobileOpen(false);
                }}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                }}
              >
                Try Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
