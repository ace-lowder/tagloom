"use client";

import { createContext, useContext } from "react";

// === Helpers ===

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}

// === Constants ===

export const ToastContext = createContext<ToastContextValue | null>(null);

// === Types ===

export type ToastType = "success" | "danger" | "info";

export type ToastInput = {
  title: string;
  body?: string;
  type?: ToastType;
};

export type ToastItem = Required<Pick<ToastInput, "title" | "type">> &
  Pick<ToastInput, "body"> & {
    id: string;
  };

export type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};
