import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tagloom",
  description: "Generate 13 Etsy-ready tags in under 60 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
