import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicConfig } from "./config";

export async function createServerSupabaseClient() {
  const { url, publicKey } = requireSupabasePublicConfig(
    "createServerSupabaseClient",
  );
  const cookieStore = await cookies();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; the Proxy refresh path handles them.
        }
      },
    },
  });
}
