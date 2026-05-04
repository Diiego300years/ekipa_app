"use server";

import { redirect } from "next/navigation";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function logoutAction() {
  if (getSupabasePublicConfig()) {
    try {
      const supabase = await createServerSupabaseClient();

      await supabase.auth.signOut();
    } catch {
      // Logout should still return the user to the login screen if Supabase is unavailable.
    }
  }

  redirect("/login");
}
