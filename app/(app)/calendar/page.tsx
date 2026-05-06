import { AuthStatusMessage } from "@/app/auth-status-message";
import {
  appendAuthRedirectMessage,
  readAuthRedirectMessage,
} from "@/lib/auth/redirect-message";
import { getCalendarEventsForList } from "@/lib/supabase/calendar";
import { getCurrentSupabaseUser } from "@/lib/supabase/session";

import { getWarsawDateKey } from "./calendar-date-utils";
import { CalendarView } from "./calendar-view";

type CalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentSupabaseUser();
  const eventsResult = await getCalendarEventsForList({
    currentUserId: user?.id ?? null,
  });
  const events = eventsResult.status === "ready" ? eventsResult.events : [];
  const rsvpLoginHref = appendAuthRedirectMessage(
    "/login",
    "error",
    "Zaloguj się, żeby odpowiedzieć na termin.",
  );

  return (
    <section className="space-y-5">
      <AuthStatusMessage
        authMessage={readAuthRedirectMessage(resolvedSearchParams)}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Kalendarz
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Terminy zaplanowane dla pomysłów ekipy.
        </p>
      </div>

      {eventsResult.status === "unconfigured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
          Kalendarz będzie dostępny po skonfigurowaniu Supabase.
        </p>
      ) : null}

      {eventsResult.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800">
          Nie udało się wczytać kalendarza. Sprawdź konfigurację bazy danych.
        </p>
      ) : null}

      {eventsResult.status === "ready" && eventsResult.events.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
          Nie ma jeszcze zaplanowanych terminów.
        </p>
      ) : null}

      <CalendarView
        events={events}
        isAuthenticated={Boolean(user)}
        rsvpLoginHref={rsvpLoginHref}
        todayKey={getWarsawDateKey(new Date())}
      />
    </section>
  );
}
