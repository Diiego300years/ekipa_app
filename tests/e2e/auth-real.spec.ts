import { expect, test, type Page } from "@playwright/test";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import {
  getSupabasePublicTestConfig,
  getTestEnv,
  hasSupabasePublicTestConfig,
} from "./support/test-env";

const authEmail = getTestEnv("E2E_AUTH_EMAIL");
const authPassword = getTestEnv("E2E_AUTH_PASSWORD");
const otherAuthEmail = getTestEnv("E2E_OTHER_AUTH_EMAIL");
const otherAuthPassword = getTestEnv("E2E_OTHER_AUTH_PASSWORD");
const registrationDomain = getTestEnv("E2E_AUTH_REGISTER_EMAIL_DOMAIN");
const registrationPassword = getTestEnv("E2E_AUTH_REGISTER_PASSWORD");
const resetEmail = getTestEnv("E2E_AUTH_RESET_EMAIL");
const vapidPublicKey = getTestEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
const supabasePublicConfig = getSupabasePublicTestConfig();

function createRegistrationEmail(domain: string) {
  const cleanDomain = domain.replace(/^@/, "");
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `ekipa-test-${uniquePart}@${cleanDomain}`;
}

function createUniqueIdeaTitle() {
  return `Pomysł E2E ${Date.now()} ${Math.random().toString(36).slice(2)}`;
}

function createScheduleDateInput() {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 7);

  return date.toISOString().slice(0, 10);
}

function formatScheduleDateForUi(dateInput: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).format(new Date(`${dateInput}T12:00:00.000Z`));
}

async function selectCalendarDate(page: Page, dateKey: string) {
  const dayButton = page.locator(
    `[data-testid="calendar-day"][data-date="${dateKey}"]`,
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const isVisible = await dayButton.isVisible().catch(() => false);

    if (isVisible) {
      break;
    }

    await page.getByRole("button", { name: "Następny miesiąc" }).click();
  }

  await expect(dayButton).toBeVisible({ timeout: 15_000 });
  await dayButton.click();
}

async function logInWithCredentials(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });
}

async function logInAsAuthUser(page: Page) {
  await logInWithCredentials(page, authEmail, authPassword);
}

async function mockPushApis(
  page: Page,
  options: {
    endpoint?: string;
    permission: "default" | "denied" | "granted";
    subscriptionMode?: "none" | "invalid" | "invalid-endpoint";
  },
) {
  await page.addInitScript((mockOptions) => {
    const unsubscribeStorageKey = "ekipa-push-unsubscribe-count";

    if (!window.localStorage.getItem(unsubscribeStorageKey)) {
      window.localStorage.setItem(unsubscribeStorageKey, "0");
    }

    function recordUnsubscribe() {
      const currentCount = Number(
        window.localStorage.getItem(unsubscribeStorageKey) ?? "0",
      );

      window.localStorage.setItem(
        unsubscribeStorageKey,
        String(currentCount + 1),
      );
    }

    let currentPermission = mockOptions.permission;
    const notification = function MockNotification() {};
    type MockSubscription = {
      endpoint: string;
      toJSON: () => {
        endpoint: string;
        keys: {
          auth?: string;
          p256dh?: string;
        };
      };
      unsubscribe: () => Promise<boolean>;
    };
    let activeSubscription: MockSubscription | null = null;

    Object.defineProperty(notification, "permission", {
      configurable: true,
      get: () => currentPermission,
    });
    Object.defineProperty(notification, "requestPermission", {
      configurable: true,
      value: async () => {
        currentPermission =
          currentPermission === "default" ? "granted" : currentPermission;

        return currentPermission;
      },
    });

    const createValidSubscription = () => {
      const endpoint =
        mockOptions.endpoint ?? "https://push.example.test/e2e-default";

      return {
        endpoint,
        toJSON: () => ({
          endpoint,
          keys: {
            auth: "test-auth",
            p256dh: "test-p256dh",
          },
        }),
        unsubscribe: async () => {
          recordUnsubscribe();
          activeSubscription = null;

          return true;
        },
      };
    };

    const createInitialSubscription = () => {
      if (mockOptions.subscriptionMode === "invalid") {
        return {
          endpoint: "",
          toJSON: () => ({
            endpoint: "",
            keys: {},
          }),
          unsubscribe: async () => {
            recordUnsubscribe();
            activeSubscription = null;

            return true;
          },
        };
      }

      if (mockOptions.subscriptionMode === "invalid-endpoint") {
        return {
          endpoint: "",
          toJSON: () => ({
            endpoint: "",
            keys: {
              auth: "test-auth",
              p256dh: "test-p256dh",
            },
          }),
          unsubscribe: async () => {
            recordUnsubscribe();
            activeSubscription = null;

            return true;
          },
        };
      }

      return null;
    };
    activeSubscription = createInitialSubscription();
    const registration = {
      pushManager: {
        getSubscription: async () => activeSubscription,
        subscribe: async () => {
          activeSubscription = createValidSubscription();

          return activeSubscription;
        },
      },
    };

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: notification,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function MockPushManager() {},
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: async () => registration,
      },
    });
  }, options);
}

