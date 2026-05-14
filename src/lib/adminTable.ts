export type AdminSortDirection = "asc" | "desc";

export type AdminSortState<TSortKey extends string> =
  | {
      key: TSortKey;
      direction: AdminSortDirection;
    }
  | null;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseAdminSort<TSortKey extends string>(
  value: string | string[] | undefined,
  direction: string | string[] | undefined,
  allowedKeys: readonly TSortKey[],
): AdminSortState<TSortKey> {
  const keyValue = firstParam(value);
  const directionValue = firstParam(direction);

  if (!keyValue || !directionValue) return null;
  if (!allowedKeys.includes(keyValue as TSortKey)) return null;
  if (directionValue !== "asc" && directionValue !== "desc") return null;

  return {
    key: keyValue as TSortKey,
    direction: directionValue,
  };
}

export function getAdminSortOrDefault<TSortKey extends string>(
  sort: AdminSortState<TSortKey>,
  fallback: Exclude<AdminSortState<TSortKey>, null>,
): Exclude<AdminSortState<TSortKey>, null> {
  return sort ?? fallback;
}

export function getNextAdminSortState<TSortKey extends string>(
  current: AdminSortState<TSortKey>,
  key: TSortKey,
): AdminSortState<TSortKey> {
  if (!current || current.key !== key) {
    return { key, direction: "desc" };
  }

  if (current.direction === "desc") {
    return { key, direction: "asc" };
  }

  return null;
}
