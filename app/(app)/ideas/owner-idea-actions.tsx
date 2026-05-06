"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/submit-button";
import { formatIdeaPriceForInput } from "@/lib/idea-form-validation";

import { deleteIdeaAction } from "./actions";
import { emptyOwnerIdeaActionState } from "./owner-action-state";

type OwnerIdeaActionsProps = {
  description: string | null;
  ideaId: string;
  location: string | null;
  price: number | null;
  title: string;
};

export function OwnerIdeaActions({
  description,
  ideaId,
  location,
  price,
  title,
}: OwnerIdeaActionsProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [state, formAction] = useActionState(
    deleteIdeaAction,
    emptyOwnerIdeaActionState,
  );
  const editParams = new URLSearchParams({
    title,
    description: description ?? "",
    location: location ?? "",
    price: formatIdeaPriceForInput(price),
  });
  const editHref = `/ideas/${ideaId}/edit?${editParams.toString()}`;

  if (isConfirmingDelete) {
    return (
      <div
        className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3"
        data-testid="idea-delete-confirmation"
      >
        <p className="text-sm font-semibold leading-6 text-red-900">
          Usunięcie pomysłu usunie także powiązane głosy, komentarze i
          zaplanowane terminy w kalendarzu. Tej operacji nie można cofnąć.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <form action={formAction}>
            <input name="ideaId" type="hidden" value={ideaId} />
            <SubmitButton
              className="min-h-11 w-full rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              label="Usuń pomysł"
              pendingLabel="Usuwanie..."
            />
          </form>
          <button
            className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            onClick={() => setIsConfirmingDelete(false)}
            type="button"
          >
            Anuluj
          </button>
        </div>
        {state.message ? (
          <p
            aria-live="polite"
            className={`text-sm font-medium leading-6 ${
              state.status === "auth-required"
                ? "text-amber-900"
                : "text-red-800"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap justify-end gap-2"
      data-testid="idea-owner-actions"
    >
      <a
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        href={editHref}
      >
        Edytuj
      </a>
      <button
        className="inline-flex min-h-10 items-center rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        onClick={() => setIsConfirmingDelete(true)}
        type="button"
      >
        Usuń
      </button>
    </div>
  );
}
