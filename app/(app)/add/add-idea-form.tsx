"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createIdeaAction } from "./actions";
import {
  emptyAddIdeaActionState,
  type AddIdeaActionState,
} from "./add-idea-state";

export function AddIdeaForm() {
  const [state, formAction, isPending] = useActionState(
    createIdeaAction,
    emptyAddIdeaActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="add-idea-form"
      noValidate
    >
      <label className="block space-y-2" htmlFor="idea-title">
        <span className="text-sm font-semibold text-slate-700">Tytuł</span>
        <input
          aria-describedby={fieldDescription(state, "title")}
          aria-invalid={Boolean(state.fieldErrors.title)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="idea-title"
          name="title"
          placeholder="Na przykład: wspólna kolacja"
          type="text"
        />
      </label>
      {state.fieldErrors.title ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="idea-title-error"
        >
          {state.fieldErrors.title}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="idea-description">
        <span className="text-sm font-semibold text-slate-700">Opis</span>
        <textarea
          aria-describedby={fieldDescription(state, "description")}
          aria-invalid={Boolean(state.fieldErrors.description)}
          className="min-h-28 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="idea-description"
          name="description"
          placeholder="Krótko opisz pomysł dla ekipy"
        />
      </label>
      {state.fieldErrors.description ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="idea-description-error"
        >
          {state.fieldErrors.description}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="idea-location">
        <span className="text-sm font-semibold text-slate-700">Miejsce</span>
        <input
          aria-describedby={fieldDescription(state, "location")}
          aria-invalid={Boolean(state.fieldErrors.location)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="idea-location"
          name="location"
          placeholder="Adres albo nazwa miejsca"
          type="text"
        />
      </label>
      {state.fieldErrors.location ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="idea-location-error"
        >
          {state.fieldErrors.location}
        </p>
      ) : null}

      <label className="block space-y-2" htmlFor="idea-price">
        <span className="text-sm font-semibold text-slate-700">Cena</span>
        <input
          aria-describedby={fieldDescription(state, "price")}
          aria-invalid={Boolean(state.fieldErrors.price)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="idea-price"
          name="price"
          placeholder="Na przykład: 25 zł"
          type="text"
        />
      </label>
      {state.fieldErrors.price ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="idea-price-error"
        >
          {state.fieldErrors.price}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Dodawanie..." : "Dodaj pomysł"}
      </button>

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
          href="/login"
        >
          Przejdź do logowania
        </Link>
      ) : null}
    </form>
  );
}

function fieldDescription(
  state: AddIdeaActionState,
  field: keyof AddIdeaActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `idea-${field}-error` : undefined;
}
