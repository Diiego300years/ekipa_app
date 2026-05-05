import type { SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

type ProfileRow = {
  display_name: string | null;
};

const fallbackDisplayName = "Użytkownik";

export function getEmailLocalPart(email: string | undefined | null) {
  const cleanEmail = email?.trim();

  if (!cleanEmail) {
    return "";
  }

  return cleanEmail.split("@")[0] || "";
}

export async function getUserDisplayName(user: User) {
  if (!getSupabasePublicConfig()) {
    return fallbackDisplayName;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (error) {
      return fallbackDisplayName;
    }

    return data?.display_name?.trim() || fallbackDisplayName;
  } catch {
    return fallbackDisplayName;
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
