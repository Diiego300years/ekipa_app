import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicConfig } from "./config";

export function createBrowserSupabaseClient() {
  const { url, publicKey } = requireSupabasePublicConfig(
    "createBrowserSupabaseClient",
  );

  return createBrowserClient(url, publicKey);
}
