import { expect, test } from "@playwright/test";

import { getTestEnv, hasSupabasePublicTestConfig } from "./support/test-env";

const authEmail = getTestEnv("E2E_AUTH_EMAIL");
const authPassword = getTestEnv("E2E_AUTH_PASSWORD");
const registrationDomain = getTestEnv("E2E_AUTH_REGISTER_EMAIL_DOMAIN");
const registrationPassword = getTestEnv("E2E_AUTH_REGISTER_PASSWORD");
const resetEmail = getTestEnv("E2E_AUTH_RESET_EMAIL");

function createRegistrationEmail(domain: string) {
  const cleanDomain = domain.replace(/^@/, "");
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `ekipa-test-${uniquePart}@${cleanDomain}`;
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
