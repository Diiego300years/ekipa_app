"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/app/submit-button";
import {
  formatIdeaPriceForInput,
  type ValidatedIdeaInput,
} from "@/lib/idea-form-validation";

import { updateIdeaAction } from "../../actions";
import {
  emptyEditIdeaActionState,
  type EditIdeaActionState,
} from "../../edit-idea-state";

type EditIdeaFormProps = {
  idea: ValidatedIdeaInput & {
    id: string;
    priceInput?: string;
  };
  loginHref: string;
};

export function EditIdeaForm({ idea, loginHref }: EditIdeaFormProps) {
  const [state, formAction] = useActionState(
    updateIdeaAction,
    emptyEditIdeaActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="edit-idea-form"
      noValidate
    >
      <input name="ideaId" type="hidden" value={idea.id} />

      <label className="block space-y-2" htmlFor="edit-idea-title">
        <span className="text-sm font-semibold text-slate-700">Tytuł</span>
        <input
          aria-describedby={fieldDescription(state, "title")}
          aria-invalid={Boolean(state.fieldErrors.title)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          defaultValue={idea.title}
          id="edit-idea-title"
          name="title"
          placeholder="Na przykład: wspólna kolacja"
          type="text"
        />
      </label>
      {state.fieldErrors.title ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="edit-idea-title-error"
        >
          {state.fieldErrors.title}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="edit-idea-description">
        <span className="text-sm font-semibold text-slate-700">Opis</span>
        <textarea
          aria-describedby={fieldDescription(state, "description")}
          aria-invalid={Boolean(state.fieldErrors.description)}
          className="min-h-28 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          defaultValue={idea.description ?? ""}
          id="edit-idea-description"
          name="description"
          placeholder="Krótko opisz pomysł dla ekipy"
        />
      </label>
      {state.fieldErrors.description ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="edit-idea-description-error"
        >
          {state.fieldErrors.description}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="edit-idea-location">
        <span className="text-sm font-semibold text-slate-700">Miejsce</span>
        <input
          aria-describedby={fieldDescription(state, "location")}
          aria-invalid={Boolean(state.fieldErrors.location)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          defaultValue={idea.location ?? ""}
          id="edit-idea-location"
          name="location"
          placeholder="Adres albo nazwa miejsca"
          type="text"
        />
      </label>
      {state.fieldErrors.location ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="edit-idea-location-error"
        >
          {state.fieldErrors.location}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="edit-idea-price">
        <span className="text-sm font-semibold text-slate-700">Cena</span>
        <input
          aria-describedby={fieldDescription(state, "price")}
          aria-invalid={Boolean(state.fieldErrors.price)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          defaultValue={idea.priceInput ?? formatIdeaPriceForInput(idea.price)}
          id="edit-idea-price"
          name="price"
          placeholder="Na przykład: 25 zł"
          type="text"
        />
      </label>
      {state.fieldErrors.price ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="edit-idea-price-error"
        >
          {state.fieldErrors.price}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <SubmitButton
          className="min-h-12 rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          label="Zapisz zmiany"
          pendingLabel="Zapisywanie..."
        />
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/ideas"
        >
          Anuluj
        </Link>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={`rounded-md px-4 py-3 text-sm font-medium leading-6 ${
            state.status === "auth-required"
              ? "bg-amber-50 text-amber-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      {state.status === "auth-required" ? (
        <Link
          className="inline-flex text-sm font-semibold text-teal-700"
          href={loginHref}
        >
          Przejdź do logowania
        </Link>
      ) : null}
    </form>
  );
}

function fieldDescription(
  state: EditIdeaActionState,
  field: keyof EditIdeaActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `edit-idea-${field}-error` : undefined;
}
