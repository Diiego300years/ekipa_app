import { expect, test } from "@playwright/test";

import { holdNextPost } from "./support/held-post";

test.describe("add idea validation", () => {
  test("shows add idea pending state while submit request is held", async ({
    page,
  }) => {
    await page.goto("/add");

    const heldPost = await holdNextPost(page, "**/add");
    let clickPromise: Promise<void> | null = null;

    try {
      clickPromise = page.getByRole("button", { name: "Dodaj pomysł" }).click();
      await heldPost.postStarted;

      await expect(
        page.getByRole("button", { name: "Zapisywanie..." }),
      ).toBeDisabled();

      heldPost.release();
      await clickPromise;

      await expect(page.getByText("Podaj tytuł pomysłu.")).toBeVisible();
    } finally {
      heldPost.release();
      await clickPromise?.catch(() => undefined);
      await heldPost.cleanup();
    }
  });

  test("requires a non-empty title", async ({ page }) => {
    await page.goto("/add");

    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(page.getByText("Podaj tytuł pomysłu.")).toBeVisible();
    await expect(page.getByText("Popraw pola formularza.")).toBeVisible();

    await page.getByLabel("Tytuł").fill("   ");
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(page.getByText("Podaj tytuł pomysłu.")).toBeVisible();
  });

  test("validates idea field length limits", async ({ page }) => {
    await page.goto("/add");

    await page.getByLabel("Tytuł").fill("T".repeat(121));
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(
      page.getByText("Tytuł może mieć maksymalnie 120 znaków."),
    ).toBeVisible();

    await page.getByLabel("Tytuł").fill("Krótki pomysł");
    await page.getByLabel("Opis").fill("O".repeat(1001));
    await page.getByLabel("Miejsce").fill("M".repeat(161));
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(
      page.getByText("Opis może mieć maksymalnie 1000 znaków."),
    ).toBeVisible();
    await expect(
      page.getByText("Miejsce może mieć maksymalnie 160 znaków."),
    ).toBeVisible();
  });

  test("validates price format", async ({ page }) => {
    await page.goto("/add");

    await page.getByLabel("Tytuł").fill("Pomysł z ceną");
    await page.getByLabel("Cena").fill("dwadzieścia");
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(page.getByText("Wpisz poprawną cenę.")).toBeVisible();
  });

  test("rejects a negative price", async ({ page }) => {
    await page.goto("/add");

    await page.getByLabel("Tytuł").fill("Pomysł z ujemną ceną");
    await page.getByLabel("Cena").fill("-1");
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(page.getByText("Cena nie może być ujemna.")).toBeVisible();
  });

  test("asks guests to log in before creating a real idea", async ({
    page,
  }) => {
    await page.goto("/add");

    await page.getByLabel("Tytuł").fill("Gościnny pomysł");
    await page.getByLabel("Opis").fill("Opis pomysłu bez logowania");
    await page.getByLabel("Miejsce").fill("Park");
    await page.getByLabel("Cena").fill("25,50 zł");
    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(
      page.getByText("Zaloguj się, żeby dodać prawdziwy pomysł."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Przejdź do logowania" }),
    ).toHaveAttribute("href", "/login");
  });
});