async function mockUnsupportedPushApis(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });
}

async function createIdeaThroughUi(page: Page, title: string) {
  await page.goto("/add");
  await page.getByLabel("Tytuł").fill(title);
  await page.getByLabel("Opis").fill("Pomysł utworzony przez test E2E.");
  await page.getByLabel("Miejsce").fill("Testowe miejsce");
  await page.getByLabel("Cena").fill("25,50");
  await page.getByRole("button", { name: "Dodaj pomysł" }).click();

  await expect(page).toHaveURL(/\/ideas\/[0-9a-f-]+\/schedule\?from=created/, {
    timeout: 15_000,
  });
  await expect(
    page.getByText("Pomysł został dodany. Możesz teraz zaplanować termin."),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Nie teraz" }).click();

  await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: title })).toBeVisible({
    timeout: 15_000,
  });
}

async function scheduleGeneratedIdeaThroughUi({
  page,
  title,
  scheduleDate,
  eventNote,
}: {
  page: Page;
  title: string;
  scheduleDate: string;
  eventNote: string;
}) {
  const ideaCard = page
    .getByTestId("idea-card")
    .filter({ hasText: title })
    .first();

  await expect(ideaCard).toBeVisible({ timeout: 15_000 });
  await ideaCard.getByRole("link", { name: "Zaplanuj" }).click();

  await expect(
    page.getByRole("heading", { name: `Zaplanuj: ${title}` }),
  ).toBeVisible({ timeout: 15_000 });

  const scheduleForm = page.getByTestId("schedule-idea-form");

  await scheduleForm.getByLabel("Data").fill(scheduleDate);
  await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("18:30");
  await scheduleForm.getByLabel("Godzina zakończenia").fill("20:00");
  await scheduleForm.getByLabel("Notatka").fill(eventNote);
  await scheduleForm
    .getByRole("button", { name: "Zaplanuj pomysł" })
    .click();

  await expect(page).toHaveURL(/\/calendar/, { timeout: 15_000 });
  await expect(page.getByText("Pomysł został zaplanowany.")).toBeVisible({
    timeout: 15_000,
  });
}

async function createAuthenticatedPublicClient(): Promise<{
  client: SupabaseClient;
  user: User;
}> {
  if (!supabasePublicConfig) {
    throw new Error("Public Supabase E2E configuration is required.");
  }

  const client = createClient(
    supabasePublicConfig.url,
    supabasePublicConfig.publicKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );

  const { data: authData, error: signInError } =
    await client.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

  if (signInError) {
    throw new Error(
      `Cleanup sign-in with the public Supabase key failed: ${signInError.message}`,
    );
  }

  if (!authData.user) {
    throw new Error("Public Supabase sign-in did not return a user.");
  }

  return {
    client,
    user: authData.user,
  };
}

async function hasCalendarEventResponsesTableThroughRls() {
  if (!supabasePublicConfig) {
    return false;
  }

  const client = createClient(
    supabasePublicConfig.url,
    supabasePublicConfig.publicKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
  const { error } = await client
    .from("calendar_event_responses")
    .select("event_id")
    .limit(1);

  if (!error) {
    return true;
  }

  if (error.code === "42P01" || error.code === "PGRST205") {
    return false;
  }

  throw new Error(
    `Could not read RSVP responses through RLS: ${error.message}`,
  );
}

async function hasPushSubscriptionsTableThroughRls() {
  if (!supabasePublicConfig) {
    return false;
  }

  const { client } = await createAuthenticatedPublicClient();

  try {
    const { error } = await client
      .from("push_subscriptions")
      .select("endpoint")
      .limit(1);

    if (!error) {
      return true;
    }

    if (error.code === "42P01" || error.code === "PGRST205") {
      return false;
    }

    throw new Error(
      `Could not read push subscriptions through RLS: ${error.message}`,
    );
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function getOwnPushSubscriptionCountThroughRls(endpoint: string) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const { data, error } = await client
      .from("push_subscriptions")
      .select("endpoint,user_id")
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(
        `Could not read generated push subscription through RLS: ${error.message}`,
      );
    }

    return (data ?? []).length;
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function deleteOwnPushSubscriptionThroughRls(endpoint: string) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const { error } = await client
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(
        `Cleanup failed through push subscription RLS/delete policy: ${error.message}`,
      );
    }
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function canUpdateGeneratedIdeaThroughRls(title: string) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);
    const { data, error } = await client
      .from("ideas")
      .update({
        title,
      })
      .eq("id", ideaId)
      .select("id");

    if (!error) {
      return (data ?? []).length === 1;
    }

    if (error.code === "42501") {
      return false;
    }

    throw new Error(
      `Could not verify owner idea update through RLS: ${error.message}`,
    );
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function findGeneratedIdeaIdThroughRls(
  client: SupabaseClient,
  userId: string,
  title: string,
) {
  const { data: ideas, error } = await client
    .from("ideas")
    .select("id,title,created_by")
    .eq("title", title)
    .eq("created_by", userId);

  if (error) {
    throw new Error(
      `Could not find generated idea through RLS: ${error.message}`,
    );
  }

  const matchingIdeas = ideas ?? [];

  if (matchingIdeas.length !== 1) {
    throw new Error(
      `Found ${matchingIdeas.length} generated ideas for "${title}". Expected exactly 1.`,
    );
  }

  return matchingIdeas[0].id as string;
}

