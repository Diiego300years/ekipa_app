import { expect, test } from "@playwright/test";

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

  test("renders the ideas page shell", async ({ page }) => {
    await page.goto("/ideas");

    await expect(
      page.getByRole("heading", { name: "Pomysły" }),
    ).toBeVisible();
    await expect(
      page.getByText("Najnowsze propozycje zapisane przez ekipę."),
    ).toBeVisible();

    await expect(async () => {
      const hasKnownState = await Promise.all([
        page
          .getByText("Pomysły będą dostępne po skonfigurowaniu Supabase.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie udało się wczytać pomysłów.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie ma jeszcze żadnych pomysłów.")
          .isVisible()
          .catch(() => false),
        page.locator("article").first().isVisible().catch(() => false),
      ]);

      expect(hasKnownState.some(Boolean)).toBe(true);
    }).toPass();
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

  test("renders the Polish voting ranking UI", async ({ page }) => {
    await page.goto("/voting");

    await expect(
      page.getByRole("heading", { name: "Głosowanie" }),
    ).toBeVisible();
    await expect(
      page.getByText("Ranking pokazuje, które pomysły mają najwięcej głosów."),
    ).toBeVisible();

    await expect(async () => {
      const hasKnownState = await Promise.all([
        page
          .getByText("Ranking będzie dostępny po skonfigurowaniu Supabase.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie udało się wczytać rankingu.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie ma jeszcze pomysłów do głosowania.")
          .isVisible()
          .catch(() => false),
        page
          .getByTestId("voting-ranking-item")
          .first()
          .isVisible()
          .catch(() => false),
      ]);

      expect(hasKnownState.some(Boolean)).toBe(true);
    }).toPass();
  });

  test("shows Polish login guidance when a guest uses a vote action", async ({
    page,
  }) => {
    await page.goto("/ideas");

    const voteAction = page.getByRole("link", { name: "Głosuj" }).first();
    const hasVoteAction = await voteAction.isVisible().catch(() => false);

    test.skip(
      !hasVoteAction,
      "Guest vote guidance needs at least one public idea with Supabase configured.",
    );

    await voteAction.click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("Zaloguj się, żeby oddać głos."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
  });

  test("shows Polish login guidance when a guest adds a comment", async ({
    page,
  }) => {
    await page.goto("/ideas");

    const commentForm = page.getByTestId("idea-comment-form").first();
    const hasCommentForm = await commentForm.isVisible().catch(() => false);

    test.skip(
      !hasCommentForm,
      "Guest comment guidance needs at least one public idea with comments enabled.",
    );

    await commentForm.getByLabel("Komentarz").fill("Komentarz gościa");
    await commentForm
      .getByRole("button", { name: "Dodaj komentarz" })
      .click();

    await expect(
      commentForm.getByText("Zaloguj się, żeby dodać komentarz."),
    ).toBeVisible();
    await expect(
      commentForm.getByRole("link", { name: "Przejdź do logowania" }),
    ).toHaveAttribute("href", /\/login/);
  });

  test("validates comment input in Polish", async ({ page }) => {
    await page.goto("/ideas");

    const commentForm = page.getByTestId("idea-comment-form").first();
    const hasCommentForm = await commentForm.isVisible().catch(() => false);

    test.skip(
      !hasCommentForm,
      "Comment validation needs at least one public idea with comments enabled.",
    );

    await commentForm
      .getByRole("button", { name: "Dodaj komentarz" })
      .click();
    await expect(
      commentForm.getByText("Komentarz jest wymagany."),
    ).toBeVisible();

    await commentForm.getByLabel("Komentarz").fill("   ");
    await commentForm
      .getByRole("button", { name: "Dodaj komentarz" })
      .click();
    await expect(
      commentForm.getByText("Komentarz nie może być pusty."),
    ).toBeVisible();

    await commentForm.getByLabel("Komentarz").fill("K".repeat(1001));
    await commentForm
      .getByRole("button", { name: "Dodaj komentarz" })
      .click();
    await expect(
      commentForm.getByText("Komentarz może mieć maksymalnie 1000 znaków."),
    ).toBeVisible();
  });

  test("renders the calendar shell", async ({ page }) => {
    await page.goto("/calendar");

    await expect(
      page.getByRole("heading", { name: "Kalendarz" }),
    ).toBeVisible();
    await expect(
      page.getByText("Terminy zaplanowane dla pomysłów ekipy."),
    ).toBeVisible();

    await expect(async () => {
      const hasKnownState = await Promise.all([
        page
          .getByText("Kalendarz będzie dostępny po skonfigurowaniu Supabase.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie udało się wczytać kalendarza.")
          .isVisible()
          .catch(() => false),
        page
          .getByText("Nie ma jeszcze zaplanowanych terminów.")
          .isVisible()
          .catch(() => false),
        page
          .getByTestId("calendar-event")
          .first()
          .isVisible()
          .catch(() => false),
      ]);

      expect(hasKnownState.some(Boolean)).toBe(true);
    }).toPass();
  });

  test("renders a Polish schedule not-found state", async ({ page }) => {
    await page.goto("/ideas/niepoprawny-identyfikator/schedule");

    await expect(
      page.getByRole("heading", { name: "Zaplanuj pomysł" }),
    ).toBeVisible();
    await expect(
      page.getByText("Nie znaleziono pomysłu do zaplanowania."),
    ).toBeVisible();
  });

  test("renders the add idea form", async ({ page }) => {
    await page.goto("/add");

    await expect(
      page.getByRole("heading", { name: "Dodaj pomysł" }),
    ).toBeVisible();
    await expect(page.getByLabel("Tytuł")).toBeVisible();
    await expect(page.getByLabel("Opis")).toBeVisible();
    await expect(page.getByLabel("Miejsce")).toBeVisible();
    await expect(page.getByLabel("Cena")).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Dodaj pomysł" }),
    ).toBeVisible();
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
