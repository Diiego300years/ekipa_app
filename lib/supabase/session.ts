import type { User } from "@supabase/supabase-js";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export async function getCurrentSupabaseUser(): Promise<User | null> {
  if (!getSupabasePublicConfig()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
