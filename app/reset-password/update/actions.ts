"use server";

import { redirect } from "next/navigation";

import type { AuthActionState, AuthFieldErrors } from "@/app/login/auth-state";
import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const minimumPasswordLength = 6;
const unavailablePasswordUpdateMessage =
  "Zmiana hasła jest chwilowo niedostępna. Brakuje konfiguracji Supabase.";

type SupabaseAuthError = {
  message?: string;
  status?: number;
  code?: string;
};

function readPassword(formData: FormData, field: "password" | "confirmPassword") {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
}

function validatePassword(password: string, fieldErrors: AuthFieldErrors) {
  if (!password) {
    fieldErrors.password = "Podaj nowe hasło.";
    return;
  }

  if (password.length < minimumPasswordLength) {
    fieldErrors.password = `Hasło musi mieć co najmniej ${minimumPasswordLength} znaków.`;
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

function mapPasswordUpdateError(
  error: SupabaseAuthError,
  fallbackMessage: string,
) {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  if (error.status === 429 || message.includes("rate limit")) {
    return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
  }

  if (
    code.includes("session_not_found") ||
    code.includes("auth_session_missing") ||
    message.includes("session") ||
    message.includes("jwt")
  ) {
    return "Link do zmiany hasła wygasł. Poproś o nowy link.";
  }

  if (code.includes("weak_password") || message.includes("weak password")) {
    return "Hasło jest zbyt słabe. Wpisz mocniejsze hasło.";
  }

  return fallbackMessage;
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = readPassword(formData, "password");
  const confirmPassword = readPassword(formData, "confirmPassword");
  const fieldErrors: AuthFieldErrors = {};

  validatePassword(password, fieldErrors);

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Powtórz nowe hasło.";
  } else if (password && confirmPassword !== password) {
    fieldErrors.confirmPassword = "Hasła muszą być takie same.";
  }

  if (hasFieldErrors(fieldErrors)) {
    return validationError(fieldErrors);
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "error",
      message: unavailablePasswordUpdateMessage,
      fieldErrors: {},
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return {
        status: "error",
        message: mapPasswordUpdateError(
          error,
          "Nie udało się zmienić hasła. Spróbuj ponownie.",
        ),
        fieldErrors: {},
      };
    }

    await supabase.auth.signOut();
  } catch {
    return {
      status: "error",
      message: "Nie udało się połączyć z Supabase. Spróbuj ponownie.",
      fieldErrors: {},
    };
  }

  redirect(
    appendAuthRedirectMessage(
      "/login",
      "success",
      "Hasło zostało zmienione. Zaloguj się ponownie.",
    ),
  );
}
