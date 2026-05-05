"use client";

import { useMemo, useState } from "react";

import type { CalendarListEvent } from "@/lib/supabase/calendar";

import {
  addDaysToDateKey,
  addMonthsToDateKey,
  calendarUiTimeZone,
  dateKeyToUtcNoon,
  getMonthStartDateKey,
  getWarsawDateKey,
  getWeekStartDateKey,
  parseDateKey,
} from "./calendar-date-utils";

type CalendarViewMode = "month" | "week";

type CalendarViewProps = {
  events: CalendarListEvent[];
  todayKey: string;
};

type CalendarCell = {
  dateKey: string;
  day: number;
};

const weekdayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

const dateLabelFormatter = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: calendarUiTimeZone,
});

const monthLabelFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
  timeZone: calendarUiTimeZone,
});

const shortDateLabelFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: calendarUiTimeZone,
});

const timeLabelFormatter = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: calendarUiTimeZone,
});

function formatDateKeyLong(dateKey: string) {
  return dateLabelFormatter.format(dateKeyToUtcNoon(dateKey));
}

function formatDateKeyShort(dateKey: string) {
  return shortDateLabelFormatter.format(dateKeyToUtcNoon(dateKey));
}

function formatCalendarTimeRange(startAt: string, endAt: string | null) {
  const startTime = timeLabelFormatter.format(new Date(startAt));

  if (!endAt) {
    return startTime;
  }

  return `${startTime} - ${timeLabelFormatter.format(new Date(endAt))}`;
}

function formatIdeaPrice(price: number | null) {
  if (price === null) {
    return "Cena: nie podano";
  }

  return `Cena: ${price.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

function getMonthCells(monthStartKey: string) {
  const { year, month } = parseDateKey(monthStartKey);
  const firstDay = dateKeyToUtcNoon(monthStartKey);
  const firstDayOfWeek = firstDay.getUTCDay();
  const leadingBlankCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const cells: Array<CalendarCell | null> = Array.from(
    { length: leadingBlankCount },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateKey: `${monthStartKey.slice(0, 8)}${String(day).padStart(2, "0")}`,
      day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getWeekCells(weekStartKey: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDaysToDateKey(weekStartKey, index);

    return {
      dateKey,
      day: parseDateKey(dateKey).day,
    };
  });
}

function getVisibleDateKeys(mode: CalendarViewMode, anchorKey: string) {
  if (mode === "week") {
    return getWeekCells(anchorKey).map((cell) => cell.dateKey);
  }

  return getMonthCells(anchorKey)
    .filter((cell): cell is CalendarCell => Boolean(cell))
    .map((cell) => cell.dateKey);
}

function getDefaultSelectedDateKey(
  visibleDateKeys: string[],
  todayKey: string,
  eventDateKeys: Set<string>,
) {
  if (visibleDateKeys.includes(todayKey)) {
    return todayKey;
  }

  const firstEventDateKey = visibleDateKeys.find((dateKey) =>
    eventDateKeys.has(dateKey),
  );

  return firstEventDateKey ?? visibleDateKeys[0];
}

function getPeriodLabel(mode: CalendarViewMode, anchorKey: string) {
  if (mode === "week") {
    const weekEndKey = addDaysToDateKey(anchorKey, 6);

    return `${formatDateKeyShort(anchorKey)} - ${formatDateKeyShort(
      weekEndKey,
    )}`;
  }

  return monthLabelFormatter.format(dateKeyToUtcNoon(anchorKey));
}

function getEventCountLabel(count: number) {
  if (count === 1) {
    return "1 termin";
  }

  return `${count} terminów`;
}

function buildDayButtonLabel(
  dateKey: string,
  isToday: boolean,
  eventCount: number,
) {
  const parts = [formatDateKeyLong(dateKey)];

  if (isToday) {
    parts.push("dzisiaj");
  }

  if (eventCount > 0) {
    parts.push(getEventCountLabel(eventCount));
  }

  return parts.join(", ");
}

function getDayButtonClassName({
  isSelected,
  isToday,
  hasEvents,
}: {
  isSelected: boolean;
  isToday: boolean;
  hasEvents: boolean;
}) {
  const baseClassName =
    "relative flex min-h-11 min-w-0 touch-manipulation flex-col items-center justify-center rounded-md border px-1 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2";

  if (isSelected) {
    return `${baseClassName} border-teal-700 bg-teal-700 text-white shadow-sm`;
  }

  if (isToday) {
    return `${baseClassName} border-teal-600 bg-teal-50 text-teal-900`;
  }

  if (hasEvents) {
    return `${baseClassName} border-teal-200 bg-white text-slate-950 ring-1 ring-teal-100`;
  }

  return `${baseClassName} border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
}