async function deleteGeneratedIdeaByIdThroughRls(
  client: SupabaseClient,
  userId: string,
  ideaId: string,
  title: string,
) {
  const { data: deletedIdeas, error: deleteError } = await client
    .from("ideas")
    .delete()
    .eq("id", ideaId)
    .eq("created_by", userId)
    .select("id,title,created_by");

  if (deleteError) {
    throw new Error(
      `Cleanup failed through RLS/delete policy: ${deleteError.message}`,
    );
  }

  if ((deletedIdeas ?? []).length !== 1) {
    throw new Error(
      `Cleanup through RLS/delete policy deleted ${
        deletedIdeas?.length ?? 0
      } generated ideas for "${title}". Expected exactly 1; check that authors can delete their own ideas through RLS.`,
    );
  }
}

async function deleteGeneratedIdeaThroughRls(title: string) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);

    await deleteGeneratedIdeaByIdThroughRls(client, user.id, ideaId, title);
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function deleteGeneratedCommentVoteAndIdeaThroughRls(
  title: string,
  commentBody: string | null,
) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);

    if (commentBody) {
      const { data: deletedComments, error: deleteCommentError } = await client
        .from("idea_comments")
        .delete()
        .eq("idea_id", ideaId)
        .eq("user_id", user.id)
        .eq("body", commentBody)
        .select("id,idea_id,user_id,body");

      if (deleteCommentError) {
        throw new Error(
          `Cleanup failed through comments RLS/delete policy: ${deleteCommentError.message}`,
        );
      }

      if ((deletedComments ?? []).length !== 1) {
        throw new Error(
          `Cleanup through comments RLS/delete policy deleted ${
            deletedComments?.length ?? 0
          } generated comments for "${title}". Expected exactly 1.`,
        );
      }
    }

    const { error: deleteVoteError } = await client
      .from("votes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("user_id", user.id);

    if (deleteVoteError) {
      throw new Error(
        `Cleanup failed through votes RLS/delete policy: ${deleteVoteError.message}`,
      );
    }

    await deleteGeneratedIdeaByIdThroughRls(client, user.id, ideaId, title);
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

async function deleteGeneratedCalendarEventAndIdeaThroughRls(
  title: string,
  eventNote: string | null,
) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);

    if (eventNote) {
      const { data: deletedEvents, error: deleteEventError } = await client
        .from("calendar_events")
        .delete()
        .eq("idea_id", ideaId)
        .eq("scheduled_by", user.id)
        .eq("note", eventNote)
        .select("id,idea_id,scheduled_by,note");

      if (deleteEventError) {
        throw new Error(
          `Cleanup failed through calendar events RLS/delete policy: ${deleteEventError.message}`,
        );
      }

      if ((deletedEvents ?? []).length !== 1) {
        throw new Error(
          `Cleanup through calendar events RLS/delete policy deleted ${
            deletedEvents?.length ?? 0
          } generated events for "${title}". Expected exactly 1.`,
        );
      }
    }

    await deleteGeneratedIdeaByIdThroughRls(client, user.id, ideaId, title);
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}

