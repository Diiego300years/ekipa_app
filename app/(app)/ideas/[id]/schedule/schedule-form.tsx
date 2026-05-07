"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { SubmitButton } from "@/app/submit-button";
import type { SchedulingIdea } from "@/lib/supabase/calendar";

import { scheduleIdeaAction } from "./actions";
import {
  emptyScheduleIdeaActionState,
  type ScheduleIdeaActionState,
} from "./schedule-state";

type ScheduleIdeaFormProps = {
  idea: SchedulingIdea;
  loginHref: string;
  showCreatedMessage?: boolean;
};

function formatScheduleIdeaPrice(price: number | null) {
  if (price === null) {
    return "Cena: nie podano";
  }

  return `Cena: ${price.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

export function ScheduleIdeaForm({
  idea,
  loginHref,
  showCreatedMessage = false,
}: ScheduleIdeaFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    scheduleIdeaAction,
    emptyScheduleIdeaActionState,
  );

  return (
    <div className="space-y-4">
      <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{idea.title}</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            Miejsce:{" "}
            <span className="font-medium text-slate-900">
              {idea.location || "nie podano"}
            </span>
          </p>
          <p className="font-medium text-slate-900">
            {formatScheduleIdeaPrice(idea.price)}
          </p>
        </div>
      </article>

      {showCreatedMessage ? (
        <div className="space-y-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-sm font-medium leading-6 text-teal-900">
            Pomysł został dodany. Możesz teraz zaplanować termin.
          </p>
          <button
            className="inline-flex min-h-11 items-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-700 transition hover:bg-white"
            onClick={() => router.replace("/ideas")}
            type="button"
          >
            Nie teraz
          </button>
        </div>
      ) : null}

      <form
        action={formAction}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="schedule-idea-form"
        noValidate
      >
        <input name="ideaId" type="hidden" value={idea.id} />

        {state.fieldErrors.ideaId ? (
          <p className="text-sm font-medium leading-6 text-red-700">
            {state.fieldErrors.ideaId}
          </p>
        ) : null}

        <label className="block space-y-2" htmlFor="schedule-date">
          <span className="text-sm font-semibold text-slate-700">Data</span>
          <input
            aria-describedby={fieldDescription(state, "startAt")}
            aria-invalid={Boolean(state.fieldErrors.startAt)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="schedule-date"
            name="date"
            type="date"
          />
        </label>

        <label className="block space-y-2" htmlFor="schedule-start-time">
          <span className="text-sm font-semibold text-slate-700">
            Godzina rozpoczęcia
          </span>
          <input
            aria-describedby={fieldDescription(state, "startAt")}
            aria-invalid={Boolean(state.fieldErrors.startAt)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="schedule-start-time"
            name="startTime"
            type="time"
          />
        </label>
        {state.fieldErrors.startAt ? (
          <p
            className="text-sm font-medium leading-6 text-red-700"
            id="schedule-startAt-error"
          >
            {state.fieldErrors.startAt}
          </p>
        ) : null}

        <label className="block space-y-2" htmlFor="schedule-end-time">
          <span className="text-sm font-semibold text-slate-700">
            Godzina zakończenia
          </span>
          <input
            aria-describedby={fieldDescription(state, "endAt")}
            aria-invalid={Boolean(state.fieldErrors.endAt)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="schedule-end-time"
            name="endTime"
            type="time"
          />
        </label>
        {state.fieldErrors.endAt ? (
          <p
            className="text-sm font-medium leading-6 text-red-700"
            id="schedule-endAt-error"
          >
            {state.fieldErrors.endAt}
          </p>
        ) : null}

        <label className="block space-y-2" htmlFor="schedule-note">
          <span className="text-sm font-semibold text-slate-700">Notatka</span>
          <textarea
            aria-describedby={fieldDescription(state, "note")}
            aria-invalid={Boolean(state.fieldErrors.note)}
            className="min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="schedule-note"
            name="note"
            placeholder="Opcjonalna notatka dla ekipy"
          />
        </label>
        {state.fieldErrors.note ? (
          <p
            className="text-sm font-medium leading-6 text-red-700"
            id="schedule-note-error"
          >
            {state.fieldErrors.note}
          </p>
        ) : null}

        <SubmitButton
          className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          label="Zaplanuj pomysł"
          pendingLabel="Zapisywanie..."
        />

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
    </div>
  );
}

function fieldDescription(
  state: ScheduleIdeaActionState,
  field: keyof ScheduleIdeaActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `schedule-${field}-error` : undefined;
}
