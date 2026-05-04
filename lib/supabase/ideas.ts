import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export const ideaLimits = {
  title: 120,
  description: 1000,
  location: 160,
} as const;

export type IdeaListItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number | null;
  createdAt: string;
  authorName: string;
};

export type IdeasListResult =
  | {
      status: "ready";
      ideas: IdeaListItem[];
    }
  | {
      status: "unconfigured" | "error";
      ideas: [];
    };

type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number | string | null;
  created_by: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

const fallbackAuthorName = "Użytkownik";

function normalizePrice(price: number | string | null) {
  if (price === null) {
    return null;
  }

  const numericPrice = typeof price === "number" ? price : Number(price);

  return Number.isFinite(numericPrice) ? numericPrice : null;
}

export function formatIdeaPrice(price: number | null) {
  if (price === null) {
    return "Cena: nie podano";
  }

  return `Cena: ${price.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} zł`;
}

export async function getIdeasForList(): Promise<IdeasListResult> {
  if (!getSupabasePublicConfig()) {
    return {
      status: "unconfigured",
      ideas: [],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("ideas")
      .select("id,title,description,location,price,created_by,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return {
        status: "error",
        ideas: [],
      };
    }

    const ideaRows = (data ?? []) as IdeaRow[];
    const authorIds = Array.from(
      new Set(ideaRows.map((idea) => idea.created_by).filter(Boolean)),
    );
    const profilesById = new Map<string, string>();

    if (authorIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", authorIds);

      const profileRows = (profileData ?? []) as ProfileRow[];

      for (const profile of profileRows) {
        const displayName = profile.display_name?.trim();

        if (displayName) {
          profilesById.set(profile.id, displayName);
        }
      }
    }

    return {
      status: "ready",
      ideas: ideaRows.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        location: idea.location,
        price: normalizePrice(idea.price),
        createdAt: idea.created_at,
        authorName: profilesById.get(idea.created_by) ?? fallbackAuthorName,
      })),
    };
  } catch {
    return {
      status: "error",
      ideas: [],
    };
  }
}
