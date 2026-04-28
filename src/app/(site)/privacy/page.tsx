import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

const lastUpdated = "April 28, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | Tagloom",
  description:
    "Learn how Tagloom collects, uses, and protects information for its Etsy tag generation service.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This policy explains what Tagloom collects, how we use it, and the choices you have when using our AI tag generation service."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: "Information we collect",
          body: [
            "We collect information you provide directly, such as your email address, account details, support messages, and listing information you enter to generate tag suggestions.",
            "We also collect information needed to operate and protect the service, such as session cookies, authentication state, request metadata, device/browser details, IP address, logs, rate-limit events, and security or debugging information.",
          ],
        },
        {
          title: "How we use information",
          body: [
            "We use information to create and secure accounts, provide tag generation, manage usage and billing, respond to support requests, detect abuse, debug issues, improve reliability, and communicate with you about the service.",
            "We do not sell your personal information. We may use aggregated or de-identified information to understand product usage and improve Tagloom.",
          ],
        },
        {
          title: "Service providers",
          body: [
            "Tagloom relies on service providers to run the product. Supabase provides authentication and database services. Stripe handles payments, subscriptions, invoices, and billing portal access. Resend or an email provider delivers support contact messages. OpenAI processes listing information to generate tag suggestions, and Tagloom may replace or add AI providers as the product changes.",
            "These providers process information only as needed to provide their services to Tagloom, subject to their own terms and privacy practices.",
          ],
        },
        {
          title: "Payments",
          body: [
            "Payments are processed by Stripe. Tagloom does not store full card numbers. Stripe may collect payment details, billing information, fraud-prevention signals, and transaction records as needed to process purchases and subscriptions.",
          ],
        },
        {
          title: "AI generation inputs",
          body: [
            "When you ask Tagloom to generate tags, the listing title, description, or other text you enter may be sent to OpenAI so the service can produce tag suggestions. Tagloom may replace or add AI providers as the product changes.",
            "Do not submit sensitive personal information or confidential business information that is not needed for tag generation. AI output can be incomplete, inaccurate, duplicated, or unsuitable for your listing, so you should review all suggestions before using them.",
          ],
        },
        {
          title: "Cookies, sessions, and security",
          body: [
            "Tagloom uses cookies, authentication sessions, and similar technologies for authentication, session management, saved state, security checks, rate limiting, and product functionality.",
            "We use tools such as Turnstile, rate limits, request logs, and security checks to protect the service from spam, abuse, automated attacks, and operational issues.",
          ],
        },
        {
          title: "Disclosures",
          body: [
            "We may disclose information if required by law, to protect Tagloom or users, to enforce our terms, to investigate abuse or security issues, or as part of a merger, acquisition, financing, reorganization, or sale of assets.",
          ],
        },
        {
          title: "Data retention",
          body: [
            "We keep information for as long as reasonably needed to provide the service, maintain accounts, comply with legal or financial obligations, resolve disputes, prevent abuse, and support business operations.",
            "Retention needs vary by data type. For example, billing records may need to be kept longer than support messages or temporary logs.",
          ],
        },
        {
          title: "Your choices and requests",
          body: [
            "You can choose not to provide optional information, but some information is required to create an account, generate tags, process payments, or receive support.",
            "You may contact support to request access, correction, or deletion of your information. We will review requests subject to identity verification and legal, security, financial, and business recordkeeping limits.",
          ],
        },
      ]}
    />
  );
}
