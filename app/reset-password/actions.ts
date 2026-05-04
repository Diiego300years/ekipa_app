"use server";

import { headers } from "next/headers";

import type { AuthActionState, AuthFieldErrors } from "@/app/login/auth-state";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const invalidEmailMessage = "Wpisz poprawny adres email.";
const unavailablePasswordResetMessage =
  "Odzyskiwanie dostępu jest chwilowo niedostępne. Brakuje konfiguracji Supabase.";

type SupabaseAuthError = {
  message?: string;
  status?: number;
  code?: string;
};

function readEmail(formData: FormData) {
  const value = formData.get("email");

  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEmail(email: string, fieldErrors: AuthFieldErrors) {
  if (!email) {
    fieldErrors.email = "Podaj email.";
    return;
  }

  if (!isValidEmail(email)) {
    fieldErrors.email = invalidEmailMessage;
  }
}

function hasFieldErrors(fieldErrors: AuthFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function validationError(fieldErrors: AuthFieldErrors): AuthActionState {
  return {
    status: "error",
    message: "Popraw pola formularza.",
    fieldErrors,
  };
}

async function getRequestOrigin() {
  const requestHeaders = await headers();

  return requestHeaders.get("origin") ?? "http://localhost:3000";
}

function mapPasswordResetError(
  error: SupabaseAuthError,
  fallbackMessage: string,
) {
  const message = error.message?.toLowerCase() ?? "";

  if (
    error.status === 429 ||
    message.includes("rate limit") ||
    message.includes("too many")
  ) {
    return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
  }

  if (message.includes("invalid email")) {
    return invalidEmailMessage;
  }

  return fallbackMessage;
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readEmail(formData);
  const fieldErrors: AuthFieldErrors = {};

  validateEmail(email, fieldErrors);

  if (hasFieldErrors(fieldErrors)) {
    return validationError(fieldErrors);
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "error",
      message: unavailablePasswordResetMessage,
      fieldErrors: {},
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const origin = await getRequestOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?flow=recovery`,
    });

    if (error) {
      return {
        status: "error",
        message: mapPasswordResetError(
          error,
          "Nie udało się wysłać linku. Spróbuj ponownie.",
        ),
        fieldErrors: {},
      };
    }
  } catch {
    return {
      status: "error",
      message: "Nie udało się połączyć z Supabase. Spróbuj ponownie.",
      fieldErrors: {},
    };
  }

  return {
    status: "success",
    message:
      "Jeśli konto istnieje, wysłaliśmy link do zmiany hasła na podany email.",
    fieldErrors: {},
  };
}
