export type NewIdeaPushPayloadInput = {
  authorDisplayName: string;
  ideaTitle: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
};

const fallbackDisplayName = "Użytkownik";
const fallbackIdeaTitle = "nowy pomysł";
const targetUrl = "/ideas";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizePushText(value: string, fallback: string, maxLength: number) {
  const cleanValue = normalizeWhitespace(value) || fallback;

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function isValidVapidSubject(subject: string) {
  return subject.startsWith("mailto:") || subject.startsWith("https://");
}

export function createNewIdeaPushPayload({
  authorDisplayName,
  ideaTitle,
}: NewIdeaPushPayloadInput): PushNotificationPayload {
  const displayName = sanitizePushText(
    authorDisplayName,
    fallbackDisplayName,
    60,
  );
  const title = sanitizePushText(ideaTitle, fallbackIdeaTitle, 80);

  return {
    title: "Nowy pomysł",
    body: `${displayName} dodał(a) pomysł: ${title}`,
    url: targetUrl,
  };
}
