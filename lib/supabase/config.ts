type SupabasePublicConfig = {
  url: string;
  publicKey: string;
};

const missingSupabaseConfigMessage =
  "Supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. NEXT_PUBLIC_SUPABASE_ANON_KEY is supported only as an optional legacy fallback.";

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = clean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const legacyAnonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const publicKey = publishableKey ?? legacyAnonKey;

  if (!url || !publicKey) {
    return null;
  }

  return {
    url,
    publicKey,
  };
}

export function requireSupabasePublicConfig(
  caller: string,
): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(`${caller}: ${missingSupabaseConfigMessage}`);
  }

  return config;
}
