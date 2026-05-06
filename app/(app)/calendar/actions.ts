"use server";

import { revalidatePath } from "next/cache";

import {
  getCalendarEventResponseSummary,
  type CalendarEventResponseStatus,
} from "@/lib/supabase/calendar";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { RsvpActionResult } from "./rsvp-state";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readFormText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function isResponseStatus(
  value: string,
): value is CalendarEventResponseStatus {
  return value === "attending" || value === "declined";
}

function rsvpError(message: string, eventId?: string): RsvpActionResult {
  return {
    status: "error",
    message,
    eventId,
  };
}

function rsvpAuthRequired(eventId?: string): RsvpActionResult {
  return {
    status: "auth-required",
    message: "Zaloguj się, żeby odpowiedzieć na termin.",
    eventId,
  };
}

export async function setCalendarEventResponseAction(
  formData: FormData,
): Promise<RsvpActionResult> {
  const eventId = readFormText(formData, "eventId");
  const rawStatus = readFormText(formData, "status");

  if (!uuidPattern.test(eventId) || !isResponseStatus(rawStatus)) {
    return rsvpError(
      "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
      eventId,
    );
  }

  if (!getSupabasePublicConfig()) {
    return rsvpError(
      "Odpowiedzi będą dostępne po skonfigurowaniu Supabase.",
      eventId,
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return rsvpAuthRequired(eventId);
    }

    const { error } = await supabase.from("calendar_event_responses").upsert(
      {
        event_id: eventId,
        user_id: user.id,
        status: rawStatus,
      },
      {
        onConflict: "event_id,user_id",
      },
    );

    if (error) {
      return rsvpError(
        "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
        eventId,
      );
    }

    const responses = await getCalendarEventResponseSummary(
      supabase,
      eventId,
      user.id,
    );

    if (!responses) {
      return rsvpError(
        "Nie udało się potwierdzić odpowiedzi. Odśwież kalendarz.",
        eventId,
      );
    }

    revalidatePath("/calendar");

    return {
      status: "success",
      eventId,
      responses,
      message:
        rawStatus === "attending"
          ? "Zapisano odpowiedź: Będę."
          : "Zapisano odpowiedź: Nie będę.",
    };
  } catch {
    return rsvpError(
      "Nie udało się zapisać odpowiedzi. Spróbuj ponownie.",
      eventId,
    );
  }
}
