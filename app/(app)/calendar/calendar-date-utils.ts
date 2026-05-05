export const calendarUiTimeZone = "Europe/Warsaw";

const warsawDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: calendarUiTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getWarsawDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Map(
    warsawDateKeyFormatter
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const year = parts.get("year");
  const month = parts.get("month");
  const day = parts.get("day");

  if (!year || !month || !day) {
    throw new Error("Could not format Warsaw calendar date key.");
  }

  return `${year}-${month}-${day}`;
}

export function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return {
    year,
    month,
    day,
  };
}

export function dateKeyToUtcNoon(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = dateKeyToUtcNoon(dateKey);

  date.setUTCDate(date.getUTCDate() + days);

  return makeDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

export function addMonthsToDateKey(dateKey: string, months: number) {
  const { year, month } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1 + months, 1, 12));

  return makeDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

export function getMonthStartDateKey(dateKey: string) {
  const { year, month } = parseDateKey(dateKey);

  return makeDateKey(year, month, 1);
}

export function getWeekStartDateKey(dateKey: string) {
  const date = dateKeyToUtcNoon(dateKey);
  const dayOfWeek = date.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return addDaysToDateKey(dateKey, -daysFromMonday);
}
