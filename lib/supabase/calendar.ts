import type { SupabaseClient } from "@supabase/supabase-js";

import { measureServerTiming } from "@/lib/performance/server-timing";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export const calendarEventLimits = {
  note: 500,
} as const;

export const calendarTimeZone = "Europe/Warsaw";

export type CalendarEventResponseStatus = "attending" | "declined";

export type CalendarEventResponseSummary = {
  attendingCount: number;
  declinedCount: number;
  attendingNames: string[];
  declinedNames: string[];
  currentUserStatus: CalendarEventResponseStatus | null;
};

export type CalendarListEvent = {
  id: string;
  ideaId: string;
  ideaTitle: string;
  location: string | null;
  price: number | null;
  authorName: string;
  schedulerName: string;
  startAt: string;
  endAt: string | null;
  note: string | null;
  responses: CalendarEventResponseSummary;
};

export type CalendarEventsResult =
  | {
      status: "ready";
      events: CalendarListEvent[];
    }
  | {
      status: "unconfigured" | "error";
      events: [];
    };

export type SchedulingIdea = {
  id: string;
  title: string;
  location: string | null;
  price: number | null;
};

export type SchedulingIdeaResult =
  | {
      status: "ready";
      idea: SchedulingIdea;
    }
  | {
      status: "unconfigured" | "not-found" | "error";
      idea: null;
    };

type CalendarEventRow = {
  id: string;
  idea_id: string;
  scheduled_by: string;
  start_at: string;
  end_at: string | null;
  note: string | null;
};

type IdeaSummaryRow = {
  id: string;
  title: string;
  location: string | null;
  price: number | string | null;
  created_by: string;
};

type SchedulingIdeaRow = {
  id: string;
  title: string;
  location: string | null;
  price: number | string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type CalendarEventResponseRow = {
  event_id: string;
  user_id: string;
  status: string;
};

type CalendarEventsListOptions = {
  currentUserId?: string | null;
};

const fallbackDisplayName = "Użytkownik";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profileIdFallbackPattern = /^user-[0-9a-f]{8}$/i;
const emailLocalPartLikePattern = /^[a-z0-9._%+-]+$/;

function normalizePrice(price: number | string | null) {
  if (price === null) {
    return null;
  }

  const numericPrice = typeof price === "number" ? price : Number(price);

  return Number.isFinite(numericPrice) ? numericPrice : null;
}

function mapProfilesById(profiles: ProfileRow[]) {
  const profilesById = new Map<string, string>();

  for (const profile of profiles) {
    profilesById.set(profile.id, sanitizeDisplayName(profile.display_name));
  }

  return profilesById;
}

function sanitizeDisplayName(displayName: string | null) {
  const cleanDisplayName = displayName?.trim();

  if (!cleanDisplayName) {
    return fallbackDisplayName;
  }

  if (
    cleanDisplayName.includes("@") ||
    uuidPattern.test(cleanDisplayName) ||
    profileIdFallbackPattern.test(cleanDisplayName)
  ) {
    return fallbackDisplayName;
  }

  if (
    cleanDisplayName === cleanDisplayName.toLowerCase() &&
    emailLocalPartLikePattern.test(cleanDisplayName)
  ) {
    return fallbackDisplayName;
  }

  return cleanDisplayName;
}

function isCalendarEventResponseStatus(
  status: string,
): status is CalendarEventResponseStatus {
  return status === "attending" || status === "declined";
}

export function createEmptyCalendarEventResponseSummary(): CalendarEventResponseSummary {
  return {
    attendingCount: 0,
    declinedCount: 0,
    attendingNames: [],
    declinedNames: [],
    currentUserStatus: null,
  };
}

function buildCalendarEventResponseSummary({
  responseRows,
  profilesById,
  currentUserId,
}: {
  responseRows: CalendarEventResponseRow[];
  profilesById: Map<string, string>;
  currentUserId: string | null;
}): CalendarEventResponseSummary {
  const attendingNames: string[] = [];
  const declinedNames: string[] = [];
  let currentUserStatus: CalendarEventResponseStatus | null = null;

  for (const response of responseRows) {
    if (!isCalendarEventResponseStatus(response.status)) {
      continue;
    }

    const displayName = profilesById.get(response.user_id) ?? fallbackDisplayName;

    if (response.status === "attending") {
      attendingNames.push(displayName);
    } else {
      declinedNames.push(displayName);
    }

    if (currentUserId && response.user_id === currentUserId) {
      currentUserStatus = response.status;
    }
  }

  return {
    attendingCount: attendingNames.length,
    declinedCount: declinedNames.length,
    attendingNames,
    declinedNames,
    currentUserStatus,
  };
}

export function formatCalendarDate(isoDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: calendarTimeZone,
  }).format(new Date(isoDate));
}

function formatCalendarTime(isoDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: calendarTimeZone,
  }).format(new Date(isoDate));
}

export function formatCalendarTimeRange(startAt: string, endAt: string | null) {
  const startTime = formatCalendarTime(startAt);

  if (!endAt) {
    return startTime;
  }

  return `${startTime} - ${formatCalendarTime(endAt)}`;
}

