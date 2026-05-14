"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_ADMIN_RANGE,
  parseAdminRange,
  type AdminRange,
} from "@/lib/adminRange";

const options: Array<{ label: string; value: AdminRange }> = [
  { label: "All", value: "all" },
  { label: "1d", value: "1d" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

export default function AdminRangeSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = parseAdminRange(searchParams.get("range") ?? DEFAULT_ADMIN_RANGE);

  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-white">
      {options.map((option, index) => {
        const active = selected === option.value;
        const roundedClass =
          index === 0 ? "rounded-l-lg" : index === options.length - 1 ? "rounded-r-lg" : "";

        return (
          <button
            key={option.value}
            type="button"
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${roundedClass} ${
              active
                ? "bg-primary text-white"
                : "bg-white text-ink-weak hover:bg-stone-50 hover:text-ink"
            }`}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("range", option.value);
              router.replace(`${pathname}?${params.toString()}`);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
