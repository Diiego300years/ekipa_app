"use server";

import { revalidatePath } from "next/cache";

import { measureServerTiming } from "@/lib/performance/server-timing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  CommentActionState,
  CommentFieldErrors,
  CreatedIdeaComment,
} from "./comment-state";
import type { ConfirmedVoteState, VoteActionResult } from "./vote-state";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const commentBodyMaxLength = 1000;

type SupabaseMutationError = {
  code?: string;
};

type ConfirmedVoteRow = {
  user_id: string;
};

type CreatedIdeaCommentRow = {
  id: string;
  idea_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function voteActionError(
  status: "error" | "auth-required",
  message: string,
  ideaId?: string,
): VoteActionResult {
  return {
    status,
    ideaId,
    message,
  };
}

function voteActionSuccess(
  confirmedState: ConfirmedVoteState,
  message: string,
): VoteActionResult {
  return {
    status: "success",
    message,
    ...confirmedState,
  };
}

async function getConfirmedVoteState(
  supabase: SupabaseServerClient,
  ideaId: string,
  userId: string,
): Promise<ConfirmedVoteState | null> {
  const { data, error } = await measureServerTiming(
    "supabase.votes.confirmedState",
    () => supabase.from("votes").select("user_id").eq("idea_id", ideaId),
  );

  if (error) {
    return null;
  }

  const voteRows = (data ?? []) as ConfirmedVoteRow[];

  return {
    ideaId,
    voteCount: voteRows.length,
    hasCurrentUserVote: voteRows.some((vote) => vote.user_id === userId),
  };
}

function readIdeaId(formData: FormData) {
  const value = formData.get("ideaId");

  return typeof value === "string" ? value.trim() : "";
}

function readCommentBody(formData: FormData) {
  const value = formData.get("body");

  return typeof value === "string" ? value : null;
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

function commentFormSuccess(
  message: string,
  comment: CreatedIdeaComment,
): CommentActionState {
  return {
    status: "success",
    message,
    fieldErrors: {},
    comment,
  };
}

function commentAuthRequired(): CommentActionState {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby dodać komentarz.",
    fieldErrors: {},
  };
}

export async function voteForIdeaAction(
  formData: FormData,
): Promise<VoteActionResult> {
  const ideaId = readIdeaId(formData);

  if (!uuidPattern.test(ideaId)) {
    return voteActionError(
      "error",
      "Nie udało się oddać głosu. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return voteActionError(
      "error",
      "Głosowanie będzie dostępne po skonfigurowaniu Supabase.",
      ideaId,
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.votes.getUserForCreate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return voteActionError(
        "auth-required",
        "Zaloguj się, żeby oddać głos.",
        ideaId,
      );
    }

    const { error } = await measureServerTiming(
      "supabase.votes.create",
      () =>
        supabase.from("votes").insert({
          idea_id: ideaId,
          user_id: user.id,
        }),
    );

    const confirmedState = await getConfirmedVoteState(
      supabase,
      ideaId,
      user.id,
    );

    if (!confirmedState) {
      return voteActionError(
        "error",
        "Nie udało się potwierdzić wyniku głosowania. Odśwież stronę.",
        ideaId,
      );
    }

    if (error) {
      const mutationError = error as SupabaseMutationError;

      if (
        mutationError.code === "23505" &&
        confirmedState.hasCurrentUserVote
      ) {
        return voteActionSuccess(
          confirmedState,
          "Oddano już głos na ten pomysł.",
        );
      }

      return voteActionError(
        "error",
        "Nie udało się oddać głosu. Spróbuj ponownie.",
        ideaId,
      );
    }

    if (!confirmedState.hasCurrentUserVote) {
      return voteActionError(
        "error",
        "Nie udało się potwierdzić oddanego głosu. Odśwież stronę.",
        ideaId,
      );
    }

    revalidatePath("/voting");

    return voteActionSuccess(confirmedState, "Głos został oddany.");
  } catch {
    return voteActionError(
      "error",
      "Nie udało się oddać głosu. Spróbuj ponownie.",
      ideaId,
    );
  }
}

export async function removeVoteForIdeaAction(
  formData: FormData,
): Promise<VoteActionResult> {
  const ideaId = readIdeaId(formData);

  if (!uuidPattern.test(ideaId)) {
    return voteActionError(
      "error",
      "Nie udało się cofnąć głosu. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return voteActionError(
      "error",
      "Głosowanie będzie dostępne po skonfigurowaniu Supabase.",
      ideaId,
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.votes.getUserForDelete", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return voteActionError(
        "auth-required",
        "Zaloguj się, żeby cofnąć głos.",
        ideaId,
      );
    }

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
      return voteActionError(
        "error",
        "Nie udało się cofnąć głosu. Spróbuj ponownie.",
        ideaId,
      );
    }

    const confirmedState = await getConfirmedVoteState(
      supabase,
      ideaId,
      user.id,
    );

    if (!confirmedState) {
      return voteActionError(
        "error",
        "Nie udało się potwierdzić wyniku głosowania. Odśwież stronę.",
        ideaId,
      );
    }

    if (confirmedState.hasCurrentUserVote) {
      return voteActionError(
        "error",
        "Nie udało się potwierdzić cofnięcia głosu. Odśwież stronę.",
        ideaId,
      );
    }

    revalidatePath("/voting");

    return voteActionSuccess(confirmedState, "Głos został cofnięty.");
  } catch {
    return voteActionError(
      "error",
      "Nie udało się cofnąć głosu. Spróbuj ponownie.",
      ideaId,
    );
  }
}

export async function createIdeaCommentAction(
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

    const { data, error } = await measureServerTiming(
      "supabase.comments.create",
      () =>
        supabase
          .from("idea_comments")
          .insert({
            idea_id: ideaId,
            user_id: user.id,
            body,
          })
          .select("id,idea_id,body,created_at,updated_at")
          .single<CreatedIdeaCommentRow>(),
    );

    if (error || !data) {
      return commentFormError(
        "Nie udało się dodać komentarza. Spróbuj ponownie.",
      );
    }

    return commentFormSuccess("Komentarz został dodany.", {
      id: data.id,
      ideaId: data.idea_id,
      body: data.body,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch {
    return commentFormError(
      "Nie udało się dodać komentarza. Spróbuj ponownie.",
    );
  }
}
