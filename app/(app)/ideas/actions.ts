"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { validateIdeaFormData } from "@/lib/idea-form-validation";
import { measureServerTiming } from "@/lib/performance/server-timing";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  CommentActionState,
  CommentFieldErrors,
  CreatedIdeaComment,
} from "./comment-state";
import type { EditIdeaActionState } from "./edit-idea-state";
import type { OwnerIdeaActionState } from "./owner-action-state";
import type { ConfirmedVoteState, VoteActionResult } from "./vote-state";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const commentBodyMaxLength = 1000;

type SupabaseMutationError = {
  code?: string;
};

type CurrentUserVoteRow = {
  idea_id: string;
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
  expectedHasCurrentUserVote?: boolean,
): Promise<ConfirmedVoteState | null> {
  const voteCountPromise = measureServerTiming(
    "supabase.votes.confirmedCount",
    () =>
      supabase
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("idea_id", ideaId),
  );
  const currentUserVotePromise =
    expectedHasCurrentUserVote === undefined
      ? measureServerTiming("supabase.votes.confirmedCurrentUser", () =>
          supabase
            .from("votes")
            .select("idea_id")
            .eq("idea_id", ideaId)
            .eq("user_id", userId)
            .limit(1),
        )
      : Promise.resolve({
          data: [] as CurrentUserVoteRow[],
          error: null,
          hasCurrentUserVote: expectedHasCurrentUserVote,
        });
  const [voteCountResult, currentUserVoteResult] = await Promise.all([
    voteCountPromise,
    currentUserVotePromise,
  ]);

  if (voteCountResult.error || currentUserVoteResult.error) {
    return null;
  }

  const hasCurrentUserVote =
    "hasCurrentUserVote" in currentUserVoteResult
      ? currentUserVoteResult.hasCurrentUserVote
      : ((currentUserVoteResult.data ?? []) as CurrentUserVoteRow[]).some(
          (vote) => vote.idea_id === ideaId,
        );

  return {
    ideaId,
    voteCount: voteCountResult.count ?? 0,
    hasCurrentUserVote,
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

function ownerIdeaActionError(message: string): OwnerIdeaActionState {
  return {
    status: "error",
    message,
  };
}

function ownerIdeaAuthRequired(message: string): OwnerIdeaActionState {
  return {
    status: "auth-required",
    message,
  };
}

function editIdeaError(
  message: string,
  fieldErrors: EditIdeaActionState["fieldErrors"] = {},
): EditIdeaActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

function editIdeaAuthRequired(): EditIdeaActionState {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby edytować pomysł.",
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

    if (error) {
      const mutationError = error as SupabaseMutationError;

      if (mutationError.code === "23505") {
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

        if (!confirmedState.hasCurrentUserVote) {
          return voteActionError(
            "error",
            "Nie udało się potwierdzić oddanego głosu. Odśwież stronę.",
            ideaId,
          );
        }

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

    const confirmedState = await getConfirmedVoteState(
      supabase,
      ideaId,
      user.id,
      true,
    );

    if (!confirmedState) {
      return voteActionError(
        "error",
        "Nie udało się potwierdzić wyniku głosowania. Odśwież stronę.",
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
      false,
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

export async function deleteIdeaAction(
  _previousState: OwnerIdeaActionState,
  formData: FormData,
): Promise<OwnerIdeaActionState> {
  const ideaId = readIdeaId(formData);

  if (!uuidPattern.test(ideaId)) {
    return ownerIdeaActionError(
      "Nie udało się usunąć pomysłu. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return ownerIdeaActionError(
      "Usuwanie będzie dostępne po skonfigurowaniu Supabase.",
    );
  }

  let redirectPath = "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.ideas.getUserForDelete", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return ownerIdeaAuthRequired("Zaloguj się, żeby usunąć pomysł.");
    }

    const { data, error } = await measureServerTiming(
      "supabase.ideas.deleteOwnIdea",
      () =>
        supabase
          .from("ideas")
          .delete()
          .eq("id", ideaId)
          .eq("created_by", user.id)
          .select("id"),
    );

    if (error || (data ?? []).length !== 1) {
      return ownerIdeaActionError(
        "Nie udało się usunąć pomysłu. Sprawdź, czy nadal jesteś jego właścicielem.",
      );
    }

    revalidatePath("/ideas");
    revalidatePath("/voting");
    revalidatePath("/calendar");
    redirectPath = appendAuthRedirectMessage(
      "/ideas",
      "success",
      "Pomysł został usunięty.",
    );
  } catch {
    return ownerIdeaActionError(
      "Nie udało się usunąć pomysłu. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}

export async function updateIdeaAction(
  _previousState: EditIdeaActionState,
  formData: FormData,
): Promise<EditIdeaActionState> {
  const ideaId = readIdeaId(formData);
  const validation = validateIdeaFormData(formData);

  if (validation.status === "invalid") {
    return editIdeaError("Popraw pola formularza.", validation.fieldErrors);
  }

  if (!uuidPattern.test(ideaId)) {
    return editIdeaError(
      "Nie udało się zapisać zmian. Spróbuj ponownie.",
    );
  }

  if (!getSupabasePublicConfig()) {
    return editIdeaError(
      "Edycja będzie dostępna po skonfigurowaniu Supabase.",
    );
  }

  let redirectPath = "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.ideas.getUserForUpdate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return editIdeaAuthRequired();
    }

    const { data, error } = await measureServerTiming(
      "supabase.ideas.updateOwnIdea",
      () =>
        supabase
          .from("ideas")
          .update({
            title: validation.values.title,
            description: validation.values.description,
            location: validation.values.location,
            price: validation.values.price,
          })
          .eq("id", ideaId)
          .select("id"),
    );

    if (error || (data ?? []).length !== 1) {
      return editIdeaError(
        "Nie udało się zapisać zmian. Sprawdź, czy nadal jesteś właścicielem pomysłu.",
      );
    }

    revalidatePath("/ideas");
    revalidatePath("/voting");
    revalidatePath("/calendar");
    redirectPath = appendAuthRedirectMessage(
      "/ideas",
      "success",
      "Pomysł został zaktualizowany.",
    );
  } catch {
    return editIdeaError(
      "Nie udało się zapisać zmian. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}
