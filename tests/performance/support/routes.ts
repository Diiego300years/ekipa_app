import { expect, type Locator, type Page } from "@playwright/test";

type RouteDiagnostics = {
  heading: string;
  knownStates: (page: Page) => Locator[];
  requiredStates?: (page: Page) => Locator[];
};

const routes: Record<string, RouteDiagnostics> = {
  "/ideas": {
    heading: "Pomysły",
    knownStates: (page: Page) => [
      page.getByText("Pomysły będą dostępne po skonfigurowaniu Supabase."),
      page.getByText("Nie udało się wczytać pomysłów."),
      page.getByText("Nie ma jeszcze żadnych pomysłów."),
      page.getByTestId("idea-card").first(),
    ],
  },
  "/voting": {
    heading: "Głosowanie",
    knownStates: (page: Page) => [
      page.getByText("Ranking będzie dostępny po skonfigurowaniu Supabase."),
      page.getByText("Nie udało się wczytać rankingu."),
      page.getByText("Nie ma jeszcze pomysłów do głosowania."),
      page.getByTestId("voting-ranking-item").first(),
    ],
  },
  "/calendar": {
    heading: "Kalendarz",
    requiredStates: (page: Page) => [
      page.getByTestId("calendar-grid"),
      page.getByTestId("calendar-selected-events"),
    ],
    knownStates: (page: Page) => [
      page.getByText("Kalendarz będzie dostępny po skonfigurowaniu Supabase."),
      page.getByText("Nie udało się wczytać kalendarza."),
      page.getByText("Nie ma jeszcze zaplanowanych terminów."),
      page.getByTestId("calendar-event").first(),
      page.getByTestId("calendar-day").first(),
    ],
  },
} satisfies Record<string, RouteDiagnostics>;

export const measuredRoutes = Object.keys(routes);

export async function waitForRouteReady(page: Page, path: string) {
  const route = routes[path];

  if (!route) {
    throw new Error(`No performance route diagnostics configured for ${path}.`);
  }

  await expect(
    page.getByRole("heading", { name: route.heading }),
  ).toBeVisible({ timeout: 15_000 });

  for (const locator of route.requiredStates?.(page) ?? []) {
    await expect(locator).toBeVisible({ timeout: 15_000 });
  }

  await expect(async () => {
    const visibleStates = await Promise.all(
      route
        .knownStates(page)
        .map((locator) => locator.isVisible().catch(() => false)),
    );

    expect(visibleStates.some(Boolean)).toBe(true);
  }).toPass({ timeout: 15_000 });
}
