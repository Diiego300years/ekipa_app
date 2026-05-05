import type { Page, Route } from "@playwright/test";

export async function holdNextPost(page: Page, url: string | RegExp = "**/*") {
  let hasHeldPost = false;
  let releasePost: () => void = () => {};
  let markPostStarted: () => void = () => {};
  const postStarted = new Promise<void>((resolve) => {
    markPostStarted = resolve;
  });
  const postReleased = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  const routeHandler = async (route: Route) => {
    if (!hasHeldPost && route.request().method() === "POST") {
      hasHeldPost = true;
      markPostStarted();
      await postReleased;
    }

    await route.continue();
  };

  await page.route(url, routeHandler);

  return {
    postStarted,
    release: releasePost,
    async cleanup() {
      releasePost();
      await page.unroute(url, routeHandler);
    },
  };
}
