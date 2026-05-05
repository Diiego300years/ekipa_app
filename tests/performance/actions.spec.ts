import { expect, test, type Page } from "@playwright/test";

import {
  createPerformanceDataText,
  deleteGeneratedPerformanceDataThroughRls,
  hasRealSupabasePerformanceConfig,
  performanceAuthEmail,
  performanceAuthPassword,
} from "./support/real-supabase";
import { getPerformanceTargetLabel, measureAndLog } from "./support/timing";

function createScheduleDateInput() {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 7);

  return date.toISOString().slice(0, 10);
}

async function logIn(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(performanceAuthEmail);
  await page.getByLabel("Hasło").fill(performanceAuthPassword);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  await expect(page).toHaveURL(/\/ideas$/, { timeout: 15_000 });
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

test.describe("real Supabase action performance diagnostics", () => {
  test.skip(
    !hasRealSupabasePerformanceConfig(),
    "Set public Supabase env vars plus E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run performance action diagnostics.",
  );

  test.beforeAll(() => {
    console.log(`[perf] target: ${getPerformanceTargetLabel()}`);
  });

  test("measures authenticated server action timings", async ({ page }) => {
    const title = createPerformanceDataText("idea");
    const commentBody = createPerformanceDataText("comment");
    const eventNote = createPerformanceDataText("event");
    const scheduleDate = createScheduleDateInput();
    let shouldCleanupIdea = false;
    let shouldCleanupComment = false;
    let shouldCleanupEvent = false;

    try {
      await logIn(page);

      await page.goto("/add");
      await page.getByLabel("Tytuł").fill(title);
      await page
        .getByLabel("Opis")
        .fill("Generated performance diagnostic idea.");
      await page.getByLabel("Miejsce").fill("Performance diagnostics");
      await page.getByLabel("Cena").fill("10");

      await measureAndLog("action add idea", "action", async () => {
        await page.getByRole("button", { name: "Dodaj pomysł" }).click();

        await expect(page).toHaveURL(/\/ideas/, { timeout: 15_000 });
        await expect(page.getByText("Pomysł został dodany.")).toBeVisible({
          timeout: 15_000,
        });
        shouldCleanupIdea = true;
        await expect(
          page.getByTestId("idea-card").filter({ hasText: title }).first(),
        ).toBeVisible({ timeout: 15_000 });
      });

      const ideaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();

      await measureAndLog("action vote", "action", async () => {
        await ideaCard.getByRole("button", { name: "Głosuj" }).click();

        await expect(page.getByText("Głos został oddany.")).toBeVisible({
          timeout: 15_000,
        });
        await expect(
          page
            .getByTestId("idea-card")
            .filter({ hasText: title })
            .first()
            .getByRole("button", { name: "Cofnij głos" }),
        ).toBeVisible({ timeout: 15_000 });
      });

      await measureAndLog("action undo vote", "action", async () => {
        await page
          .getByTestId("idea-card")
          .filter({ hasText: title })
          .first()
          .getByRole("button", { name: "Cofnij głos" })
          .click();

        await expect(page.getByText("Głos został cofnięty.")).toBeVisible({
          timeout: 15_000,
        });
        await expect(
          page
            .getByTestId("idea-card")
            .filter({ hasText: title })
            .first()
            .getByRole("button", { name: "Głosuj" }),
        ).toBeVisible({ timeout: 15_000 });
      });

      const commentIdeaCard = page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first();
      const commentForm = commentIdeaCard.getByTestId("idea-comment-form");

      await commentForm.getByLabel("Komentarz").fill(commentBody);

      await measureAndLog("action add comment", "action", async () => {
        await commentForm
          .getByRole("button", { name: "Dodaj komentarz" })
          .click();

        await expect(page.getByText("Komentarz został dodany.")).toBeVisible({
          timeout: 15_000,
        });
        shouldCleanupComment = true;
        await expect(
          page
            .getByTestId("idea-card")
            .filter({ hasText: title })
            .first()
            .getByTestId("idea-comment")
            .filter({ hasText: commentBody })
            .first(),
        ).toBeVisible({ timeout: 15_000 });
      });

      await page
        .getByTestId("idea-card")
        .filter({ hasText: title })
        .first()
        .getByRole("link", { name: "Zaplanuj" })
        .click();

      await expect(
        page.getByRole("heading", { name: `Zaplanuj: ${title}` }),
      ).toBeVisible({ timeout: 15_000 });

      const scheduleForm = page.getByTestId("schedule-idea-form");

      await scheduleForm.getByLabel("Data").fill(scheduleDate);
      await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("18:30");
      await scheduleForm.getByLabel("Godzina zakończenia").fill("20:00");
      await scheduleForm.getByLabel("Notatka").fill(eventNote);

      await measureAndLog("action schedule event", "action", async () => {
        await scheduleForm
          .getByRole("button", { name: "Zaplanuj pomysł" })
          .click();

        await expect(page).toHaveURL(/\/calendar/, { timeout: 15_000 });
        await expect(page.getByText("Pomysł został zaplanowany.")).toBeVisible({
          timeout: 15_000,
        });
        shouldCleanupEvent = true;

        await selectCalendarDate(page, scheduleDate);
        await expect(
          page.getByTestId("calendar-event").filter({ hasText: title }).first(),
        ).toBeVisible({ timeout: 15_000 });
      });
    } finally {
      if (shouldCleanupIdea) {
        await deleteGeneratedPerformanceDataThroughRls({
          title,
          commentBody: shouldCleanupComment ? commentBody : undefined,
          eventNote: shouldCleanupEvent ? eventNote : undefined,
        });
      }
    }
  });
});