test.describe("real Supabase login", () => {
  test.skip(
    !hasSupabasePublicTestConfig() || !authEmail || !authPassword,
    "Set public Supabase env vars plus E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real auth E2E tests.",
  );

  test("user can log in and log out", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(authEmail);
    await page.getByLabel("Hasło").fill(authPassword);
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Wyloguj" })).toBeVisible();

    await page.getByRole("button", { name: "Wyloguj" }).click();

    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
  });

  test("logout keeps the browser push subscription and database row", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser push subscription state.",
    );
    test.skip(
      !(await hasPushSubscriptionsTableThroughRls()),
      "Apply the push subscriptions migration to run push persistence E2E tests.",
    );

    const endpoint = `https://push.example.test/e2e-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    let shouldCleanup = false;

    try {
      await mockPushApis(page, {
        endpoint,
        permission: "default",
        subscriptionMode: "none",
      });
      shouldCleanup = true;

      await logInAsAuthUser(page);

      const notificationSettings = page.getByTestId("notification-settings");

      await notificationSettings
        .getByRole("button", { name: "Włącz powiadomienia" })
        .click();

      await expect(
        notificationSettings.getByText(
          "Powiadomienia są włączone na tym urządzeniu.",
        ),
      ).toBeVisible({ timeout: 15_000 });
      expect(await getOwnPushSubscriptionCountThroughRls(endpoint)).toBe(1);

      await page.getByRole("button", { name: "Wyloguj" }).click();

      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: "Zaloguj się" }),
      ).toBeVisible();

      const unsubscribeCount = await page.evaluate(() =>
        Number(
          window.localStorage.getItem("ekipa-push-unsubscribe-count") ?? "0",
        ),
      );

      expect(unsubscribeCount).toBe(0);
      expect(await getOwnPushSubscriptionCountThroughRls(endpoint)).toBe(1);
    } finally {
      if (shouldCleanup) {
        await deleteOwnPushSubscriptionThroughRls(endpoint);
      }
    }
  });

  test("authenticated user sees missing public push key guidance", async ({
    page,
  }) => {
    test.skip(
      Boolean(vapidPublicKey),
      "This state is only visible when NEXT_PUBLIC_VAPID_PUBLIC_KEY is empty.",
    );

    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await expect(notificationSettings).toBeVisible();
    await expect(
      notificationSettings.getByText(
        "Powiadomienia są niedostępne, bo brakuje konfiguracji klucza publicznego.",
      ),
    ).toBeVisible();
  });

  test("authenticated user sees denied notification guidance", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser permission states.",
    );

    await mockPushApis(page, {
      permission: "denied",
      subscriptionMode: "none",
    });
    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await expect(
      notificationSettings.getByText(
        "Powiadomienia są zablokowane w ustawieniach przeglądarki lub systemu.",
      ),
    ).toBeVisible();
    await expect(
      notificationSettings.getByRole("button", {
        name: "Włącz powiadomienia",
      }),
    ).toHaveCount(0);
  });

  test("authenticated user sees unsupported notification guidance", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser support states.",
    );

    await mockUnsupportedPushApis(page);
    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await expect(
      notificationSettings.getByText(
        "Ta przeglądarka nie obsługuje powiadomień push.",
      ),
    ).toBeVisible();
  });

  test("authenticated user sees enable action for default notification permission", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser permission states.",
    );

    await mockPushApis(page, {
      permission: "default",
      subscriptionMode: "none",
    });
    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await expect(
      notificationSettings.getByText(
        "Możesz włączyć powiadomienia o nowych pomysłach.",
      ),
    ).toBeVisible();
    await expect(
      notificationSettings.getByRole("button", {
        name: "Włącz powiadomienia",
      }),
    ).toBeVisible();
  });

  test("authenticated user sees save failure messaging for invalid browser subscription", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser permission states.",
    );

    await mockPushApis(page, {
      permission: "default",
      subscriptionMode: "invalid",
    });
    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await notificationSettings
      .getByRole("button", { name: "Włącz powiadomienia" })
      .click();

    await expect(
      notificationSettings.getByText(
        "Nie udało się zapisać powiadomień. Spróbuj ponownie.",
      ),
    ).toBeVisible();
  });

  test("authenticated user does not unsubscribe when database removal fails", async ({
    page,
  }) => {
    test.skip(
      !vapidPublicKey,
      "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to test browser permission states.",
    );

    await mockPushApis(page, {
      permission: "granted",
      subscriptionMode: "invalid-endpoint",
    });
    await logInAsAuthUser(page);

    const notificationSettings = page.getByTestId("notification-settings");

    await expect(
      notificationSettings.getByText(
        "Powiadomienia są włączone na tym urządzeniu.",
      ),
    ).toBeVisible();
    await notificationSettings
      .getByRole("button", { name: "Wyłącz powiadomienia" })
      .click();

    await expect(
      notificationSettings.getByText(
        "Nie udało się usunąć zapisu powiadomień. Spróbuj ponownie.",
      ),
    ).toBeVisible();
    await expect(
      notificationSettings.getByRole("button", { name: "Spróbuj ponownie" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        Number(
          window.localStorage.getItem("ekipa-push-unsubscribe-count") ?? "0",
        ),
      ),
    ).toBe(0);
  });
});

test.describe("real Supabase registration", () => {
  test.skip(
    !hasSupabasePublicTestConfig() || !registrationDomain || !registrationPassword,
    "Set public Supabase env vars plus E2E_AUTH_REGISTER_EMAIL_DOMAIN and E2E_AUTH_REGISTER_PASSWORD to run registration E2E tests.",
  );

  test("user can register or receives email confirmation guidance", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Rejestracja" }).click();
    await page.getByLabel("Nazwa wyświetlana").fill("Test Ekipa");
    await page.getByLabel("Email").fill(createRegistrationEmail(registrationDomain));
    await page.getByLabel("Hasło", { exact: true }).fill(registrationPassword);
    await page.getByLabel("Powtórz hasło").fill(registrationPassword);
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(async () => {
      const isOnIdeasPage = new URL(page.url()).pathname === "/ideas";
      const hasConfirmationMessage = await page
        .getByText(
          "Konto zostało utworzone. Sprawdź email, aby potwierdzić rejestrację.",
        )
        .isVisible()
        .catch(() => false);

      expect(isOnIdeasPage || hasConfirmationMessage).toBe(true);
    }).toPass({ timeout: 15_000 });
  });
});

test.describe("real Supabase password recovery", () => {
  test.skip(
    !hasSupabasePublicTestConfig() || !resetEmail,
    "Set public Supabase env vars plus E2E_AUTH_RESET_EMAIL to run password recovery E2E tests.",
  );

  test("user can request a password recovery email", async ({ page }) => {
    await page.goto("/reset-password");

    await page.getByLabel("Email").fill(resetEmail);
    await page
      .getByRole("button", { name: "Wyślij link do zmiany hasła" })
      .click();

    await expect(
      page.getByText(
        "Jeśli konto istnieje, wysłaliśmy link do zmiany hasła na podany email.",
      ),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("real Supabase ideas", () => {
  test.skip(
    !supabasePublicConfig || !authEmail || !authPassword,
    "Set public Supabase env vars plus E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real ideas E2E tests.",
  );

  test("authenticated user can create an idea and clean it up through RLS", async ({
    page,
  }) => {
    const title = createUniqueIdeaTitle();
    let shouldCleanup = false;

    try {
      await page.goto("/login");

      await page.getByLabel("Email").fill(authEmail);
      await page.getByLabel("Hasło").fill(authPassword);
      await page.getByRole("button", { name: "Zaloguj się" }).click();

      await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });

      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      await expect(
        page.getByRole("heading", { name: title }),
      ).toBeVisible({ timeout: 15_000 });

      const createdIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(createdIdeaCard.getByText("Cena: 25,50 zł")).toBeVisible();
      await expect(
        createdIdeaCard.getByRole("link", { name: "Zaplanuj" }),
      ).toBeVisible();
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedIdeaThroughRls(title);
      }
    }
  });

  test("owner can create and edit an idea", async ({ page }) => {
    const title = createUniqueIdeaTitle();
    const updatedTitle = `${title} po edycji`;
    let cleanupTitle = title;
    let shouldCleanup = false;

    try {
      await logInAsAuthUser(page);
      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      test.skip(
        !(await canUpdateGeneratedIdeaThroughRls(title)),
        "Apply the owner idea update RLS migration to run real edit E2E tests.",
      );

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();
      const editLink = ideaCard.getByRole("link", { name: "Edytuj" });

      await expect(editLink).toBeVisible();
      await editLink.click();

      await expect(
        page.getByRole("heading", { name: `Edytuj: ${title}` }),
      ).toBeVisible({ timeout: 15_000 });

      const editForm = page.getByTestId("edit-idea-form");

      await editForm.getByLabel("Tytuł").fill("   ");
      await editForm.getByRole("button", { name: "Zapisz zmiany" }).click();
      await expect(editForm.getByText("Podaj tytuł pomysłu.")).toBeVisible();

      await editForm.getByLabel("Tytuł").fill(updatedTitle);
      await editForm
        .getByLabel("Opis")
        .fill("Pomysł zaktualizowany przez test E2E.");
      await editForm.getByLabel("Miejsce").fill("Miejsce po edycji");
      await editForm.getByLabel("Cena").fill("30,75 zł");
      await editForm.getByRole("button", { name: "Zapisz zmiany" }).click();

      await expect(page).toHaveURL(/\/ideas(?:\?.*)?$/, {
        timeout: 15_000,
      });
      cleanupTitle = updatedTitle;
      await expect(page.getByText("Pomysł został zaktualizowany.")).toBeVisible({
        timeout: 15_000,
      });

      const updatedIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: updatedTitle })
        .first();

      await expect(updatedIdeaCard).toBeVisible({ timeout: 15_000 });
      await expect(updatedIdeaCard.getByText("Miejsce po edycji")).toBeVisible();
      await expect(updatedIdeaCard.getByText("Cena: 30,75 zł")).toBeVisible();
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedIdeaThroughRls(cleanupTitle);
      }
    }
  });

  test("owner can delete their own generated idea", async ({ page }) => {
    const title = createUniqueIdeaTitle();
    let shouldCleanup = false;

    try {
      await logInAsAuthUser(page);
      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(ideaCard.getByRole("link", { name: "Edytuj" })).toBeVisible();
      await ideaCard.getByRole("button", { name: "Usuń" }).click();

      await expect(
        ideaCard.getByText(
          "Usunięcie pomysłu usunie także powiązane głosy, komentarze i zaplanowane terminy w kalendarzu.",
        ),
      ).toBeVisible();

      await ideaCard.getByRole("button", { name: "Anuluj" }).click();
      await expect(ideaCard.getByTestId("idea-delete-confirmation")).toHaveCount(
        0,
      );

      await ideaCard.getByRole("button", { name: "Usuń" }).click();
      await ideaCard.getByRole("button", { name: "Usuń pomysł" }).click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      await expect(page.getByText("Pomysł został usunięty.")).toBeVisible({
        timeout: 15_000,
      });
      shouldCleanup = false;
      await expect(
        page.getByTestId("idea-card").filter({ hasText: title }),
      ).toHaveCount(0);
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedIdeaThroughRls(title);
      }
    }
  });
});

test.describe("real Supabase voting", () => {
  test.skip(
    !supabasePublicConfig || !authEmail || !authPassword,
    "Set public Supabase env vars plus E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real voting E2E tests.",
  );

  test("authenticated user can vote, remove vote, comment, and clean up through RLS", async ({
    page,
  }) => {
    const title = createUniqueIdeaTitle();
    const commentBody = `Komentarz E2E ${Date.now()} ${Math.random()
      .toString(36)
      .slice(2)}`;
    let shouldCleanup = false;
    let shouldCleanupComment = false;

    try {
      await page.goto("/login");

      await page.getByLabel("Email").fill(authEmail);
      await page.getByLabel("Hasło").fill(authPassword);
      await page.getByRole("button", { name: "Zaloguj się" }).click();

      await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });

      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(ideaCard).toBeVisible({ timeout: 15_000 });
      await expect(ideaCard.getByTestId("idea-vote-count")).toHaveText(
        "0 głosów",
      );

      await ideaCard
        .getByTestId("idea-vote-action")
        .locator('input[name="ideaId"]')
        .evaluate((input) => {
          (input as HTMLInputElement).value = "invalid-idea-id";
        });
      await ideaCard.getByRole("button", { name: "Głosuj" }).click();

      await expect(
        ideaCard.getByText("Nie udało się oddać głosu. Spróbuj ponownie."),
      ).toBeVisible({ timeout: 15_000 });
      await expect(ideaCard.getByTestId("idea-vote-count")).toHaveText(
        "0 głosów",
      );

      await page.goto("/ideas");

      const voteReadyIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(voteReadyIdeaCard.getByTestId("idea-vote-count")).toHaveText(
        "0 głosów",
      );

      await voteReadyIdeaCard.getByRole("button", { name: "Głosuj" }).click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      await expect(page.getByText("Głos został oddany.")).toBeVisible({
        timeout: 15_000,
      });

      const votedIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(votedIdeaCard.getByTestId("idea-vote-count")).toHaveText(
        "1 głos",
      );
      await expect(
        votedIdeaCard.getByRole("button", { name: "Cofnij głos" }),
      ).toBeVisible();
      await expect(
        votedIdeaCard.getByRole("button", { name: "Głosuj" }),
      ).toHaveCount(0);

      const { client, user } = await createAuthenticatedPublicClient();

      try {
        const ideaId = await findGeneratedIdeaIdThroughRls(
          client,
          user.id,
          title,
        );
        const { error: duplicateVoteError } = await client
          .from("votes")
          .insert({
            idea_id: ideaId,
            user_id: user.id,
          });

        expect(duplicateVoteError?.code).toBe("23505");
      } finally {
        await client.auth.signOut({ scope: "local" });
      }

      const votedCardBeforeRollback = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await votedCardBeforeRollback
        .getByTestId("idea-voted-state")
        .locator('input[name="ideaId"]')
        .evaluate((input) => {
          (input as HTMLInputElement).value = "invalid-idea-id";
        });
      await votedCardBeforeRollback
        .getByRole("button", { name: "Cofnij głos" })
        .click();

      await expect(
        votedCardBeforeRollback.getByText(
          "Nie udało się cofnąć głosu. Spróbuj ponownie.",
        ),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        votedCardBeforeRollback.getByTestId("idea-vote-count"),
      ).toHaveText("1 głos");
      await expect(
        votedCardBeforeRollback.getByRole("button", { name: "Cofnij głos" }),
      ).toBeVisible();

      await page.goto("/voting");

      const rankingItem = page
        .getByTestId("voting-ranking-item")
        .filter({ hasText: title })
        .first();

      await expect(rankingItem).toBeVisible({ timeout: 15_000 });
      await expect(rankingItem.getByTestId("voting-vote-count")).toHaveText(
        "1 głos",
      );

      await page.goto("/ideas");

      const cardBeforeRemovingVote = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await cardBeforeRemovingVote
        .getByRole("button", { name: "Cofnij głos" })
        .click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      await expect(page.getByText("Głos został cofnięty.")).toBeVisible({
        timeout: 15_000,
      });

      const unvotedIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(unvotedIdeaCard.getByTestId("idea-vote-count")).toHaveText(
        "0 głosów",
      );
      await expect(
        unvotedIdeaCard.getByRole("button", { name: "Głosuj" }),
      ).toBeVisible();

      await page.goto("/voting");

      const unvotedRankingItem = page
        .getByTestId("voting-ranking-item")
        .filter({ hasText: title })
        .first();

      await expect(unvotedRankingItem).toBeVisible({ timeout: 15_000 });
      await expect(
        unvotedRankingItem.getByTestId("voting-vote-count"),
      ).toHaveText("0 głosów");

      await page.goto("/ideas");

      const commentIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();
      const commentForm = commentIdeaCard.getByTestId("idea-comment-form");

      await commentForm.getByLabel("Komentarz").fill(commentBody);
      await commentForm
        .getByRole("button", { name: "Dodaj komentarz" })
        .click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      await expect(page.getByText("Komentarz został dodany.")).toBeVisible({
        timeout: 15_000,
      });
      shouldCleanupComment = true;

      const commentedIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();
      const generatedComment = commentedIdeaCard
        .getByTestId("idea-comment")
        .filter({ hasText: commentBody })
        .first();

      await expect(generatedComment).toBeVisible({ timeout: 15_000 });
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedCommentVoteAndIdeaThroughRls(
          title,
          shouldCleanupComment ? commentBody : null,
        );
      }
    }
  });
});

test.describe("real Supabase scheduling", () => {
  test.skip(
    !supabasePublicConfig || !authEmail || !authPassword,
    "Set public Supabase env vars plus E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run real scheduling E2E tests.",
  );

  test("guest direct access to an existing idea schedule route shows login guidance", async ({
    page,
  }) => {
    const title = createUniqueIdeaTitle();
    let shouldCleanup = false;

    try {
      await logInAsAuthUser(page);
      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      const { client, user } = await createAuthenticatedPublicClient();
      let ideaId = "";

      try {
        ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);
      } finally {
        await client.auth.signOut({ scope: "local" });
      }

      await page.getByRole("button", { name: "Wyloguj" }).click();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

      await page.goto(`/ideas/${ideaId}/schedule`);

      await expect(
        page.getByRole("heading", { name: "Zaplanuj pomysł" }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText("Zaloguj się, żeby zaplanować ten pomysł."),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Przejdź do logowania" }),
      ).toHaveAttribute("href", /\/login/);
      await expect(page.getByTestId("schedule-idea-form")).toHaveCount(0);
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedIdeaThroughRls(title);
      }
    }
  });

  test("non-owner direct access to an idea schedule route is blocked", async ({
    page,
  }) => {
    test.skip(
      !otherAuthEmail || !otherAuthPassword,
      "Set E2E_OTHER_AUTH_EMAIL and E2E_OTHER_AUTH_PASSWORD to run non-owner scheduling access tests.",
    );

    const title = createUniqueIdeaTitle();
    let shouldCleanup = false;

    try {
      await logInAsAuthUser(page);
      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      const { client, user } = await createAuthenticatedPublicClient();
      let ideaId = "";

      try {
        ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);
      } finally {
        await client.auth.signOut({ scope: "local" });
      }

      await page.getByRole("button", { name: "Wyloguj" }).click();
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      await logInWithCredentials(page, otherAuthEmail, otherAuthPassword);

      await page.goto(`/ideas/${ideaId}/schedule`);

      await expect(
        page.getByRole("heading", { name: "Zaplanuj pomysł" }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText("Nie masz dostępu do planowania tego pomysłu."),
      ).toBeVisible();
      await expect(page.getByTestId("schedule-idea-form")).toHaveCount(0);
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedIdeaThroughRls(title);
      }
    }
  });

  test("authenticated user can schedule an idea and clean it up through RLS", async ({
    page,
  }) => {
    const title = createUniqueIdeaTitle();
    const scheduleDate = createScheduleDateInput();
    const expectedDate = formatScheduleDateForUi(scheduleDate);
    const eventNote = `Termin E2E ${Date.now()} ${Math.random()
      .toString(36)
      .slice(2)}`;
    let shouldCleanup = false;
    let shouldCleanupEvent = false;

    try {
      await page.goto("/login");

      await page.getByLabel("Email").fill(authEmail);
      await page.getByLabel("Hasło").fill(authPassword);
      await page.getByRole("button", { name: "Zaloguj się" }).click();

      await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });

      await page.goto("/add");
      await page.getByLabel("Tytuł").fill(title);
      await page.getByLabel("Opis").fill("Pomysł do planowania E2E.");
      await page.getByLabel("Miejsce").fill("Kalendarz testowy");
      await page.getByLabel("Cena").fill("15");
      await page.getByRole("button", { name: "Dodaj pomysł" }).click();

      await expect(page).toHaveURL(
        /\/ideas\/[0-9a-f-]+\/schedule\?from=created/,
        { timeout: 15_000 },
      );
      await expect(
        page.getByText("Pomysł został dodany. Możesz teraz zaplanować termin."),
      ).toBeVisible({ timeout: 15_000 });
      await page.getByRole("button", { name: "Nie teraz" }).click();
      await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });
      shouldCleanup = true;

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(ideaCard).toBeVisible({ timeout: 15_000 });
      await ideaCard.getByRole("link", { name: "Zaplanuj" }).click();

      await expect(
        page.getByRole("heading", { name: `Zaplanuj: ${title}` }),
      ).toBeVisible({ timeout: 15_000 });

      const scheduleForm = page.getByTestId("schedule-idea-form");

      await scheduleForm.getByLabel("Data").fill(scheduleDate);
      await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("18:30");
      await scheduleForm.getByLabel("Godzina zakończenia").fill("20:00");
      await scheduleForm.getByLabel("Notatka").fill(eventNote);
      await scheduleForm
        .getByRole("button", { name: "Zaplanuj pomysł" })
        .click();

      await expect(page).toHaveURL(/\/calendar/, { timeout: 15_000 });
      await expect(page.getByText("Pomysł został zaplanowany.")).toBeVisible({
        timeout: 15_000,
      });
      shouldCleanupEvent = true;

      await selectCalendarDate(page, scheduleDate);

      const calendarEvent = page
        .getByTestId("calendar-event")
        .filter({ hasText: title })
        .first();

      await expect(calendarEvent).toBeVisible({ timeout: 15_000 });
      await expect(calendarEvent.getByText(expectedDate)).toBeVisible();
      await expect(calendarEvent.getByText("18:30 - 20:00")).toBeVisible();
      await expect(calendarEvent.getByText("Kalendarz testowy")).toBeVisible();
      await expect(calendarEvent.getByText("Cena: 15,00 zł")).toBeVisible();
      await expect(calendarEvent.getByText("Autor:")).toBeVisible();
      await expect(calendarEvent.getByText("Zaplanował:")).toBeVisible();
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedCalendarEventAndIdeaThroughRls(
          title,
          shouldCleanupEvent ? eventNote : null,
        );
      }
    }
  });

  test("authenticated user can RSVP Będę and change RSVP to Nie będę", async ({
    page,
  }) => {
    test.skip(
      !(await hasCalendarEventResponsesTableThroughRls()),
      "Apply the calendar_event_responses migration to run real RSVP E2E tests.",
    );

    const title = createUniqueIdeaTitle();
    const scheduleDate = createScheduleDateInput();
    const eventNote = `RSVP E2E ${Date.now()} ${Math.random()
      .toString(36)
      .slice(2)}`;
    let shouldCleanup = false;
    let shouldCleanupEvent = false;

    try {
      await logInAsAuthUser(page);
      await createIdeaThroughUi(page, title);
      shouldCleanup = true;

      await scheduleGeneratedIdeaThroughUi({
        page,
        title,
        scheduleDate,
        eventNote,
      });
      shouldCleanupEvent = true;

      await selectCalendarDate(page, scheduleDate);

      const calendarEvent = page
        .getByTestId("calendar-event")
        .filter({ hasText: title })
        .first();
      const rsvpControl = calendarEvent.getByTestId("calendar-rsvp-control");

      await expect(calendarEvent).toBeVisible({ timeout: 15_000 });
      await expect(rsvpControl.getByTestId("calendar-rsvp-attending-count"))
        .toHaveText("0");
      await expect(rsvpControl.getByTestId("calendar-rsvp-declined-count"))
        .toHaveText("0");

      await rsvpControl
        .getByRole("button", { exact: true, name: "Będę" })
        .click();

      await expect(
        rsvpControl.getByText("Zapisano odpowiedź: Będę."),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        rsvpControl.getByTestId("calendar-rsvp-attending-count"),
      ).toHaveText("1");
      await expect(
        rsvpControl.getByTestId("calendar-rsvp-declined-count"),
      ).toHaveText("0");
      await expect(
        rsvpControl.getByRole("button", { exact: true, name: "Będę" }),
      ).toHaveAttribute("aria-pressed", "true");

      await rsvpControl.getByRole("button", { name: "Nie będę" }).click();

      await expect(
        rsvpControl.getByText("Zapisano odpowiedź: Nie będę."),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        rsvpControl.getByTestId("calendar-rsvp-attending-count"),
      ).toHaveText("0");
      await expect(
        rsvpControl.getByTestId("calendar-rsvp-declined-count"),
      ).toHaveText("1");
      await expect(
        rsvpControl.getByRole("button", { name: "Nie będę" }),
      ).toHaveAttribute("aria-pressed", "true");
    } finally {
      if (shouldCleanup) {
        await deleteGeneratedCalendarEventAndIdeaThroughRls(
          title,
          shouldCleanupEvent ? eventNote : null,
        );
      }
    }
  });
});
