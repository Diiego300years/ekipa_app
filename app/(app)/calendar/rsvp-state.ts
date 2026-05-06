import type {
  CalendarEventResponseStatus,
  CalendarEventResponseSummary,
} from "@/lib/supabase/calendar";

export type RsvpActionResult =
  | {
      status: "success";
      message: string;
      eventId: string;
      responses: CalendarEventResponseSummary;
    }
  | {
      status: "error" | "auth-required";
      message: string;
      eventId?: string;
    };

export type RsvpIntent = CalendarEventResponseStatus;
