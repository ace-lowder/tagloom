import SupportContactPage from "@/components/support/SupportContactPage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
