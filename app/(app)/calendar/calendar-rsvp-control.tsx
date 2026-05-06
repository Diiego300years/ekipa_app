"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  CalendarEventResponseStatus,
  CalendarEventResponseSummary,
} from "@/lib/supabase/calendar";

import { setCalendarEventResponseAction } from "./actions";

type CalendarRsvpControlProps = {
  eventId: string;
  initialResponses: CalendarEventResponseSummary;
  isAuthenticated: boolean;
  loginHref: string;
};

type InlineMessage = {
  status: "success" | "error" | "auth-required";
  text: string;
};

const responseLabels: Record<CalendarEventResponseStatus, string> = {
  attending: "Będę",
  declined: "Nie będę",
};

function formatCompactNames(names: string[]) {
  if (names.length === 0) {
    return "Brak odpowiedzi";
  }

  const visibleNames = names.slice(0, 3).join(", ");
  const hiddenCount = names.length - 3;

  return hiddenCount > 0 ? `${visibleNames} +${hiddenCount}` : visibleNames;
}

function getButtonClassName({
  isActive,
  status,
}: {
  isActive: boolean;
  status: CalendarEventResponseStatus;
}) {
  const baseClassName =
    "min-h-11 flex-1 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600";

  if (isActive) {
    return `${baseClassName} bg-teal-700 text-white hover:bg-teal-800`;
  }

  if (status === "declined") {
    return `${baseClassName} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
  }

  return `${baseClassName} border border-teal-700 bg-white text-teal-700 hover:bg-teal-50`;
}

export function CalendarRsvpControl({
  eventId,
  initialResponses,
  isAuthenticated,
  loginHref,
}: CalendarRsvpControlProps) {
  const [responses, setResponses] = useState(initialResponses);
  const [pendingStatus, setPendingStatus] =
    useState<CalendarEventResponseStatus | null>(null);
  const [message, setMessage] = useState<InlineMessage | null>(null);

  function handleGuestAttempt() {
    setMessage({
      status: "auth-required",
      text: "Zaloguj się, żeby odpowiedzieć na termin.",
    });
  }

  async function handleResponse(nextStatus: CalendarEventResponseStatus) {
    const formData = new FormData();

    formData.set("eventId", eventId);
    formData.set("status", nextStatus);
    setPendingStatus(nextStatus);
    setMessage(null);

    try {
      const result = await setCalendarEventResponseAction(formData);

      if (result.status === "success") {
        setResponses(result.responses);
        setMessage({
          status: "success",
          text: result.message,
        });
      } else {
        setMessage({
          status: result.status,
          text: result.message,
        });
      }
    } catch {
      setMessage({
        status: "error",
        text: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
      });
    } finally {
      setPendingStatus(null);
    }
  }

  return (
    <div
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3"
      data-testid="calendar-rsvp-control"
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-900">
            Będą:{" "}
            <span data-testid="calendar-rsvp-attending-count">
              {responses.attendingCount}
            </span>
          </p>
          <p className="mt-1 break-words text-xs font-medium leading-5 text-slate-600">
            {formatCompactNames(responses.attendingNames)}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">
            Nie będą:{" "}
            <span data-testid="calendar-rsvp-declined-count">
              {responses.declinedCount}
            </span>
          </p>
          <p className="mt-1 break-words text-xs font-medium leading-5 text-slate-600">
            {formatCompactNames(responses.declinedNames)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["attending", "declined"] as const).map((status) => {
          const isActive = responses.currentUserStatus === status;
          const isPending = pendingStatus === status;

          return (
            <button
              aria-pressed={isActive}
              className={getButtonClassName({ isActive, status })}
              disabled={Boolean(pendingStatus)}
              key={status}
              onClick={() =>
                isAuthenticated ? handleResponse(status) : handleGuestAttempt()
              }
              type="button"
            >
              {isPending ? "Zapisywanie..." : responseLabels[status]}
            </button>
          );
        })}
      </div>

      {message ? (
        <div className="space-y-2">
          <p
            aria-live="polite"
            className={`text-xs font-medium leading-5 ${
              message.status === "success"
                ? "text-teal-800"
                : message.status === "auth-required"
                  ? "text-amber-900"
                  : "text-red-700"
            }`}
          >
            {message.text}
          </p>
          {message.status === "auth-required" ? (
            <Link
              className="inline-flex text-xs font-semibold text-teal-700"
              href={loginHref}
            >
              Przejdź do logowania
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
