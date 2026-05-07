import { defineConfig, devices } from "@playwright/test";

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const baseURL = configuredBaseURL || "http://127.0.0.1:3000";
const useExternalBaseURL = Boolean(configuredBaseURL);

export default defineConfig({
  testDir: "./tests/performance",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: useExternalBaseURL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "performance-mobile-chromium",
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
});