export function CalendarView({ events, todayKey }: CalendarViewProps) {
  const eventsByDateKey = useMemo(() => {
    const groups = new Map<string, CalendarListEvent[]>();

    for (const event of events) {
      const dateKey = getWarsawDateKey(event.startAt);
      const dateEvents = groups.get(dateKey) ?? [];

      dateEvents.push(event);
      groups.set(dateKey, dateEvents);
    }

    return groups;
  }, [events]);
  const eventDateKeys = useMemo(
    () => new Set(eventsByDateKey.keys()),
    [eventsByDateKey],
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [anchorKey, setAnchorKey] = useState(() =>
    getMonthStartDateKey(todayKey),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const initialAnchorKey = getMonthStartDateKey(todayKey);
    const visibleDateKeys = getVisibleDateKeys("month", initialAnchorKey);

    return getDefaultSelectedDateKey(visibleDateKeys, todayKey, eventDateKeys);
  });
  const visibleDateKeys = getVisibleDateKeys(viewMode, anchorKey);
  const selectedEvents = eventsByDateKey.get(selectedDateKey) ?? [];
  const cells =
    viewMode === "week" ? getWeekCells(anchorKey) : getMonthCells(anchorKey);

  function navigate(direction: -1 | 1) {
    const nextAnchorKey =
      viewMode === "week"
        ? addDaysToDateKey(anchorKey, direction * 7)
        : addMonthsToDateKey(anchorKey, direction);
    const nextVisibleDateKeys = getVisibleDateKeys(viewMode, nextAnchorKey);

    setAnchorKey(nextAnchorKey);
    setSelectedDateKey(
      getDefaultSelectedDateKey(nextVisibleDateKeys, todayKey, eventDateKeys),
    );
  }

  function switchView(nextViewMode: CalendarViewMode) {
    if (nextViewMode === viewMode) {
      return;
    }

    setViewMode(nextViewMode);
    setAnchorKey(
      nextViewMode === "week"
        ? getWeekStartDateKey(selectedDateKey)
        : getMonthStartDateKey(selectedDateKey),
    );
  }

  return (
    <div className="space-y-4" data-testid="calendar-view">
      <div className="space-y-4 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label={
              viewMode === "week" ? "Poprzedni tydzień" : "Poprzedni miesiąc"
            }
            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md border border-slate-200 text-xl font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            onClick={() => navigate(-1)}
            type="button"
          >
            ‹
          </button>
          <h2
            className="min-w-0 flex-1 text-center text-base font-semibold text-slate-950"
            data-testid="calendar-period-label"
          >
            {getPeriodLabel(viewMode, anchorKey)}
          </h2>
          <button
            aria-label={
              viewMode === "week" ? "Następny tydzień" : "Następny miesiąc"
            }
            className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md border border-slate-200 text-xl font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            onClick={() => navigate(1)}
            type="button"
          >
            ›
          </button>
        </div>

        <div
          aria-label="Widok kalendarza"
          className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1"
          data-testid="calendar-view-toggle"
          role="group"
        >
          <button
            aria-pressed={viewMode === "month"}
            className={`min-h-11 touch-manipulation rounded-md px-3 text-sm font-semibold transition ${
              viewMode === "month"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-white/70"
            }`}
            onClick={() => switchView("month")}
            type="button"
          >
            Miesiąc
          </button>
          <button
            aria-pressed={viewMode === "week"}
            className={`min-h-11 touch-manipulation rounded-md px-3 text-sm font-semibold transition ${
              viewMode === "week"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-white/70"
            }`}
            onClick={() => switchView("week")}
            type="button"
          >
            Tydzień
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-slate-500">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-1"
          data-testid="calendar-grid"
          data-view={viewMode}
        >
          {cells.map((cell, index) => {
            if (!cell) {
              return (
                <div
                  aria-hidden="true"
                  className="min-h-11 rounded-md bg-slate-50"
                  key={`blank-${index}`}
                />
              );
            }

            const eventCount = eventsByDateKey.get(cell.dateKey)?.length ?? 0;
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDateKey;
            const hasEvents = eventCount > 0;

            return (
              <button
                aria-current={isToday ? "date" : undefined}
                aria-label={buildDayButtonLabel(
                  cell.dateKey,
                  isToday,
                  eventCount,
                )}
                aria-pressed={isSelected}
                className={getDayButtonClassName({
                  isSelected,
                  isToday,
                  hasEvents,
                })}
                data-date={cell.dateKey}
                data-testid="calendar-day"
                key={cell.dateKey}
                onClick={() => setSelectedDateKey(cell.dateKey)}
                type="button"
              >
                <span>{cell.day}</span>
                {hasEvents ? (
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-teal-600"
                    }`}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section
        aria-labelledby="calendar-selected-day-heading"
        className="space-y-3"
        data-testid="calendar-selected-events"
      >
        <div className="space-y-1">
          <h2
            className="text-xl font-semibold text-slate-950"
            id="calendar-selected-day-heading"
          >
            {formatDateKeyLong(selectedDateKey)}
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            {selectedEvents.length > 0
              ? getEventCountLabel(selectedEvents.length)
              : "Brak terminów w wybranym dniu."}
          </p>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
            Brak zaplanowanych terminów tego dnia.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <article
                className="overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm"
                data-testid="calendar-event"
                key={event.id}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                      {formatCalendarTimeRange(event.startAt, event.endAt)}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {formatDateKeyLong(getWarsawDateKey(event.startAt))}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <h3 className="break-words text-base font-semibold text-slate-950">
                      {event.ideaTitle}
                    </h3>
                    <div className="space-y-1 text-sm leading-6 text-slate-600">
                      <p className="break-words">
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
        )}
      </section>

      <p className="sr-only">
        Widoczne dni od {visibleDateKeys[0]} do{" "}
        {visibleDateKeys[visibleDateKeys.length - 1]}.
      </p>
    </div>
  );
}
