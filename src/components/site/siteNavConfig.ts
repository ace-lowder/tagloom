export type NavLink = {
  label: string;
  href: string;
  type: "section" | "route";
};

export type AccountType = "verified" | "monthly" | "yearly";

export const NAV_LINKS: NavLink[] = [
  { label: "Features", href: "features", type: "section" },
  { label: "Pricing", href: "pricing", type: "section" },
  { label: "Blog", href: "/blog", type: "route" },
  { label: "Support", href: "/support", type: "route" },
  { label: "FAQ", href: "faq", type: "section" },
];

export const DESKTOP_NAV_LINK_CLASS =
  "-m-2 px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900";

export const DESKTOP_NAV_LABEL_CLASS =
  "relative pb-0.5 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-[250ms] group-hover:after:scale-x-100";

export const MOBILE_NAV_LINK_CLASS =
  "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50";
