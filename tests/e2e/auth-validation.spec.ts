import { expect, test } from "@playwright/test";

test.describe("auth validation", () => {
  test("shows login validation without Supabase credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page.getByText("Podaj email.")).toBeVisible();
    await expect(page.getByText("Podaj hasło.")).toBeVisible();
    await expect(page.getByText("Popraw pola formularza.")).toBeVisible();
  });

  test("shows login format validation without calling Supabase", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("niepoprawny-email");
    await page.getByLabel("Hasło").fill("123");
    await page.getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page.getByText("Wpisz poprawny adres email.")).toBeVisible();
    await expect(
      page.getByText("Hasło musi mieć co najmniej 6 znaków."),
    ).toBeVisible();
  });

  test("shows registration validation without Supabase credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Rejestracja" }).click();
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(page.getByText("Podaj nazwę wyświetlaną.")).toBeVisible();
    await expect(page.getByText("Podaj email.")).toBeVisible();
    await expect(page.getByText("Podaj hasło.")).toBeVisible();
    await expect(page.getByText("Powtórz hasło.")).toBeVisible();
  });

  test("requires display name during registration", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Rejestracja" }).click();
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Hasło", { exact: true }).fill("haslo123");
    await page.getByLabel("Powtórz hasło").fill("haslo123");
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(page.getByText("Podaj nazwę wyświetlaną.")).toBeVisible();
    await expect(page.getByText("Popraw pola formularza.")).toBeVisible();
  });

  test("shows password confirmation validation", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Rejestracja" }).click();
    await page.getByLabel("Nazwa wyświetlana").fill("Jan");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Hasło", { exact: true }).fill("haslo123");
    await page.getByLabel("Powtórz hasło").fill("inne123");
    await page.getByRole("button", { name: "Utwórz konto" }).click();

    await expect(page.getByText("Hasła muszą być takie same.")).toBeVisible();
  });

  test("validates password recovery email", async ({ page }) => {
    await page.goto("/reset-password");

    await page
      .getByRole("button", { name: "Wyślij link do zmiany hasła" })
      .click();

    await expect(page.getByText("Podaj email.")).toBeVisible();

    await page.getByLabel("Email").fill("niepoprawny-email");
    await page
      .getByRole("button", { name: "Wyślij link do zmiany hasła" })
      .click();

    await expect(page.getByText("Wpisz poprawny adres email.")).toBeVisible();
  });

  test("returns from password recovery to login", async ({ page }) => {
    await page.goto("/reset-password");

    await page.getByRole("link", { name: "Wróć do logowania" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
  });

  test("validates password update fields", async ({ page }) => {
    await page.goto("/reset-password/update");

    await page.getByRole("button", { name: "Zmień hasło" }).click();

    await expect(page.getByText("Podaj nowe hasło.")).toBeVisible();
    await expect(page.getByText("Powtórz nowe hasło.")).toBeVisible();

    await page.getByLabel("Nowe hasło", { exact: true }).fill("123");
    await page.getByLabel("Powtórz nowe hasło").fill("inne123");
    await page.getByRole("button", { name: "Zmień hasło" }).click();

    await expect(
      page.getByText("Hasło musi mieć co najmniej 6 znaków."),
    ).toBeVisible();
    await expect(page.getByText("Hasła muszą być takie same.")).toBeVisible();
  });

  test("handles unknown auth callback flow safely", async ({ page }) => {
    await page.goto("/auth/callback?flow=nieznany");

    await expect(page).toHaveURL(/\/login\?/);
    await expect(
      page.getByText("Nie udało się rozpoznać linku. Zaloguj się ponownie."),
    ).toBeVisible();
  });
});
