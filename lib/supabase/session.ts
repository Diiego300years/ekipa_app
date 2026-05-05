import type { User } from "@supabase/supabase-js";

import { measureServerTiming } from "@/lib/performance/server-timing";

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
    } = await measureServerTiming("supabase.auth.getCurrentUser", () =>
      supabase.auth.getUser(),
    );

    if (error) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
