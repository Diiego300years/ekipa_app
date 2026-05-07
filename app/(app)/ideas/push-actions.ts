"use server";

import { measureServerTiming } from "@/lib/performance/server-timing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PushSubscriptionActionResult =
  | {
      status: "success";
      message: string;
    }
  | {
      status: "auth-required" | "error";
      message: string;
    };

export type SavePushSubscriptionInput = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent?: string;
};

export type RemovePushSubscriptionInput = {
  endpoint: string;
};

function clean(value: string | undefined | null) {
  return value?.trim() || "";
}

function pushActionError(message: string): PushSubscriptionActionResult {
  return {
    status: "error",
    message,
  };
}

function pushActionAuthRequired(): PushSubscriptionActionResult {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby zarządzać powiadomieniami.",
  };
}

function isValidSubscriptionInput(input: SavePushSubscriptionInput) {
  return Boolean(
    clean(input.endpoint) && clean(input.keys.p256dh) && clean(input.keys.auth),
  );
}

export async function savePushSubscriptionAction(
  input: SavePushSubscriptionInput,
): Promise<PushSubscriptionActionResult> {
  if (!isValidSubscriptionInput(input)) {
    return pushActionError(
      "Nie udało się zapisać powiadomień. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return pushActionError(
      "Powiadomienia będą dostępne po skonfigurowaniu Supabase.",
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.push.getUserForSave", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return pushActionAuthRequired();
    }

    const { error } = await measureServerTiming("supabase.push.saveOwn", () =>
      supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: clean(input.endpoint),
          p256dh: clean(input.keys.p256dh),
          auth: clean(input.keys.auth),
          user_agent: clean(input.userAgent).slice(0, 500) || null,
        },
        {
          onConflict: "endpoint",
        },
      ),
    );

    if (error) {
      return pushActionError(
        "Nie udało się zapisać powiadomień. Spróbuj ponownie.",
      );
    }

    return {
      status: "success",
      message: "Powiadomienia są włączone na tym urządzeniu.",
    };
  } catch {
    return pushActionError(
      "Nie udało się zapisać powiadomień. Spróbuj ponownie.",
    );
  }
}

export async function removePushSubscriptionAction({
  endpoint,
}: RemovePushSubscriptionInput): Promise<PushSubscriptionActionResult> {
  const cleanEndpoint = clean(endpoint);

  if (!cleanEndpoint) {
    return pushActionError(
      "Nie udało się usunąć zapisu powiadomień. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return pushActionError(
      "Powiadomienia będą dostępne po skonfigurowaniu Supabase.",
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.push.getUserForRemove", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return pushActionAuthRequired();
    }

    const { error } = await measureServerTiming("supabase.push.removeOwn", () =>
      supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", cleanEndpoint)
        .eq("user_id", user.id),
    );

    if (error) {
      return pushActionError(
        "Nie udało się usunąć zapisu powiadomień. Spróbuj ponownie.",
      );
    }

    return {
      status: "success",
      message: "Powiadomienia zostały wyłączone na tym urządzeniu.",
    };
  } catch {
    return pushActionError(
      "Nie udało się usunąć zapisu powiadomień. Spróbuj ponownie.",
    );
  }
}
