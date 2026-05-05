import { expect, test, type Page } from "@playwright/test";

async function openFirstScheduleForm(page: Page) {
  await page.goto("/ideas");

  const scheduleLink = page.getByRole("link", { name: "Zaplanuj" }).first();
  const hasScheduleLink = await scheduleLink.isVisible().catch(() => false);

  test.skip(
    !hasScheduleLink,
    "Scheduling validation needs at least one public idea with Supabase configured.",
  );

  await scheduleLink.click();

  const scheduleForm = page.getByTestId("schedule-idea-form");

  await expect(scheduleForm).toBeVisible();

  return scheduleForm;
}

test.describe("scheduling validation", () => {
  test("validates schedule input in Polish", async ({ page }) => {
    const scheduleForm = await openFirstScheduleForm(page);

    await scheduleForm
      .getByRole("button", { name: "Zaplanuj pomysł" })
      .click();

    await expect(
      scheduleForm.getByText("Data i godzina są wymagane."),
    ).toBeVisible();
    await expect(scheduleForm.getByText("Popraw pola formularza.")).toBeVisible();

    await scheduleForm.getByLabel("Data").fill("2026-05-10");
    await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("12:00");
    await scheduleForm.getByLabel("Godzina zakończenia").fill("11:00");
    await scheduleForm
      .getByRole("button", { name: "Zaplanuj pomysł" })
      .click();

    await expect(
      scheduleForm.getByText(
        "Godzina zakończenia musi być późniejsza niż rozpoczęcia.",
      ),
    ).toBeVisible();

    await scheduleForm.getByLabel("Data").fill("2026-05-10");
    await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("12:00");
    await scheduleForm.getByLabel("Godzina zakończenia").fill("13:00");
    await scheduleForm.getByLabel("Notatka").fill("N".repeat(501));
    await scheduleForm
      .getByRole("button", { name: "Zaplanuj pomysł" })
      .click();

    await expect(
      scheduleForm.getByText("Notatka może mieć maksymalnie 500 znaków."),
    ).toBeVisible();

    await scheduleForm
      .locator('input[name="ideaId"]')
      .evaluate((input) => {
        (input as HTMLInputElement).value = "";
      });
    await scheduleForm.getByLabel("Data").fill("2026-05-10");
    await scheduleForm.getByLabel("Godzina rozpoczęcia").fill("12:00");
    await scheduleForm.getByLabel("Godzina zakończenia").fill("13:00");
    await scheduleForm.getByLabel("Notatka").fill("");
    await scheduleForm
      .getByRole("button", { name: "Zaplanuj pomysł" })
      .click();

    await expect(
      scheduleForm.getByText("Pomysł jest wymagany."),
    ).toBeVisible();
  });
});
