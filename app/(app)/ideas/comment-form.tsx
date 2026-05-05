"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { SubmitButton } from "@/app/submit-button";

import { createIdeaCommentAction } from "./actions";
import { emptyCommentActionState, type CreatedIdeaComment } from "./comment-state";

type CommentFormProps = {
  ideaId: string;
  loginHref: string;
  onCommentCreated: (comment: CreatedIdeaComment) => void;
};

export function CommentForm({
  ideaId,
  loginHref,
  onCommentCreated,
}: CommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState(emptyCommentActionState);
  const textareaId = `idea-comment-${ideaId}`;
  const errorId = `idea-comment-${ideaId}-error`;

  async function handleCommentAction(formData: FormData) {
    const result = await createIdeaCommentAction(formData).catch(() => ({
      status: "error" as const,
      message: "Nie udało się dodać komentarza. Spróbuj ponownie.",
      fieldErrors: {},
    }));

    setState(result);

    if (result.status === "success" && result.comment) {
      onCommentCreated(result.comment);
      formRef.current?.reset();
    }
  }

  return (
    <form
      action={handleCommentAction}
      className="mt-3 space-y-2"
      data-testid="idea-comment-form"
      noValidate
      ref={formRef}
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
        <SubmitButton
          className="min-h-10 min-w-[13.5rem] whitespace-nowrap rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          label="Dodaj komentarz"
          pendingLabel="Dodawanie komentarza..."
        />
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
            state.status === "success"
              ? "bg-teal-50 text-teal-900"
              : state.status === "auth-required"
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
