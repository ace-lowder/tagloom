"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import {
  dispatchAuthSuccess,
  sanitizeNextPath,
  type AuthMode,
  type OpenAuthModalOptions,
} from "@/lib/authModal";

type AuthControllerContextValue = {
  isOpen: boolean;
  mode: AuthMode;
  source?: string;
  next?: string;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
};

const AuthControllerContext = createContext<AuthControllerContextValue | null>(null);

type AuthControllerProviderProps = {
  children: ReactNode;
};

export function AuthControllerProvider({ children }: AuthControllerProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [source, setSource] = useState<string | undefined>(undefined);
  const [next, setNext] = useState<string | undefined>(undefined);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    setMode(options?.mode ?? "login");
    setSource(options?.source);
    setNext(options?.next ? sanitizeNextPath(options.next) : undefined);
    setIsOpen(true);
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsOpen(false);
    dispatchAuthSuccess();
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const value = useMemo<AuthControllerContextValue>(
    () => ({
      isOpen,
      mode,
      source,
      next,
      openAuthModal,
      closeAuthModal,
    }),
    [isOpen, mode, source, next, openAuthModal, closeAuthModal],
  );

  return (
    <AuthControllerContext.Provider value={value}>
      {children}
      {isOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <button
            type="button"
            aria-label="Close auth modal backdrop"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={closeAuthModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Close auth modal"
              className="absolute right-3 top-3 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
            >
              <X className="h-5 w-5" />
            </button>
            <AuthForm
              mode={mode}
              onModeChange={setMode}
              next={next}
              preferGooglePopup
              onAuthSuccess={onAuthSuccess}
              showHeading
              compact
            />
          </div>
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
