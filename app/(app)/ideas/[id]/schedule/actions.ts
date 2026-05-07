"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { measureServerTiming } from "@/lib/performance/server-timing";
import {
  calendarEventLimits,
  calendarTimeZone,
} from "@/lib/supabase/calendar";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  ScheduleIdeaActionState,
  ScheduleIdeaFieldErrors,
} from "./schedule-state";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type TimeParts = {
  hour: number;
  minute: number;
};

type SchedulingIdeaOwnerRow = {
  id: string;
  created_by: string;
};

function readFormText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function hasFieldErrors(fieldErrors: ScheduleIdeaFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function scheduleFormError(
  message: string,
  fieldErrors: ScheduleIdeaFieldErrors = {},
): ScheduleIdeaActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

function scheduleAuthRequired(): ScheduleIdeaActionState {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby zaplanować pomysł.",
    fieldErrors: {},
  };
}

function parseDateParts(input: string): DateParts | null {
  if (!datePattern.test(input)) {
    return null;
  }

  const [year, month, day] = input.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function parseTimeParts(input: string): TimeParts | null {
  if (!timePattern.test(input)) {
    return null;
  }

  const [hour, minute] = input.split(":").map(Number);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return {
    hour,
    minute,
  };
}

function getZonedParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: calendarTimeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    second: Number(values.get("second")),
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getZonedParts(date);
  const zonedTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return zonedTimestamp - date.getTime();
}

function toUtcDate(dateParts: DateParts, timeParts: TimeParts) {
  const localTimestamp = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
  );
  let offsetMs = getTimeZoneOffsetMs(new Date(localTimestamp));
  let utcDate = new Date(localTimestamp - offsetMs);
  const correctedOffsetMs = getTimeZoneOffsetMs(utcDate);

  if (correctedOffsetMs !== offsetMs) {
    offsetMs = correctedOffsetMs;
    utcDate = new Date(localTimestamp - offsetMs);
  }

  const zonedParts = getZonedParts(utcDate);

  if (
    zonedParts.year !== dateParts.year ||
    zonedParts.month !== dateParts.month ||
    zonedParts.day !== dateParts.day ||
    zonedParts.hour !== timeParts.hour ||
    zonedParts.minute !== timeParts.minute
  ) {
    return null;
  }

  return utcDate;
}

function parseScheduleDateTime(dateInput: string, timeInput: string) {
  const dateParts = parseDateParts(dateInput);
  const timeParts = parseTimeParts(timeInput);

  if (!dateParts || !timeParts) {
    return null;
  }

  return toUtcDate(dateParts, timeParts);
}

export async function scheduleIdeaAction(
  _previousState: ScheduleIdeaActionState,
  formData: FormData,
): Promise<ScheduleIdeaActionState> {
  const ideaId = readFormText(formData, "ideaId");
  const date = readFormText(formData, "date");
  const startTime = readFormText(formData, "startTime");
  const endTime = readFormText(formData, "endTime");
  const note = readFormText(formData, "note");
  const fieldErrors: ScheduleIdeaFieldErrors = {};

  if (!ideaId || !uuidPattern.test(ideaId)) {
    fieldErrors.ideaId = "Pomysł jest wymagany.";
  }

  if (!date || !startTime) {
    fieldErrors.startAt = "Data i godzina są wymagane.";
  }

  if (note.length > calendarEventLimits.note) {
    fieldErrors.note = `Notatka może mieć maksymalnie ${calendarEventLimits.note} znaków.`;
  }

  const startAt =
    date && startTime ? parseScheduleDateTime(date, startTime) : null;
  const endAt = date && endTime ? parseScheduleDateTime(date, endTime) : null;

  if (date && startTime && !startAt) {
    fieldErrors.startAt = "Wpisz poprawną datę i godzinę.";
  }

  if (endTime && !endAt) {
    fieldErrors.endAt = "Wpisz poprawną godzinę zakończenia.";
  }

  if (startAt && endAt && endAt.getTime() <= startAt.getTime()) {
    fieldErrors.endAt =
      "Godzina zakończenia musi być późniejsza niż rozpoczęcia.";
  }

  if (hasFieldErrors(fieldErrors)) {
    return scheduleFormError("Popraw pola formularza.", fieldErrors);
  }

  if (!startAt) {
    return scheduleFormError("Popraw pola formularza.", {
      startAt: "Data i godzina są wymagane.",
    });
  }

  if (!getSupabasePublicConfig()) {
    return scheduleFormError(
      "Planowanie będzie dostępne po skonfigurowaniu Supabase.",
    );
  }

  let redirectPath = "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await measureServerTiming("supabase.calendar.getUserForCreate", () =>
      supabase.auth.getUser(),
    );

    if (userError || !user) {
      return scheduleAuthRequired();
    }

    const { data: idea, error: ideaError } = await measureServerTiming(
      "supabase.calendar.ideaOwnerForCreate",
      () =>
        supabase
          .from("ideas")
          .select("id,created_by")
          .eq("id", ideaId)
          .maybeSingle<SchedulingIdeaOwnerRow>(),
    );

    if (ideaError) {
      return scheduleFormError(
        "Nie udało się sprawdzić dostępu do pomysłu. Spróbuj ponownie.",
      );
    }

    if (!idea) {
      return scheduleFormError("Nie znaleziono pomysłu do zaplanowania.");
    }

    if (idea.created_by !== user.id) {
      return scheduleFormError(
        "Nie masz dostępu do planowania tego pomysłu.",
      );
    }

    const { error } = await measureServerTiming(
      "supabase.calendar.createEvent",
      () =>
        supabase.from("calendar_events").insert({
          idea_id: ideaId,
          scheduled_by: user.id,
          start_at: startAt.toISOString(),
          end_at: endAt ? endAt.toISOString() : null,
          note: note || null,
        }),
    );

    if (error) {
      return scheduleFormError(
        "Nie udało się zaplanować pomysłu. Spróbuj ponownie.",
      );
    }

    revalidatePath("/calendar");
    redirectPath = appendAuthRedirectMessage(
      "/calendar",
      "success",
      "Pomysł został zaplanowany.",
    );
  } catch {
    return scheduleFormError(
      "Nie udało się zaplanować pomysłu. Spróbuj ponownie.",
    );
  }

  redirect(redirectPath);
}
