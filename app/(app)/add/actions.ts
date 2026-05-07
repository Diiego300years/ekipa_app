"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateIdeaFormData } from "@/lib/idea-form-validation";
import { measureServerTiming } from "@/lib/performance/server-timing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { AddIdeaActionState } from "./add-idea-state";

type CreatedIdeaRow = {
  id: string;
};

export async function createIdeaAction(
  _previousState: AddIdeaActionState,
  formData: FormData,
): Promise<AddIdeaActionState> {
  const validation = validateIdeaFormData(formData);

  if (validation.status === "invalid") {
    return {
      status: "error",
      message: "Popraw pola formularza.",
      fieldErrors: validation.fieldErrors,
    };
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "auth-required",
      message: "Zaloguj się, żeby dodać prawdziwy pomysł.",
      fieldErrors: {},
    };
  }

  let redirectPath = "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.ideas.getUserForCreate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return {
        status: "auth-required",
        message: "Zaloguj się, żeby dodać prawdziwy pomysł.",
        fieldErrors: {},
      };
    }

    const { data, error } = await measureServerTiming(
      "supabase.ideas.create",
      () =>
        supabase
          .from("ideas")
          .insert({
            title: validation.values.title,
            description: validation.values.description,
            location: validation.values.location,
            price: validation.values.price,
            created_by: user.id,
          })
          .select("id")
          .single<CreatedIdeaRow>(),
    );

    if (error || !data) {
      return {
        status: "error",
        message: "Nie udało się zapisać pomysłu. Spróbuj ponownie.",
        fieldErrors: {},
      };
    }

    revalidatePath("/ideas");
    revalidatePath("/voting");
    redirectPath = `/ideas/${data.id}/schedule?from=created`;
  } catch {
    return {
      status: "error",
      message: "Nie udało się zapisać pomysłu. Spróbuj ponownie.",
      fieldErrors: {},
    };
  }

  redirect(redirectPath);
}
