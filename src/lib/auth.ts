import type { User } from "@supabase/supabase-js";

export type CurrentUserProfile = {
  subscriptionTier: "monthly" | "yearly" | null;
  subscriptionActive: boolean;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  subscriptionTier: "monthly" | "yearly" | null;
  subscriptionActive: boolean;
};

export function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

export function toCurrentUser(
  user: User | null,
  profile?: CurrentUserProfile | null,
): CurrentUser | null {
  if (!isEmailVerified(user)) return null;
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
    subscriptionTier: profile?.subscriptionTier ?? null,
    subscriptionActive: profile?.subscriptionActive ?? false,
  };
}
