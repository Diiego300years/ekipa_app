import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

type ProfileRow = {
  display_name: string | null;
};

export function getEmailLocalPart(email: string | undefined | null) {
  const cleanEmail = email?.trim();

  if (!cleanEmail) {
    return "";
  }

  return cleanEmail.split("@")[0] || "";
}

export async function getUserDisplayName(user: User) {
  const fallbackName = getEmailLocalPart(user.email);

  if (!getSupabasePublicConfig()) {
    return fallbackName;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (error) {
      return fallbackName;
    }

    return data?.display_name?.trim() || fallbackName;
  } catch {
    return fallbackName;
  }
}

export async function upsertOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
) {
  const cleanDisplayName = displayName.trim();

  if (!cleanDisplayName) {
    return { error: new Error("display_name must not be empty") };
  }

  return supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: cleanDisplayName,
    },
    {
      onConflict: "id",
    },
  );
}
