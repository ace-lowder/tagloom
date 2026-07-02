import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SupportContactPage from "./SupportContactPage";
import { toastMessages } from "@/components/toasts/toastMessages";

const showToastMock = vi.fn();
const getTokenMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/components/toasts/toasts", () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock("@/components/security/TurnstileField", async () => {
  const React = await import("react");

  return {
    __esModule: true,
    default: React.forwardRef(function MockTurnstileField(
      _props: { onError?: (message: string) => void },
      ref: React.ForwardedRef<{ getToken: () => Promise<string | null> }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        getToken: getTokenMock,
      }));

      return <div data-testid="turnstile-mock" />;
    }),
  };
});

vi.mock("@/components/shared/SiteFooter", () => ({
  default: () => <footer data-testid="site-footer" />,
}));

describe("SupportContactPage", () => {
  const envBackup = {
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    supportFromEmail: process.env.SUPPORT_FROM_EMAIL,
    supportToEmail: process.env.SUPPORT_TO_EMAIL,
  };

  beforeEach(() => {
    showToastMock.mockReset();
    getTokenMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "turnstile-site-key";
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.SUPPORT_FROM_EMAIL = "Tagloom Support <support@example.com>";
    process.env.SUPPORT_TO_EMAIL = "help@example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = envBackup.turnstileSiteKey;
    process.env.RESEND_API_KEY = envBackup.resendApiKey;
    process.env.SUPPORT_FROM_EMAIL = envBackup.supportFromEmail;
    process.env.SUPPORT_TO_EMAIL = envBackup.supportToEmail;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("submits with the initial email, turnstile token, and clears only the message fields on success", async () => {
    getTokenMock.mockResolvedValueOnce("turnstile-token");
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true }, { status: 200 }));

    render(<SupportContactPage initialEmail="person@example.com" />);

    fireEvent.change(screen.getByLabelText("Name (optional)"), {
      target: { value: "Etsy Seller" },
    });
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Need help with tags" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Can you help me understand my generated tags?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/support/contact",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-turnstile-token": "turnstile-token",
        }),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: string };
    expect(requestInit?.body).toBeDefined();
    expect(JSON.parse(requestInit?.body ?? "{}")).toEqual({
      name: "Etsy Seller",
      email: "person@example.com",
      subject: "Need help with tags",
      message: "Can you help me understand my generated tags?",
      turnstileToken: "turnstile-token",
    });

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(toastMessages.supportMessageSent),
    );

    expect(screen.getByLabelText("Name (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("person@example.com");
    expect(screen.getByLabelText("Subject")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("surfaces a backend 400 error in the failure toast and preserves the form values", async () => {
    getTokenMock.mockResolvedValueOnce("turnstile-token");
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { ok: false, error: "Subject must be 160 characters or fewer." },
        { status: 400 },
      ),
    );

    render(<SupportContactPage initialEmail="person@example.com" />);

    fireEvent.change(screen.getByLabelText("Name (optional)"), {
      target: { value: "Etsy Seller" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "supporter@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Need help with tags" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Can you help me understand my generated tags?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...toastMessages.supportMessageFailed,
          body: "Subject must be 160 characters or fewer.",
        }),
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Name (optional)")).toHaveValue("Etsy Seller");
    expect(screen.getByLabelText("Email")).toHaveValue("supporter@example.com");
    expect(screen.getByLabelText("Subject")).toHaveValue("Need help with tags");
    expect(screen.getByLabelText("Message")).toHaveValue(
      "Can you help me understand my generated tags?",
    );
  });

  it("blocks submission and shows the bot-check failure toast when Turnstile returns no token", async () => {
    getTokenMock.mockResolvedValueOnce(null);

    render(<SupportContactPage initialEmail="person@example.com" />);

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Need help with tags" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Can you help me understand my generated tags?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(toastMessages.botCheckFailed),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
