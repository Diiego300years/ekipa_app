import { expect, test } from "@playwright/test";

const demoFeedbackMessage =
  "To jest wersja demonstracyjna. Zapisywanie pomysłów będzie dostępne po podłączeniu bazy.";

test.describe("static shell", () => {
  test("renders the Polish login UI", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Ekipa", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Hasło")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zaloguj się" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Zapomniałem hasła" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Rejestracja" }).click();

    await expect(page.getByLabel("Nazwa wyświetlana")).toBeVisible();
    await expect(page.getByLabel("Powtórz hasło")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Utwórz konto" }),
    ).toBeVisible();
  });

  test("opens password recovery from the login UI", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Zapomniałem hasła" }).click();

    await expect(page).toHaveURL(/\/reset-password$/);
    await expect(
      page.getByRole("heading", { name: "Odzyskaj dostęp do konta" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Wyślij link do zmiany hasła" }),
    ).toBeVisible();
  });

  test("renders placeholder idea cards", async ({ page }) => {
    await page.goto("/ideas");

    await expect(
      page.getByRole("heading", { name: "Pomysły" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Wieczór planszówek" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Wycieczka rowerowa" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kino plenerowe" }),
    ).toBeVisible();
  });

  test("uses the bottom navigation between shell routes", async ({ page }) => {
    await page.goto("/ideas");

    const navigation = page.getByRole("navigation", {
      name: "Główna nawigacja",
    });
    const ideasLink = navigation.getByRole("link", { name: "Pomysły" });
    const votingLink = navigation.getByRole("link", { name: "Głosowanie" });
    const calendarLink = navigation.getByRole("link", { name: "Kalendarz" });
    const addLink = navigation.getByRole("link", { name: "Dodaj" });

    await expect(ideasLink).toBeVisible();
    await expect(votingLink).toBeVisible();
    await expect(calendarLink).toBeVisible();
    await expect(addLink).toBeVisible();
    await expect(ideasLink).toHaveAttribute("aria-current", "page");

    await votingLink.click();
    await expect(page).toHaveURL(/\/voting$/);
    await expect(votingLink).toHaveAttribute("aria-current", "page");

    await calendarLink.click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(calendarLink).toHaveAttribute("aria-current", "page");

    await addLink.click();
    await expect(page).toHaveURL(/\/add$/);
    await expect(addLink).toHaveAttribute("aria-current", "page");

    await ideasLink.click();
    await expect(page).toHaveURL(/\/ideas$/);
    await expect(ideasLink).toHaveAttribute("aria-current", "page");
  });

  test("renders the Polish voting placeholder", async ({ page }) => {
    await page.goto("/voting");

    await expect(
      page.getByRole("heading", { name: "Głosowanie" }),
    ).toBeVisible();
    await expect(
      page.getByText("Głosowanie będzie dostępne po zalogowaniu"),
    ).toBeVisible();
    await expect(page.getByText("Wieczór planszówek")).toBeVisible();
    await expect(page.getByText("8")).toBeVisible();
    await expect(page.getByText("głosów").first()).toBeVisible();
  });

  test("renders the schedule placeholder", async ({ page }) => {
    await page.goto("/calendar");

    await expect(
      page.getByRole("heading", { name: "Kalendarz" }),
    ).toBeVisible();
    await expect(page.getByText("Wieczór planszówek")).toBeVisible();
    await expect(page.getByText("Piątek, 17 maja")).toBeVisible();
    await expect(page.getByText("19:00")).toBeVisible();
  });

  test("shows the add idea demo feedback", async ({ page }) => {
    await page.goto("/add");

    await expect(
      page.getByRole("heading", { name: "Dodaj pomysł" }),
    ).toBeVisible();
    await expect(page.getByLabel("Tytuł")).toBeVisible();
    await expect(page.getByLabel("Opis")).toBeVisible();
    await expect(page.getByLabel("Miejsce")).toBeVisible();
    await expect(page.getByLabel("Cena")).toBeVisible();

    await page.getByRole("button", { name: "Dodaj pomysł" }).click();

    await expect(page).toHaveURL(/\/add$/);
    await expect(page.getByText(demoFeedbackMessage)).toBeVisible();
  });

  test("renders the Polish not found page", async ({ page }) => {
    await page.goto("/nieznana-strona");

    await expect(
      page.getByRole("heading", { name: "Nie znaleziono strony" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Wróć do pomysłów" }).click();

    await expect(page).toHaveURL(/\/ideas$/);
    await expect(
      page.getByRole("heading", { name: "Pomysły" }),
    ).toBeVisible();
  });
});
