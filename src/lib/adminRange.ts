export type AdminRange = "all" | "1d" | "7d" | "30d";
export const DEFAULT_ADMIN_RANGE: AdminRange = "1d";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export function parseAdminRange(value: string | string[] | undefined): AdminRange {
  const parsed = Array.isArray(value) ? value[0] : value;
  if (parsed === "all" || parsed === "1d" || parsed === "7d" || parsed === "30d") {
    return parsed;
  }
  return DEFAULT_ADMIN_RANGE;
}

export function getAdminRangeStart(range: AdminRange): string | null {
  const now = Date.now();
  if (range === "all") return null;
  if (range === "1d") return new Date(now - MS_DAY).toISOString();
  if (range === "7d") return new Date(now - 7 * MS_DAY).toISOString();
  return new Date(now - 30 * MS_DAY).toISOString();
}
