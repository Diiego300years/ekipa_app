import fs from "node:fs";
import path from "node:path";

let cachedLocalEnv: Record<string, string> | null = null;

function parseLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, "utf8");
  const values: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const withoutExport = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separatorIndex = withoutExport.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = withoutExport.slice(0, separatorIndex).trim();
    let value = withoutExport.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getLocalEnv() {
  cachedLocalEnv ??= parseLocalEnv();

  return cachedLocalEnv;
}

export function getTestEnv(name: string) {
  return process.env[name] || getLocalEnv()[name] || "";
}

export function hasSupabasePublicTestConfig() {
  return Boolean(
    getTestEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      (getTestEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
        getTestEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
  );
}
