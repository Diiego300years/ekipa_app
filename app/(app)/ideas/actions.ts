"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { measureServerTiming } from "@/lib/performance/server-timing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { CommentActionState, CommentFieldErrors } from "./comment-state";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const commentBodyMaxLength = 1000;

type SupabaseMutationError = {
  code?: string;
};

function readIdeaId(formData: FormData) {
  const value = formData.get("ideaId");

  return typeof value === "string" ? value.trim() : "";
}

function readCommentBody(formData: FormData) {
  const value = formData.get("body");

  return typeof value === "string" ? value : null;
}

function ideasRedirect(status: "error" | "success", message: string) {
  return appendAuthRedirectMessage("/ideas", status, message);
}

function hasCommentFieldErrors(fieldErrors: CommentFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function commentFormError(
  message: string,
  fieldErrors: CommentFieldErrors = {},
): CommentActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

function commentAuthRequired(): CommentActionState {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby dodać komentarz.",
    fieldErrors: {},
  };
}

export async function voteForIdeaAction(formData: FormData) {
  const ideaId = readIdeaId(formData);

  if (!uuidPattern.test(ideaId)) {
    redirect(
      ideasRedirect("error", "Nie udało się oddać głosu. Spróbuj ponownie."),
    );
  }

  if (!getSupabasePublicConfig()) {
    redirect(
      ideasRedirect(
        "error",
        "Głosowanie będzie dostępne po skonfigurowaniu Supabase.",
      ),
    );
  }

  let redirectPath = ideasRedirect(
    "error",
    "Nie udało się oddać głosu. Spróbuj ponownie.",
  );

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.votes.getUserForCreate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      redirectPath = appendAuthRedirectMessage(
        "/login",
        "error",
        "Zaloguj się, żeby oddać głos.",
      );
    } else {
      const { error } = await measureServerTiming(
        "supabase.votes.create",
        () =>
          supabase.from("votes").insert({
            idea_id: ideaId,
            user_id: user.id,
          }),
      );

      if (error) {
        const mutationError = error as SupabaseMutationError;

        redirectPath =
          mutationError.code === "23505"
            ? ideasRedirect("success", "Oddano już głos na ten pomysł.")
            : ideasRedirect(
                "error",
                "Nie udało się oddać głosu. Spróbuj ponownie.",
              );
      } else {
        revalidatePath("/ideas");
        revalidatePath("/voting");
        redirectPath = ideasRedirect("success", "Głos został oddany.");
      }
    }
  } catch {
    redirectPath = ideasRedirect(
      "error",
      "Nie udało się oddać głosu. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}

export async function removeVoteForIdeaAction(formData: FormData) {
  const ideaId = readIdeaId(formData);

  if (!uuidPattern.test(ideaId)) {
    redirect(
      ideasRedirect("error", "Nie udało się cofnąć głosu. Spróbuj ponownie."),
    );
  }

  if (!getSupabasePublicConfig()) {
    redirect(
      ideasRedirect(
        "error",
        "Głosowanie będzie dostępne po skonfigurowaniu Supabase.",
      ),
    );
  }

  let redirectPath = ideasRedirect(
    "error",
    "Nie udało się cofnąć głosu. Spróbuj ponownie.",
  );

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.votes.getUserForDelete", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      redirectPath = appendAuthRedirectMessage(
        "/login",
        "error",
        "Zaloguj się, żeby cofnąć głos.",
      );
    } else {
      const { error } = await measureServerTiming(
        "supabase.votes.delete",
        () =>
          supabase
            .from("votes")
            .delete()
            .eq("idea_id", ideaId)
            .eq("user_id", user.id),
      );

      if (error) {
        redirectPath = ideasRedirect(
          "error",
          "Nie udało się cofnąć głosu. Spróbuj ponownie.",
        );
      } else {
        revalidatePath("/ideas");
        revalidatePath("/voting");
        redirectPath = ideasRedirect("success", "Głos został cofnięty.");
      }
    }
  } catch {
    redirectPath = ideasRedirect(
      "error",
      "Nie udało się cofnąć głosu. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}

export async function createIdeaCommentAction(
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const ideaId = readIdeaId(formData);
  const rawBody = readCommentBody(formData);
  const fieldErrors: CommentFieldErrors = {};

  if (!rawBody) {
    fieldErrors.body = "Komentarz jest wymagany.";
  } else {
    const body = rawBody.trim();

    if (!body) {
      fieldErrors.body = "Komentarz nie może być pusty.";
    } else if (body.length > commentBodyMaxLength) {
      fieldErrors.body = `Komentarz może mieć maksymalnie ${commentBodyMaxLength} znaków.`;
    }
  }

  if (hasCommentFieldErrors(fieldErrors)) {
    return commentFormError("Popraw pola formularza.", fieldErrors);
  }

  if (!uuidPattern.test(ideaId)) {
    return commentFormError(
      "Nie udało się dodać komentarza. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return commentAuthRequired();
  }

  const body = rawBody?.trim() ?? "";
  let redirectPath = "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.comments.getUserForCreate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return commentAuthRequired();
    }

    const { error } = await measureServerTiming(
      "supabase.comments.create",
      () =>
        supabase.from("idea_comments").insert({
          idea_id: ideaId,
          user_id: user.id,
          body,
        }),
    );

    if (error) {
      return commentFormError(
        "Nie udało się dodać komentarza. Spróbuj ponownie.",
      );
    }

    revalidatePath("/ideas");
    redirectPath = ideasRedirect("success", "Komentarz został dodany.");
  } catch {
    return commentFormError(
      "Nie udało się dodać komentarza. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}
