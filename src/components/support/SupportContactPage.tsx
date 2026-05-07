"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import TurnstileField, { type TurnstileFieldHandle } from "@/components/security/TurnstileField";
import SiteFooter from "@/components/shared/SiteFooter";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextArea, TextInput } from "@/components/ui/form";

type SupportContactPageProps = {
  initialEmail: string;
};

export default function SupportContactPage({ initialEmail }: SupportContactPageProps) {
  const turnstileRef = useRef<TurnstileFieldHandle | null>(null);
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      let turnstileToken: string | null = null;
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
        turnstileToken = (await turnstileRef.current?.getToken()) ?? null;
        if (!turnstileToken) {
          showToast(toastMessages.botCheckFailed);
          return;
        }
      }

      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          turnstileToken,
        }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not submit your message.");
      }

      showToast(toastMessages.supportMessageSent);
      setName("");
      setSubject("");
      setMessage("");
    } catch (submitError) {
      showToast({
        ...toastMessages.supportMessageFailed,
        body:
          submitError instanceof Error
            ? submitError.message
            : toastMessages.supportMessageFailed.body,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="mx-auto max-w-2xl px-5 py-12 pt-24">
        <Link
          href="/support"
          className="mb-8 inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <Mail className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Contact Support</h1>
              <p className="mt-1 text-sm text-stone-500">
                Send us a message and we will follow up by email.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <FieldLabel htmlFor="name">
                Name <span className="text-stone-400">(optional)</span>
              </FieldLabel>
              <TextInput
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <FieldLabel htmlFor="email">
                Email
              </FieldLabel>
              <TextInput
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <FieldLabel htmlFor="subject">
                Subject
              </FieldLabel>
              <TextInput
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="What do you need help with?"
              />
            </div>

            <div>
              <FieldLabel htmlFor="message">
                Message
              </FieldLabel>
              <TextArea
                id="message"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                className="resize-y"
                placeholder="Tell us what happened and what you are trying to do."
              />
            </div>

            <TurnstileField ref={turnstileRef} onError={(message) => showToast({ ...toastMessages.botCheckFailed, body: message })} />

            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingLabel="Sending..."
            >
              Send message
            </Button>
          </form>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
