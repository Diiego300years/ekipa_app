"use server";

import { redirect } from "next/navigation";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { ideaLimits } from "@/lib/supabase/ideas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AddIdeaActionState, AddIdeaFieldErrors } from "./add-idea-state";

type ParsedPrice =
  | {
      value: number | null;
    }
  | {
      error: string;
    };

const maxDatabasePrice = 99_999_999.99;

function readFormText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function parsePriceInput(input: string): ParsedPrice {
  const compactPrice = input.toLowerCase().replace(/\s/g, "");

  if (!compactPrice) {
    return {
      value: null,
    };
  }

  const withoutCurrency = compactPrice.endsWith("zł")
    ? compactPrice.slice(0, -2)
    : compactPrice;
  const normalizedPrice = withoutCurrency.replace(",", ".");

  if (normalizedPrice.startsWith("-")) {
    return {
      error: "Cena nie może być ujemna.",
    };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedPrice)) {
    return {
      error: "Wpisz poprawną cenę.",
    };
  }

  const price = Number(normalizedPrice);

  if (!Number.isFinite(price)) {
    return {
      error: "Wpisz poprawną cenę.",
    };
  }

  if (price > maxDatabasePrice) {
    return {
      error: "Cena jest za wysoka.",
    };
  }

  return {
    value: Math.round(price * 100) / 100,
  };
}

function hasFieldErrors(fieldErrors: AddIdeaFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

export async function createIdeaAction(
  _previousState: AddIdeaActionState,
  formData: FormData,
): Promise<AddIdeaActionState> {
  const title = readFormText(formData, "title");
  const description = readFormText(formData, "description");
  const location = readFormText(formData, "location");
  const priceInput = readFormText(formData, "price");
  const fieldErrors: AddIdeaFieldErrors = {};

  if (!title) {
    fieldErrors.title = "Podaj tytuł pomysłu.";
  } else if (title.length > ideaLimits.title) {
    fieldErrors.title = `Tytuł może mieć maksymalnie ${ideaLimits.title} znaków.`;
  }

  if (description.length > ideaLimits.description) {
    fieldErrors.description = `Opis może mieć maksymalnie ${ideaLimits.description} znaków.`;
  }

  if (location.length > ideaLimits.location) {
    fieldErrors.location = `Miejsce może mieć maksymalnie ${ideaLimits.location} znaków.`;
  }

  const parsedPrice = parsePriceInput(priceInput);

  if ("error" in parsedPrice) {
    fieldErrors.price = parsedPrice.error;
  }

  if (hasFieldErrors(fieldErrors)) {
    return {
      status: "error",
      message: "Popraw pola formularza.",
      fieldErrors,
    };
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "auth-required",
      message: "Zaloguj się, żeby dodać prawdziwy pomysł.",
      fieldErrors: {},
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        status: "auth-required",
        message: "Zaloguj się, żeby dodać prawdziwy pomysł.",
        fieldErrors: {},
      };
    }

    const { error } = await supabase.from("ideas").insert({
      title,
      description: description || null,
      location: location || null,
      price: "value" in parsedPrice ? parsedPrice.value : null,
      created_by: user.id,
    });

    if (error) {
      return {
        status: "error",
        message: "Nie udało się zapisać pomysłu. Spróbuj ponownie.",
        fieldErrors: {},
      };
    }
  } catch {
    return {
      status: "error",
      message: "Nie udało się zapisać pomysłu. Spróbuj ponownie.",
      fieldErrors: {},
    };
  }

  redirect(
    appendAuthRedirectMessage("/ideas", "success", "Pomysł został dodany."),
  );
}
