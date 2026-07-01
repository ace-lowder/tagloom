import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

const lastUpdated = "April 28, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms for using Tagloom's AI-powered Etsy listing tag generation service.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      description="These terms explain the rules for using Tagloom. By using the service, you agree to use it responsibly and review all output before applying it to your listings."
      lastUpdated={lastUpdated}
      sections={[
        {
          title: "The service",
          body: [
            "Tagloom is a micro SaaS tool for Etsy sellers that generates listing tag suggestions from information you provide, such as listing titles and descriptions.",
            "Tagloom is not affiliated with, endorsed by, sponsored by, or operated by Etsy. Etsy and related marks belong to Etsy, Inc.",
          ],
        },
        {
          title: "Accounts",
          body: [
            "You are responsible for maintaining access to your account and for activity that occurs under it. Use accurate information and keep your login credentials secure.",
            "You may not share access in a way that avoids plan limits, misrepresents your identity, or creates security or abuse risks for Tagloom or other users.",
          ],
        },
        {
          title: "Paid plans and billing",
          body: [
            "Some Tagloom features require a paid plan, subscription, or one-time purchase. Prices, limits, and plan details are shown in the product at the time of purchase.",
            "Payments and subscription management are handled by Stripe. You can manage eligible subscriptions through the billing area or Stripe billing portal. Cancellations stop future renewals but do not automatically refund past charges unless required by law or stated otherwise in the product.",
            "Refunds are handled case by case unless a specific plan, checkout page, or written offer says otherwise.",
          ],
        },
        {
          title: "Acceptable use",
          body: [
            "Do not use Tagloom to break the law, infringe others' rights, submit harmful or deceptive content, attack or disrupt the service, bypass limits, scrape at scale, probe security controls, or use automated abuse against our systems.",
            "We may limit, suspend, or terminate access when needed to protect the service, users, providers, or business operations.",
          ],
        },
        {
          title: "AI output and listing responsibility",
          body: [
            "Tagloom uses AI to suggest tags, but AI output may be incomplete, inaccurate, duplicated, outdated, or not compliant with Etsy rules or your local laws.",
            "You may use generated suggestions for your own listings. Similar or identical suggestions may be generated for other users, especially when listings, products, or keywords are similar.",
            "You are responsible for reviewing generated tags, listing text, product claims, intellectual property issues, marketplace policies, and final listing decisions before using any output.",
          ],
        },
        {
          title: "Support",
          body: [
            "You can contact support through the Tagloom support contact page. We aim to respond in a practical timeframe, but response times are not guaranteed.",
          ],
        },
        {
          title: "Service availability",
          body: [
            "We work to keep Tagloom available and reliable, but the service may be interrupted, delayed, changed, or unavailable due to maintenance, provider outages, security issues, or operational needs.",
            "Tagloom is provided as is and as available. To the extent allowed by law, we do not make warranties that the service will be uninterrupted, error-free, or produce any specific business result.",
          ],
        },
        {
          title: "Limitation of liability",
          body: [
            "To the extent allowed by law, Tagloom will not be liable for indirect, incidental, special, consequential, or lost-profit damages arising from your use of the service.",
            "Our total liability for claims related to the service is limited to the amount you paid Tagloom for the service giving rise to the claim during the three months before the event, or 100 USD if you did not pay during that period.",
          ],
        },
        {
          title: "Changes to these terms",
          body: [
            "We may update these terms as the product changes. If changes are material, we will take reasonable steps to make the updated terms available. Continued use of Tagloom after updates means you accept the revised terms.",
          ],
        },
      ]}
    />
  );
}
