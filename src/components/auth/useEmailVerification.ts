"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { sanitizeNextPath } from "@/lib/authModal";
import { buildAuthCallbackUrl } from "@/lib/authRedirect";
import { isEmailVerified } from "@/lib/auth";
import {
  clearPendingEmailVerification,
  loadPendingEmailVerification,
  savePendingEmailVerification,
  type PendingEmailVerification,
} from "./emailVerificationStorage";
import { writeSignupCooldown } from "./authFormHelpers";

const EMAIL_VERIFIED_BROADCAST_MESSAGE = "tagloom-auth";
const EMAIL_VERIFIED_MESSAGE_TYPE = "email_verified";
const RESEND_COOLDOWN_MS = 30_000;
const VERIFICATION_POLL_MS = 10_000;

type UseEmailVerificationParams = {
  supabase: {
    auth: {
      getUser: () => Promise<{ data: { user: User | null }; error?: AuthError | null }>;
      resend: (args: {
        type: "signup";
        email: string;
        options: { emailRedirectTo: string };
      }) => Promise<{ error: AuthError | null }>;
      onAuthStateChange: (
        callback: (event: string, session: { user: User | null } | null) => void,
      ) => {
        data: { subscription: { unsubscribe: () => void } };
      };
    };
  } | null;
  onVerified: (record: PendingEmailVerification) => void;
  onPendingChange?: (pending: boolean) => void;
};

type ResendStatus = "idle" | "sending" | "sent" | "error";

export function useEmailVerification({
  supabase,
  onVerified,
  onPendingChange,
}: UseEmailVerificationParams) {
  const [record, setRecord] = useState<PendingEmailVerification | null>(() =>
    loadPendingEmailVerification(),
  );
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [troubleshootingChecked, setTroubleshootingChecked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const didCompleteRef = useRef(false);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const pending = Boolean(record);
  const resendCooldownSeconds = useMemo(() => {
    if (!record) return 0;
    if (record.emailSentAt === null) return 0;
    const remainingMs = record.emailSentAt + RESEND_COOLDOWN_MS - now;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }, [now, record]);

  const closeBroadcastChannel = useCallback(() => {
    broadcastRef.current?.close();
    broadcastRef.current = null;
  }, []);

  const finishVerification = useCallback((verificationRecord: PendingEmailVerification) => {
    if (didCompleteRef.current) return;
    didCompleteRef.current = true;
    clearPendingEmailVerification();
    setRecord(null);
    setResendStatus("idle");
    setResendMessage(null);
    setTroubleshootingChecked(false);
    closeBroadcastChannel();
    writeSignupCooldown();
    onPendingChange?.(false);
    onVerified(verificationRecord);
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(EMAIL_VERIFIED_BROADCAST_MESSAGE);
      channel.postMessage({ type: EMAIL_VERIFIED_MESSAGE_TYPE });
      channel.close();
    }
  }, [closeBroadcastChannel, onPendingChange, onVerified]);

  const checkVerification = useCallback(async () => {
    if (!supabase || didCompleteRef.current || !record) return;
    if (typeof supabase.auth.getUser !== "function") return;
    const { data } = await supabase.auth.getUser();
    if (isEmailVerified(data.user)) {
      finishVerification(record);
    }
  }, [finishVerification, record, supabase]);

  const ensureRecord = useCallback(
    (nextRecord: PendingEmailVerification) => {
      const safeRecord = {
        email: nextRecord.email,
        next: sanitizeNextPath(nextRecord.next),
        createdAt: nextRecord.createdAt,
        emailSentAt: nextRecord.emailSentAt,
      };
      savePendingEmailVerification(safeRecord);
      didCompleteRef.current = false;
      setRecord(safeRecord);
      setResendStatus("idle");
      setResendMessage(null);
      setTroubleshootingChecked(false);
      onPendingChange?.(true);
      setNow(Date.now());
    },
    [onPendingChange],
  );

  const clearVerification = useCallback(() => {
    clearPendingEmailVerification();
    didCompleteRef.current = false;
    setRecord(null);
    setResendStatus("idle");
    setResendMessage(null);
    setTroubleshootingChecked(false);
    onPendingChange?.(false);
    closeBroadcastChannel();
  }, [closeBroadcastChannel, onPendingChange]);

  const startVerification = useCallback(
    (nextRecord: PendingEmailVerification) => {
      ensureRecord(nextRecord);
    },
    [ensureRecord],
  );

  const requestManualVerificationCheck = useCallback(async () => {
    await checkVerification();
    return Boolean(didCompleteRef.current);
  }, [checkVerification]);

  const resendConfirmationEmail = useCallback(async () => {
    if (!supabase || !record) return;

    setResendStatus("sending");
    setResendMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: record.email,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(record.next, "email_verification"),
        },
      });

      if (error) {
        if (isBusy429(error)) {
          setResendStatus("error");
          setResendMessage(
            "We couldn't send your confirmation email right now. Email delivery is temporarily busy. Your listing has been saved. Please try again shortly.",
          );
          return;
        }

        throw error;
      }

      const nextRecord = {
        ...record,
        emailSentAt: Date.now(),
      };
      savePendingEmailVerification(nextRecord);
      setRecord(nextRecord);
      setResendStatus("sent");
      setResendMessage(null);
      setTroubleshootingChecked(false);
      setNow(Date.now());
    } catch (err) {
      setResendStatus("error");
      setResendMessage("We couldn't resend the verification email right now. Please try again in a moment.");
    }
  }, [record, supabase]);

  const acknowledgeTroubleshooting = useCallback((checked: boolean) => {
    setTroubleshootingChecked(checked);
  }, []);

  const useDifferentEmail = useCallback(() => {
    clearVerification();
  }, [clearVerification]);

  useEffect(() => {
    if (!record || !supabase) return;

    const onFocus = () => {
      void checkVerification();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkVerification();
      }
    };

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
      void checkVerification();
    }, VERIFICATION_POLL_MS);

    const timeoutId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isEmailVerified(session?.user ?? null)) {
        finishVerification(record);
      }
    });
    const subscription = data.subscription;

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(EMAIL_VERIFIED_BROADCAST_MESSAGE);
      broadcastRef.current = channel;
      channel.onmessage = (event) => {
        if ((event.data as { type?: string } | null)?.type === EMAIL_VERIFIED_MESSAGE_TYPE) {
          void checkVerification();
        }
      };
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void checkVerification();

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
      window.clearInterval(timeoutId);
      subscription.unsubscribe();
      closeBroadcastChannel();
    };
  }, [checkVerification, closeBroadcastChannel, finishVerification, record, supabase]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  return {
    record,
    resendStatus,
    resendMessage,
    resendCooldownSeconds,
    troubleshootingChecked,
    setTroubleshootingChecked: acknowledgeTroubleshooting,
    startVerification,
    clearVerification,
    requestManualVerificationCheck,
    resendConfirmationEmail,
    useDifferentEmail,
    isPending: pending,
  };
}

function isBusy429(error: AuthError) {
  const status = (error as { status?: number | string } | null)?.status;
  return status === 429;
}
