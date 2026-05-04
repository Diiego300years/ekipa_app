"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createIdeaCommentAction } from "./actions";
import { emptyCommentActionState } from "./comment-state";

type CommentFormProps = {
  ideaId: string;
  loginHref: string;
};

export function CommentForm({ ideaId, loginHref }: CommentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createIdeaCommentAction,
    emptyCommentActionState,
  );
  const textareaId = `idea-comment-${ideaId}`;
  const errorId = `idea-comment-${ideaId}-error`;

  return (
    <form
      action={formAction}
      className="mt-3 space-y-2"
      data-testid="idea-comment-form"
      noValidate
    >
      <input name="ideaId" type="hidden" value={ideaId} />
      <label className="sr-only" htmlFor={textareaId}>
        Komentarz
      </label>
      <textarea
        aria-describedby={state.fieldErrors.body ? errorId : undefined}
        aria-invalid={Boolean(state.fieldErrors.body)}
        className="min-h-20 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        id={textareaId}
        name="body"
        placeholder="Dodaj komentarz"
      />
      {state.fieldErrors.body ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id={errorId}
        >
          {state.fieldErrors.body}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="min-h-10 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Dodawanie..." : "Dodaj komentarz"}
        </button>
        {state.status === "auth-required" ? (
          <Link
            className="text-sm font-semibold text-teal-700"
            href={loginHref}
          >
            Przejdź do logowania
          </Link>
        ) : null}
      </div>
      {state.message ? (
        <p
          aria-live="polite"
          className={`rounded-md px-3 py-2 text-sm font-medium leading-6 ${
            state.status === "auth-required"
              ? "bg-amber-50 text-amber-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
