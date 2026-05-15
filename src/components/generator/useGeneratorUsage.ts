"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { USAGE_HINT_CLOSE_DELAY_MS } from "./generatorConstants";
import { fetchAccountUsage } from "./generatorApi";
import { getUsageHintText } from "./generatorTags";

// === Hooks ===

export function useGeneratorUsage() {
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [monthlyResetAt, setMonthlyResetAt] = useState<string | null>(null);
  const [isUsageHintOpen, setIsUsageHintOpen] = useState(false);
  const usageHintCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const refreshUsageLabel = useCallback(async () => {
    const result = await fetchAccountUsage();
    setUsageLabel(result.usageLabel);
    setMonthlyResetAt(result.monthlyResetAt);
    return { usageLabel: result.usageLabel, resolved: result.resolved };
  }, []);

  const openUsageHint = useCallback(() => {
    if (usageHintCloseTimeoutRef.current) {
      clearTimeout(usageHintCloseTimeoutRef.current);
      usageHintCloseTimeoutRef.current = null;
    }
    setIsUsageHintOpen(true);
  }, []);

  const queueUsageHintClose = useCallback(() => {
    if (usageHintCloseTimeoutRef.current) {
      clearTimeout(usageHintCloseTimeoutRef.current);
      usageHintCloseTimeoutRef.current = null;
    }
    usageHintCloseTimeoutRef.current = setTimeout(() => {
      setIsUsageHintOpen(false);
      usageHintCloseTimeoutRef.current = null;
    }, USAGE_HINT_CLOSE_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (usageHintCloseTimeoutRef.current) {
        clearTimeout(usageHintCloseTimeoutRef.current);
      }
    };
  }, []);

  const usageHint = useMemo(
    () => getUsageHintText(usageLabel, monthlyResetAt),
    [monthlyResetAt, usageLabel],
  );

  const monthlyResetDateText = useMemo(() => {
    if (!monthlyResetAt) return null;
    const date = new Date(monthlyResetAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, [monthlyResetAt]);

  return {
    usageLabel,
    monthlyResetAt,
    usageHint,
    monthlyResetDateText,
    isUsageHintOpen,
    refreshUsageLabel,
    openUsageHint,
    queueUsageHintClose,
  };
}
