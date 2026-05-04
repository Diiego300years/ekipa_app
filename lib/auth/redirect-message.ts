export type AuthRedirectStatus = "error" | "success";

export type AuthRedirectMessage = {
  status: AuthRedirectStatus;
  message: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function appendAuthRedirectMessage(
  path: string,
  status: AuthRedirectStatus,
  message: string,
) {
  const separator = path.includes("?") ? "&" : "?";

  return `${path}${separator}authStatus=${status}&authMessage=${encodeURIComponent(
    message,
  )}`;
}

export function readAuthRedirectMessage(
  searchParams: SearchParams,
): AuthRedirectMessage | null {
  const rawStatus = firstSearchParam(searchParams.authStatus);
  const rawMessage = firstSearchParam(searchParams.authMessage);

  if (!rawMessage) {
    return null;
  }

  let message = rawMessage;

  try {
    message = decodeURIComponent(rawMessage);
  } catch {
    message = rawMessage;
  }

  return {
    status: rawStatus === "success" ? "success" : "error",
    message,
  };
}
