"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import { hasPendingEmailVerification } from "@/components/auth/emailVerificationStorage";
import {
  sanitizeNextPath,
  type AuthMode,
  type OpenAuthModalOptions,
} from "@/lib/authModal";

type AuthControllerContextValue = {
  isOpen: boolean;
  mode: AuthMode;
  next?: string;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
};

const AuthControllerContext = createContext<AuthControllerContextValue | null>(null);

type AuthControllerProviderProps = {
  children: ReactNode;
};

export function AuthControllerProvider({ children }: AuthControllerProviderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signup");
  const [next, setNext] = useState<string | undefined>(undefined);
  const [verificationLocked, setVerificationLocked] = useState(false);

  const closeAuthModal = useCallback(() => {
    if (verificationLocked) return;
    setIsOpen(false);
    setVerificationLocked(false);
  }, [verificationLocked]);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    setMode(options?.mode ?? "signup");
    setNext(options?.next ? sanitizeNextPath(options.next) : undefined);
    setVerificationLocked(false);
    setIsOpen(true);
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsOpen(false);
    setVerificationLocked(false);
  }, []);

  useEffect(() => {
    if (isOpen) return;
    if (pathname.startsWith("/login") || pathname.startsWith("/verify") || pathname.startsWith("/auth")) {
      return;
    }
    if (!hasPendingEmailVerification()) return;
    setMode("signup");
    setIsOpen(true);
  }, [isOpen, pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !verificationLocked) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, verificationLocked]);

  const value = useMemo<AuthControllerContextValue>(
    () => ({
      isOpen,
      mode,
      next,
      openAuthModal,
      closeAuthModal,
    }),
    [isOpen, mode, next, openAuthModal, closeAuthModal],
  );

  return (
    <AuthControllerContext.Provider value={value}>
      {children}
      {isOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <motion.button
            type="button"
            aria-label="Close auth modal backdrop"
            className="absolute inset-0 bg-black/45"
            onClick={closeAuthModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: "linear" }}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-stone-200 bg-white px-6 pb-6 pt-12 shadow-2xl sm:px-7 sm:pb-7 sm:pt-12"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              opacity: { duration: 0.09, ease: "linear", delay: 0.1 },
              scale: { duration: 0.16, ease: "easeOut", delay: 0.1 },
            }}
          >
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Close auth modal"
              disabled={verificationLocked}
              className="absolute right-3 top-3 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
            <AuthForm
              mode={mode}
              onModeChange={setMode}
              next={next}
              preferGooglePopup
              onAuthSuccess={onAuthSuccess}
              onVerificationPendingChange={setVerificationLocked}
              showHeading={false}
              compact
            />
          </motion.div>
        </div>
      ) : null}
    </AuthControllerContext.Provider>
  );
}

export function useAuthController() {
  const context = useContext(AuthControllerContext);
  if (!context) {
    throw new Error("useAuthController must be used within AuthControllerProvider.");
  }
  return context;
}
