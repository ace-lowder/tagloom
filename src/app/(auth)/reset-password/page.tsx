import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white px-6 py-7 shadow-2xl sm:px-7">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
