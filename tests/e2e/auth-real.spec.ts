import { expect, test } from "@playwright/test";
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
const registrationDomain = getTestEnv("E2E_AUTH_REGISTER_EMAIL_DOMAIN");
const registrationPassword = getTestEnv("E2E_AUTH_REGISTER_PASSWORD");
const resetEmail = getTestEnv("E2E_AUTH_RESET_EMAIL");
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
    await client.auth.signOut();
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
    await client.auth.signOut();
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
    await client.auth.signOut();
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

      await page.goto("/add");
      await page.getByLabel("Tytuł").fill(title);
      await page.getByLabel("Opis").fill("Pomysł utworzony przez test E2E.");
      await page.getByLabel("Miejsce").fill("Testowe miejsce");
      await page.getByLabel("Cena").fill("25,50");
      await page.getByRole("button", { name: "Dodaj pomysł" }).click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      shouldCleanup = true;

      await expect(
        page.getByRole("heading", { name: title }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("Cena: 25,50 zł")).toBeVisible();
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

      await page.goto("/add");
      await page.getByLabel("Tytuł").fill(title);
      await page.getByLabel("Opis").fill("Pomysł do głosowania E2E.");
      await page.getByLabel("Miejsce").fill("Ranking testowy");
      await page.getByLabel("Cena").fill("10");
      await page.getByRole("button", { name: "Dodaj pomysł" }).click();

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
      shouldCleanup = true;

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await expect(ideaCard).toBeVisible({ timeout: 15_000 });
      await expect(ideaCard.getByTestId("idea-vote-count")).toHaveText(
        "0 głosów",
      );

      await ideaCard.getByRole("button", { name: "Głosuj" }).click();

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
        await client.auth.signOut();
      }

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

      await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
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
});
