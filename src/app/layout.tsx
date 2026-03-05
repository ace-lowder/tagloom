import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/tagsy/Navbar";
import { toCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-source-sans-3",
});

export const metadata: Metadata = {
  title: "Tagloom",
  description: "Generate 13 Etsy-ready tags in under 60 seconds.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentUser = null;

  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      currentUser = null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUser = toCurrentUser(user);
    }
  } catch {
    currentUser = null;
  }

  return (
    <html lang="en">
      <body className={`${outfit.variable} ${inter.variable} bg-[#F7F7F5] text-black`}>
        <Navbar currentUser={currentUser} />
        {children}
      </body>
    </html>
  );
}
