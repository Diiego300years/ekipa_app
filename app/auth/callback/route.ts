import { NextResponse, type NextRequest } from "next/server";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CallbackFlow = "recovery" | "signup" | "unknown";

function redirectWithAuthMessage(
  request: NextRequest,
  path: string,
  status: "error" | "success",
  message: string,
) {
  return NextResponse.redirect(
    new URL(appendAuthRedirectMessage(path, status, message), request.url),
  );
}

function detectCallbackFlow(searchParams: URLSearchParams): CallbackFlow {
  const candidates = [
    searchParams.get("flow"),
    searchParams.get("type"),
  ].flatMap((value) => (value ? [value.toLowerCase()] : []));

  if (
    candidates.some(
      (value) => value.includes("recovery") || value.includes("reset"),
    )
  ) {
    return "recovery";
  }

  if (
    candidates.some(
      (value) =>
        value.includes("signup") ||
        value.includes("confirm") ||
        value.includes("email"),
    )
  ) {
    return "signup";
  }

  return "unknown";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const flow = detectCallbackFlow(requestUrl.searchParams);

  if (flow === "unknown") {
    return redirectWithAuthMessage(
      request,
      "/login",
      "error",
      "Nie udało się rozpoznać linku. Zaloguj się ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return redirectWithAuthMessage(
      request,
      "/login",
      "error",
      "Ten link jest chwilowo niedostępny. Brakuje konfiguracji Supabase.",
    );
  }

  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return redirectWithAuthMessage(
      request,
      "/login",
      "error",
      "Link jest nieprawidłowy albo wygasł. Poproś o nowy link.",
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectWithAuthMessage(
        request,
        "/login",
        "error",
        "Link jest nieprawidłowy albo wygasł. Poproś o nowy link.",
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (flow === "recovery") {
      if (!session) {
        return redirectWithAuthMessage(
          request,
          "/login",
          "error",
          "Link do zmiany hasła wygasł. Poproś o nowy link.",
        );
      }

      return NextResponse.redirect(
        new URL("/reset-password/update", request.url),
      );
    }

    if (session) {
      return redirectWithAuthMessage(
        request,
        "/ideas",
        "success",
        "Konto zostało potwierdzone.",
      );
    }

    return redirectWithAuthMessage(
      request,
      "/login",
      "success",
      "Konto zostało potwierdzone. Możesz się zalogować.",
    );
  } catch {
    return redirectWithAuthMessage(
      request,
      "/login",
      "error",
      "Nie udało się obsłużyć linku. Spróbuj ponownie.",
    );
  }
}
