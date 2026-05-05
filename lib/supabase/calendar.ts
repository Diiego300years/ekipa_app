import { measureServerTiming } from "@/lib/performance/server-timing";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export const calendarEventLimits = {
  note: 500,
} as const;

export const calendarTimeZone = "Europe/Warsaw";

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
    emailLocalPartLikePattern.test(cleanDisplayName) &&
    /[._%+-]/.test(cleanDisplayName)
  ) {
    return fallbackDisplayName;
  }

  return cleanDisplayName;
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

export async function getCalendarEventsForList(): Promise<CalendarEventsResult> {
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
