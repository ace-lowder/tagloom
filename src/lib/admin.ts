import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ADMIN_EMAIL = "ace.lowder@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function requireAdminUser(): Promise<{ id: string; email: string }> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?next=/admin");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  if (!user) {
    redirect("/login?next=/admin");
  }

  const email = user.email ?? null;
  if (!isAdminEmail(email)) {
    redirect("/");
  }

  return { id: user.id, email: email! };
}
