import type { User } from "@supabase/supabase-js";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

export function toCurrentUser(user: User | null): CurrentUser | null {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const fullName = (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? null;
  const avatarUrl =
    (metadata.avatar_url as string | undefined) ?? (metadata.picture as string | undefined) ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    avatarUrl,
  };
}
