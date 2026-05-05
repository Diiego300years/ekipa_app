import { AuthStatusMessage } from "@/app/auth-status-message";
import { readAuthRedirectMessage } from "@/lib/auth/redirect-message";
import {
  formatCalendarDate,
  formatCalendarTimeRange,
  getCalendarEventsForList,
} from "@/lib/supabase/calendar";
import { formatIdeaPrice } from "@/lib/supabase/ideas";

type CalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const resolvedSearchParams = await searchParams;
  const eventsResult = await getCalendarEventsForList();

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

      {eventsResult.status === "ready" && eventsResult.events.length > 0 ? (
        <div className="space-y-3">
          {eventsResult.events.map((event) => (
            <article
              key={event.id}
              data-testid="calendar-event"
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-md bg-slate-100 px-3 py-2 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCalendarTimeRange(event.startAt, event.endAt)}
                  </p>
                </div>
                <div className="min-w-0 space-y-2">
                  <h2 className="text-lg font-semibold text-slate-950">
                    {event.ideaTitle}
                  </h2>
                  <div className="space-y-1 text-sm leading-6 text-slate-600">
                    <p>{formatCalendarDate(event.startAt)}</p>
                    <p>
                      Miejsce:{" "}
                      <span className="font-medium text-slate-900">
                        {event.location || "nie podano"}
                      </span>
                    </p>
                    <p className="font-medium text-slate-900">
                      {formatIdeaPrice(event.price)}
                    </p>
                    <p>Autor: {event.authorName}</p>
                    <p>Zaplanował: {event.schedulerName}</p>
                  </div>
                  {event.note ? (
                    <p className="whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                      {event.note}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
