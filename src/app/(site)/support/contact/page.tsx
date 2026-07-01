import type { Metadata } from "next";
import SupportContactPage from "@/components/support/SupportContactPage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Contact Support",
};

export default async function SupportContactRoute() {
  let initialEmail = "";

  try {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      initialEmail = user?.email ?? "";
    }
  } catch {
    initialEmail = "";
  }

  return <SupportContactPage initialEmail={initialEmail} />;
}