export async function getCalendarEventsForList(
  options: CalendarEventsListOptions = {},
): Promise<CalendarEventsResult> {
  if (!getSupabasePublicConfig()) {
    return {
      status: "unconfigured",
      events: [],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await measureServerTiming(
      "supabase.calendar.eventsForList",
      () =>
        supabase
          .from("calendar_events")
          .select("id,idea_id,scheduled_by,start_at,end_at,note")
          .order("start_at", { ascending: true }),
    );

    if (error) {
      return {
        status: "error",
        events: [],
      };
    }

    const eventRows = (data ?? []) as CalendarEventRow[];
    const ideaIds = Array.from(new Set(eventRows.map((event) => event.idea_id)));
    const profileIds = new Set(
      eventRows.map((event) => event.scheduled_by).filter(Boolean),
    );
    const ideasById = new Map<string, IdeaSummaryRow>();
    const responsesByEventId = new Map<string, CalendarEventResponseRow[]>();
    let profilesById = new Map<string, string>();

    if (ideaIds.length > 0) {
      const { data: ideaData, error: ideaError } = await measureServerTiming(
        "supabase.calendar.ideasForEvents",
        () =>
          supabase
            .from("ideas")
            .select("id,title,location,price,created_by")
            .in("id", ideaIds),
      );

      if (ideaError) {
        return {
          status: "error",
          events: [],
        };
      }

      const ideaRows = (ideaData ?? []) as IdeaSummaryRow[];

      for (const idea of ideaRows) {
        ideasById.set(idea.id, idea);
        profileIds.add(idea.created_by);
      }
    }

    if (eventRows.length > 0) {
      const eventIds = eventRows.map((event) => event.id);
      const { data: responseData, error: responseError } =
        await measureServerTiming(
          "supabase.calendar.responsesForEvents",
          () =>
            supabase
              .from("calendar_event_responses")
              .select("event_id,user_id,status")
              .in("event_id", eventIds)
              .order("created_at", { ascending: true }),
        );

      if (!responseError) {
        const responseRows = (responseData ?? []) as CalendarEventResponseRow[];

        for (const response of responseRows) {
          profileIds.add(response.user_id);

          const eventResponses =
            responsesByEventId.get(response.event_id) ?? [];

          eventResponses.push(response);
          responsesByEventId.set(response.event_id, eventResponses);
        }
      }
    }

    const profileIdList = Array.from(profileIds);

    if (profileIdList.length > 0) {
      const { data: profileData } = await measureServerTiming(
        "supabase.calendar.profilesForEvents",
        () =>
          supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", profileIdList),
      );

      profilesById = mapProfilesById((profileData ?? []) as ProfileRow[]);
    }

    return {
      status: "ready",
      events: eventRows.map((event) => {
        const idea = ideasById.get(event.idea_id);

        return {
          id: event.id,
          ideaId: event.idea_id,
          ideaTitle: idea?.title ?? "Pomysł",
          location: idea?.location ?? null,
          price: normalizePrice(idea?.price ?? null),
          authorName: idea
            ? profilesById.get(idea.created_by) ?? fallbackDisplayName
            : fallbackDisplayName,
          schedulerName:
            profilesById.get(event.scheduled_by) ?? fallbackDisplayName,
          startAt: event.start_at,
          endAt: event.end_at,
          note: event.note,
          responses: buildCalendarEventResponseSummary({
            responseRows: responsesByEventId.get(event.id) ?? [],
            profilesById,
            currentUserId: options.currentUserId ?? null,
          }),
        };
      }),
    };
  } catch {
    return {
      status: "error",
      events: [],
    };
  }
}

export async function getCalendarEventResponseSummary(
  supabase: SupabaseClient,
  eventId: string,
  currentUserId: string,
) {
  const { data, error } = await measureServerTiming(
    "supabase.calendar.responsesForEvent",
    () =>
      supabase
        .from("calendar_event_responses")
        .select("event_id,user_id,status")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
  );

  if (error) {
    return null;
  }

  const responseRows = (data ?? []) as CalendarEventResponseRow[];
  const profileIds = Array.from(
    new Set(responseRows.map((response) => response.user_id)),
  );
  let profilesById = new Map<string, string>();

  if (profileIds.length > 0) {
    const { data: profileData } = await measureServerTiming(
      "supabase.calendar.profilesForResponses",
      () =>
        supabase
          .from("profiles")
          .select("id,display_name")
          .in("id", profileIds),
    );

    profilesById = mapProfilesById((profileData ?? []) as ProfileRow[]);
  }

  return buildCalendarEventResponseSummary({
    responseRows,
    profilesById,
    currentUserId,
  });
}

export async function getIdeaForScheduling(
  ideaId: string,
): Promise<SchedulingIdeaResult> {
  if (!uuidPattern.test(ideaId)) {
    return {
      status: "not-found",
      idea: null,
    };
  }

  if (!getSupabasePublicConfig()) {
    return {
      status: "unconfigured",
      idea: null,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await measureServerTiming(
      "supabase.calendar.ideaForScheduling",
      () =>
        supabase
          .from("ideas")
          .select("id,title,location,price")
          .eq("id", ideaId)
          .maybeSingle<SchedulingIdeaRow>(),
    );

    if (error) {
      return {
        status: "error",
        idea: null,
      };
    }

    if (!data) {
      return {
        status: "not-found",
        idea: null,
      };
    }

    return {
      status: "ready",
      idea: {
        id: data.id,
        title: data.title,
        location: data.location,
        price: normalizePrice(data.price),
      },
    };
  } catch {
    return {
      status: "error",
      idea: null,
    };
  }
}
