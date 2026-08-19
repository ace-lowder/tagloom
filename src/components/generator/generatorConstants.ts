import type { DemoFixture, DemoTimings } from "./generatorTypes";

// === Constants ===

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    title: "Handmade ceramic coffee mug with minimalist design",
    tags: {
      target: [
        "ceramic mug",
        "handmade pottery",
        "minimalist cup",
        "coffee lover gift",
        "artisan mug",
        "stoneware cup",
        "modern ceramic",
      ],
      discovery: [
        "pottery gift",
        "hand thrown mug",
        "unique coffee mug",
        "kitchen gift",
        "home decor",
        "cozy gift",
      ],
    },
  },
  {
    title: "Vintage floral pressed flower bookmark set",
    tags: {
      target: [
        "pressed flower",
        "floral bookmark",
        "book lover gift",
        "botanical art",
        "dried flowers",
        "vintage bookmark",
        "gift for reader",
      ],
      discovery: [
        "handmade bookmark",
        "nature art",
        "wildflower print",
        "stocking stuffer",
        "teacher gift",
        "cottagecore",
      ],
    },
  },
  {
    title: "Custom engraved wooden cutting board for kitchen",
    tags: {
      target: [
        "custom cutting board",
        "engraved wood",
        "personalized gift",
        "wedding gift",
        "kitchen decor",
        "wooden board",
        "housewarming gift",
      ],
      discovery: [
        "custom kitchen",
        "laser engraved",
        "anniversary gift",
        "rustic kitchen",
        "foodie gift",
        "bamboo board",
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

export const CONTEXT_STORAGE_PREFIX = "updatetags:genctx:";
export const TITLE_MAX = 140;
export const DESCRIPTION_MAX = 6000;
export const DEFAULT_TITLE_PLACEHOLDER =
  "e.g. Handmade ceramic coffee mug with minimalist design";
export const USAGE_HINT_CLOSE_DELAY_MS = 500;
export const CTA_SCROLL_CORRECTION_DELAY_MS = 380;
export const HISTORY_PAGE_SIZE = 100;
export const HISTORY_CACHE_KEY = "updatetags:history:v2";
export const GENERATED_TAG_CHIP_CLASSNAME =
  "cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm";
