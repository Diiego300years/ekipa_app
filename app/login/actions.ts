"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { upsertOwnProfile } from "@/lib/supabase/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AuthActionState, AuthFieldErrors } from "./auth-state";

const minimumPasswordLength = 6;
const invalidEmailMessage = "Wpisz poprawny adres email.";
const unavailableLoginMessage =
  "Logowanie jest chwilowo niedostępne. Brakuje konfiguracji Supabase.";
const unavailableRegistrationMessage =
  "Rejestracja jest chwilowo niedostępna. Brakuje konfiguracji Supabase.";

type SupabaseAuthError = {
  message?: string;
  status?: number;
  code?: string;
};

function readEmail(formData: FormData) {
  const value = formData.get("email");

  return typeof value === "string" ? value.trim() : "";
}

function readDisplayName(formData: FormData) {
  const value = formData.get("displayName");

  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData, field: "password" | "confirmPassword") {
  const value = formData.get(field);

  return typeof value === "string" ? value : "";
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

function validateDisplayName(
  displayName: string,
  fieldErrors: AuthFieldErrors,
) {
  if (!displayName) {
    fieldErrors.displayName = "Podaj nazwę wyświetlaną.";
  }
}

function validatePassword(password: string, fieldErrors: AuthFieldErrors) {
  if (!password) {
    fieldErrors.password = "Podaj hasło.";
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

async function getRequestOrigin() {
  const requestHeaders = await headers();

  return requestHeaders.get("origin") ?? "http://localhost:3000";
}

function mapSupabaseError(error: SupabaseAuthError, fallbackMessage: string) {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";

  if (error.status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
  }

  if (
    code.includes("invalid_credentials") ||
    message.includes("invalid login credentials")
  ) {
    return "Nieprawidłowy email lub hasło.";
  }

  if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
    return "Konto nie zostało jeszcze potwierdzone. Sprawdź email.";
  }

  if (
    code.includes("user_already_exists") ||
    message.includes("already registered") ||
    message.includes("already exists")
  ) {
    return "Konto dla tego adresu email już istnieje.";
  }

  if (code.includes("weak_password") || message.includes("weak password")) {
    return "Hasło jest zbyt słabe. Wpisz mocniejsze hasło.";
  }

  if (message.includes("signup is disabled")) {
    return "Rejestracja jest obecnie wyłączona.";
  }

  return fallbackMessage;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readEmail(formData);
  const password = readPassword(formData, "password");
  const fieldErrors: AuthFieldErrors = {};

  validateEmail(email, fieldErrors);
  validatePassword(password, fieldErrors);

  if (hasFieldErrors(fieldErrors)) {
    return validationError(fieldErrors);
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "error",
      message: unavailableLoginMessage,
      fieldErrors: {},
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        status: "error",
        message: mapSupabaseError(error, "Nie udało się zalogować. Spróbuj ponownie."),
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

  redirect("/ideas");
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const displayName = readDisplayName(formData);
  const email = readEmail(formData);
  const password = readPassword(formData, "password");
  const confirmPassword = readPassword(formData, "confirmPassword");
  const fieldErrors: AuthFieldErrors = {};

  validateDisplayName(displayName, fieldErrors);
  validateEmail(email, fieldErrors);
  validatePassword(password, fieldErrors);

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Powtórz hasło.";
  } else if (password && confirmPassword !== password) {
    fieldErrors.confirmPassword = "Hasła muszą być takie same.";
  }

  if (hasFieldErrors(fieldErrors)) {
    return validationError(fieldErrors);
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "error",
      message: unavailableRegistrationMessage,
      fieldErrors: {},
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const origin = await getRequestOrigin();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${origin}/auth/callback?flow=signup`,
      },
    });

    if (error) {
      return {
        status: "error",
        message: mapSupabaseError(
          error,
          "Nie udało się utworzyć konta. Spróbuj ponownie.",
        ),
        fieldErrors: {},
      };
    }

    if (data.session && data.user) {
      const { error: profileError } = await upsertOwnProfile(
        supabase,
        data.user.id,
        displayName,
      );

      if (profileError) {
        return {
          status: "error",
          message:
            "Konto zostało utworzone, ale nie udało się zapisać nazwy. Spróbuj ponownie za chwilę.",
          fieldErrors: {},
        };
      }
    }

    if (!data.session) {
      return {
        status: "success",
        message:
          "Konto zostało utworzone. Sprawdź email, aby potwierdzić rejestrację.",
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

  redirect("/ideas");
}
