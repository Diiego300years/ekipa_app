import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webPush from "web-push";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

import {
  createIdeaVotePushPayload,
  createNewIdeaPushPayload,
  createScheduledEventPushPayload,
  isValidVapidSubject,
  type PushNotificationPayload,
} from "./push-utils";

type PushDeliveryConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type WebPushErrorLike = {
  statusCode?: number;
};

type NewIdeaPushInput = {
  authorUserId: string;
  authorDisplayName: string;
  ideaTitle: string;
};

type ScheduledEventPushInput = {
  schedulerUserId: string;
  ideaTitle: string;
};

type IdeaVotePushInput = {
  ownerUserId: string;
  voterUserId: string;
  voterDisplayName: string;
  ideaTitle: string;
};

type PushSubscriptionReadResult = {
  data: unknown[] | null;
  error: {
    code?: string;
  } | null;
};

const fanOutLimit = 25;
const logPrefix = "[push]";

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

function logPushWarning(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.warn(`${logPrefix} ${message}`, details);
    return;
  }

  console.warn(`${logPrefix} ${message}`);
}

function logPushError(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.error(`${logPrefix} ${message}`, details);
    return;
  }

  console.error(`${logPrefix} ${message}`);
}

function getDeliveryConfig(): PushDeliveryConfig | null {
  const publicKey = clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);
  const subject = clean(process.env.VAPID_SUBJECT);
  const missing = [
    publicKey ? "" : "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    privateKey ? "" : "VAPID_PRIVATE_KEY",
    subject ? "" : "VAPID_SUBJECT",
  ].filter(Boolean);

  if (missing.length > 0 || !publicKey || !privateKey || !subject) {
    logPushWarning("Push delivery skipped because delivery env is missing.", {
      missing,
    });
    return null;
  }

  if (!isValidVapidSubject(subject)) {
    logPushWarning("Push delivery skipped because VAPID_SUBJECT is invalid.", {
      requirement: "VAPID_SUBJECT must start with mailto: or https://",
    });
    return null;
  }

  return {
    publicKey,
    privateKey,
    subject,
  };
}

function createPushAdminClient(): SupabaseClient | null {
  const publicConfig = getSupabasePublicConfig();
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!publicConfig) {
    logPushWarning("Push delivery skipped because Supabase public env is missing.");
    return null;
  }

  if (!serviceRoleKey) {
    logPushWarning(
      "Push delivery skipped because SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return null;
  }

  return createClient(publicConfig.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getWebPushStatusCode(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const statusCode = (error as WebPushErrorLike).statusCode;

  return typeof statusCode === "number" ? statusCode : null;
}

async function deleteInvalidSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    logPushWarning("Invalid push subscription cleanup failed.", {
      subscriptionId,
      code: error.code,
    });
    return false;
  }

  logPushWarning("Invalid push subscription cleaned up.", {
    subscriptionId,
  });
  return true;
}

async function sendToSubscription({
  config,
  payload,
  subscription,
  supabase,
}: {
  config: PushDeliveryConfig;
  payload: string;
  subscription: PushSubscriptionRow;
  supabase: SupabaseClient;
}) {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.auth,
          p256dh: subscription.p256dh,
        },
      },
      payload,
      {
        TTL: 60 * 60,
        vapidDetails: {
          subject: config.subject,
          publicKey: config.publicKey,
          privateKey: config.privateKey,
        },
      },
    );

    return "sent" as const;
  } catch (error) {
    const statusCode = getWebPushStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      await deleteInvalidSubscription(supabase, subscription.id);

      return "invalid" as const;
    }

    logPushWarning("Push send failed for one subscription.", {
      subscriptionId: subscription.id,
      statusCode: statusCode ?? "unknown",
    });

    return "failed" as const;
  }
}

async function sendPushToTargets({
  loadSubscriptions,
  notification,
}: {
  loadSubscriptions: (
    supabase: SupabaseClient,
  ) => PromiseLike<PushSubscriptionReadResult>;
  notification: PushNotificationPayload;
}) {
  try {
    const config = getDeliveryConfig();

    if (!config) {
      return;
    }

    const supabase = createPushAdminClient();

    if (!supabase) {
      return;
    }

    const { data, error } = await loadSubscriptions(supabase);

    if (error) {
      logPushWarning("Push delivery skipped because subscriptions could not be read.", {
        code: error.code,
      });
      return;
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[];

    if (subscriptions.length === 0) {
      return;
    }

    if (subscriptions.length > fanOutLimit) {
      logPushWarning(
        "Push delivery skipped because target count exceeds the safety limit; queue delivery is needed.",
        {
          limit: fanOutLimit,
          targetCountAtLeast: fanOutLimit + 1,
        },
      );
      return;
    }

    const payload = JSON.stringify(notification);
    const results = {
      failed: 0,
      invalid: 0,
      sent: 0,
    };

    for (const subscription of subscriptions) {
      const result = await sendToSubscription({
        config,
        payload,
        subscription,
        supabase,
      });

      results[result] += 1;
    }

    if (results.failed > 0 || results.invalid > 0) {
      logPushWarning("Push delivery completed with non-fatal issues.", results);
    }
  } catch {
    logPushError("Push delivery failed unexpectedly.");
  }
}

export async function sendNewIdeaPush({
  authorUserId,
  authorDisplayName,
  ideaTitle,
}: NewIdeaPushInput) {
  await sendPushToTargets({
    loadSubscriptions: (supabase) =>
      supabase
        .from("push_subscriptions")
        .select("id,user_id,endpoint,p256dh,auth")
        .neq("user_id", authorUserId)
        .limit(fanOutLimit + 1),
    notification: createNewIdeaPushPayload({
      authorDisplayName,
      ideaTitle,
    }),
  });
}

export async function sendScheduledEventPush({
  schedulerUserId,
  ideaTitle,
}: ScheduledEventPushInput) {
  await sendPushToTargets({
    loadSubscriptions: (supabase) =>
      supabase
        .from("push_subscriptions")
        .select("id,user_id,endpoint,p256dh,auth")
        .neq("user_id", schedulerUserId)
        .limit(fanOutLimit + 1),
    notification: createScheduledEventPushPayload({
      ideaTitle,
    }),
  });
}

export async function sendIdeaVotePush({
  ownerUserId,
  voterUserId,
  voterDisplayName,
  ideaTitle,
}: IdeaVotePushInput) {
  if (ownerUserId === voterUserId) {
    return;
  }

  await sendPushToTargets({
    loadSubscriptions: (supabase) =>
      supabase
        .from("push_subscriptions")
        .select("id,user_id,endpoint,p256dh,auth")
        .eq("user_id", ownerUserId)
        .limit(fanOutLimit + 1),
    notification: createIdeaVotePushPayload({
      voterDisplayName,
      ideaTitle,
    }),
  });
}
