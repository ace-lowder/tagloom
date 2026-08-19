import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { ToastProvider } from "@/components/toasts/ToastProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-source-sans-3",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://updatetags.com"),
  title: {
    default: "UpdateTags",
    template: "UpdateTags | %s",
  },
  description:
    "UpdateTags helps Etsy sellers with existing listings generate better-fit tags, improve visibility, and run repeatable listing test cycles.",
  openGraph: {
    title: "UpdateTags | Etsy Tag Generator",
    description:
      "Generate 13 Etsy-ready tags, copy them into Etsy, and keep improving listing visibility with buyer-intent keywords.",
    url: "/",
    siteName: "UpdateTags",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UpdateTags | Etsy Tag Generator",
    description:
      "Generate better-fit Etsy tags for existing listings and improve visibility with practical test cycles.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${inter.variable} bg-surface-lower text-ink`}>
        <GoogleAnalytics />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
