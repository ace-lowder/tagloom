import type { DemoFixture, DemoTimings } from "./generatorTypes";

// === Constants ===

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    title:
      "Personalized Birthflower Ring – Dainty Stacking Floral Ring, Meaningful Gift for Bridesmaids, Mother’s Day Gift, US 3–12",
    tags: {
      target: [
        "birth flower ring",
        "personalized ring",
        "floral stacking ring",
        "dainty ring",
        "gift for bridesmaids",
        "mothers day gift",
        "meaningful jewelry",
        "handmade ring",
      ],
      discovery: [
        "unique gift for mom",
        "custom birth flower",
        "dainty stacking ring",
        "handmade floral ring",
        "floral jewelry gift",
      ],
    },
  },
  {
    title:
      "8oz Essential Oil Soy Wax Candle, Home Decor, Gift For Her, Clean Burning Candle, Cozy Home Decor, Esthetic Candle, Aromatherapy",
    tags: {
      target: [
        "soy wax candle",
        "essential oil candle",
        "aromatherapy candle",
        "gift for her",
        "home decor candle",
        "clean burning candle",
        "cozy home decor",
      ],
      discovery: [
        "dried flower candle",
        "home fragrance gift",
        "relaxing candle gift",
        "vanilla aromatherapy",
        "pure essential oil",
        "essential oil gift",
      ],
    },
  },
  {
    title:
      "2026 ADHD Planner, ADHD Digital Planner, Goodnotes Planner, iPad Planner, Daily Weekly Monthly Planner, Productivity, Self Care Planner",
    tags: {
      target: [
        "adhd planner",
        "digital planner",
        "goodnotes planner",
        "ipad planner",
        "weekly planner",
        "monthly planner",
        "self care planner",
        "productivity planner",
      ],
      discovery: [
        "goal setting tool",
        "personal organizer",
        "empowering planner",
        "intuitive planner",
        "goodnotes template",
      ],
    },
  },
];

export const DEFAULT_DEMO_TIMINGS: DemoTimings = {
  typingStartDelayMs: 700,
  typingCharMs: 45,
  generatingDelayMs: 450,
  generatingLoadMs: 1500,
  revealStepMs: 80,
  revealTailMs: 300,
  showDwellMs: 3500,
  clearFadeMs: 160,
  clearCollapseMs: 240,
  backspaceCharMs: 9,
  cyclePauseMs: 500,
};

export const CONTEXT_STORAGE_PREFIX = "tagloom:genctx:";
export const TITLE_MAX = 140;
export const DESCRIPTION_MAX = 6000;
export const DEFAULT_TITLE_PLACEHOLDER =
  "e.g. Handmade ceramic coffee mug with minimalist design";
export const USAGE_HINT_CLOSE_DELAY_MS = 500;
export const CTA_SCROLL_CORRECTION_DELAY_MS = 380;
export const HISTORY_PAGE_SIZE = 100;
export const HISTORY_CACHE_KEY = "tagloom:history:v2";
export const GENERATED_TAG_CHIP_CLASSNAME =
  "cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm";
