import { test } from "@playwright/test";

import { measuredRoutes, waitForRouteReady } from "./support/routes";
import { getPerformanceTargetLabel, measureAndLog } from "./support/timing";

test.describe("route performance diagnostics", () => {
  test.beforeAll(() => {
    console.log(`[perf] target: ${getPerformanceTargetLabel()}`);
  });

  for (const path of measuredRoutes) {
    test(`measures ${path} load time`, async ({ page }) => {
      await measureAndLog(`route ${path}`, "route", async () => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await waitForRouteReady(page, path);
      });
    });
  }
});
