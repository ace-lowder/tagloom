"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/tagsy/Navbar";
import { AuthControllerProvider } from "@/components/auth/AuthController";
import type { CurrentUser } from "@/lib/auth";

type AppShellProps = {
  currentUser: CurrentUser | null;
  children: ReactNode;
};

export default function AppShell({ currentUser, children }: AppShellProps) {
  return (
    <AuthControllerProvider>
      <Navbar currentUser={currentUser} />
      {children}
    </AuthControllerProvider>
  );
}
