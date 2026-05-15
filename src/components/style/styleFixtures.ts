// === Constants ===

export const COLOR_SWATCHES = [
  { name: "surface", className: "bg-surface" },
  { name: "surface higher", className: "bg-surface-higher" },
  { name: "surface lower", className: "bg-surface-lower" },
  { name: "ink", className: "bg-ink" },
  { name: "ink weak", className: "bg-ink-weak" },
  { name: "line", className: "bg-line" },
  { name: "primary", className: "bg-primary" },
  { name: "danger", className: "bg-danger" },
  { name: "warning", className: "bg-warning" },
  { name: "success", className: "bg-success" },
  { name: "info", className: "bg-info" },
];

export const STYLE_HISTORY_ROWS = [
  {
    date: "May 8, 2026",
    title: "Sterling silver hoop earrings",
    description:
      "Lightweight hoops with a polished minimalist finish for everyday wear",
    status: "generated",
    statusClass: "bg-green-50 text-green-700",
    selected: true,
  },
  {
    date: "May 8, 2026",
    title: "Draft listing title",
    description: "Browser-only draft preview",
    status: "draft",
    statusClass: "bg-blue-50 text-blue-700",
    selected: false,
  },
  {
    date: "May 7, 2026",
    title: "Archived ceramic mug",
    description: "Hidden from normal history until archived rows are included",
    status: "archived",
    statusClass: "bg-red-50 text-red-700",
    selected: false,
  },
] as const;
