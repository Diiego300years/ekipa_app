export type NewIdeaPushPayloadInput = {
  authorDisplayName: string;
  ideaTitle: string;
};

export type ScheduledEventPushPayloadInput = {
  ideaTitle: string;
};

export type IdeaVotePushPayloadInput = {
  voterDisplayName: string;
  ideaTitle: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url: string;
};

const fallbackDisplayName = "Użytkownik";
const fallbackIdeaTitle = "nowy pomysł";
const ideasTargetUrl = "/ideas";
const calendarTargetUrl = "/calendar";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profileIdFallbackPattern = /^user-[0-9a-f]{8}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailLocalPartLikePattern = /^[a-z0-9._%+-]+$/;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizePushDisplayName(value: string, maxLength: number) {
  const displayName = normalizeWhitespace(value);

  if (
    !displayName ||
    emailPattern.test(displayName) ||
    uuidPattern.test(displayName) ||
    profileIdFallbackPattern.test(displayName) ||
    (displayName === displayName.toLowerCase() &&
      emailLocalPartLikePattern.test(displayName))
  ) {
    return fallbackDisplayName;
  }

  return sanitizePushText(displayName, fallbackDisplayName, maxLength);
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
  const displayName = sanitizePushDisplayName(authorDisplayName, 60);
  const title = sanitizePushText(ideaTitle, fallbackIdeaTitle, 80);

  return {
    title: "Nowy pomysł",
    body: `${displayName} dodał(a) pomysł: ${title}`,
    url: ideasTargetUrl,
  };
}

export function createScheduledEventPushPayload({
  ideaTitle,
}: ScheduledEventPushPayloadInput): PushNotificationPayload {
  const title = sanitizePushText(ideaTitle, fallbackIdeaTitle, 80);

  return {
    title: "Nowy termin",
    body: `Nowy termin dla pomysłu: ${title}`,
    url: calendarTargetUrl,
  };
}

export function createIdeaVotePushPayload({
  voterDisplayName,
  ideaTitle,
}: IdeaVotePushPayloadInput): PushNotificationPayload {
  const displayName = sanitizePushDisplayName(voterDisplayName, 60);
  const title = sanitizePushText(ideaTitle, fallbackIdeaTitle, 80);
  const voterLabel =
    displayName === fallbackDisplayName
      ? fallbackDisplayName
      : `Użytkownik ${displayName}`;

  return {
    title: "Nowy głos",
    body: `${voterLabel} oddał głos na Twój pomysł: ${title}`,
    url: ideasTargetUrl,
  };
}
