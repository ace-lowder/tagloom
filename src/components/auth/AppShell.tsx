"use client";

import type { ReactNode } from "react";
import SiteNav from "@/components/site/SiteNav";
import { AuthControllerProvider } from "@/components/auth/AuthController";
import type { CurrentUser } from "@/lib/auth";

type AppShellProps = {
  currentUser: CurrentUser | null;
  children: ReactNode;
};

export default function AppShell({ currentUser, children }: AppShellProps) {
  return (
    <AuthControllerProvider>
      <SiteNav currentUser={currentUser} />
      {children}
    </AuthControllerProvider>
  );
}
