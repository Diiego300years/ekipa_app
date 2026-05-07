const SW_VERSION = "2026-05-push-v1";
const FALLBACK_NOTIFICATION_URL = "/ideas";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = cleanText(payload.title, "Ekipa");
  const body = cleanText(payload.body, "Masz nowe powiadomienie.");
  const url = getSafeAppUrl(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      badge: "/icon-192.png",
      body,
      data: {
        swVersion: SW_VERSION,
        url,
      },
      icon: "/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = getSafeAppUrl(event.notification.data?.url);

  event.waitUntil(openOrFocusAppUrl(url));
});

function readPushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json();
  } catch {
    return {};
  }
}

function cleanText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getSafeAppUrl(value) {
  try {
    const url =
      typeof value === "string" && value.trim()
        ? new URL(value, self.location.origin)
        : new URL(FALLBACK_NOTIFICATION_URL, self.location.origin);

    if (url.origin !== self.location.origin) {
      return new URL(FALLBACK_NOTIFICATION_URL, self.location.origin).href;
    }

    return url.href;
  } catch {
    return new URL(FALLBACK_NOTIFICATION_URL, self.location.origin).href;
  }
}

async function openOrFocusAppUrl(url) {
  const targetUrl = new URL(url);
  const windowClients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });

  for (const client of windowClients) {
    const clientUrl = new URL(client.url);

    if (clientUrl.origin !== targetUrl.origin) {
      continue;
    }

    if ("navigate" in client) {
      await client.navigate(targetUrl.href);
    }

    await client.focus();
    return;
  }

  await self.clients.openWindow(targetUrl.href);
}
