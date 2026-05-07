import { measureServerTiming } from "@/lib/performance/server-timing";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export { formatIdeaPrice, formatIdeaVoteCount } from "@/lib/idea-formatting";
export { ideaLimits } from "@/lib/idea-limits";

export type IdeaListItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number | null;
  createdAt: string;
  authorName: string;
  isOwnedByCurrentUser: boolean;
  voteCount: number;
  hasCurrentUserVote: boolean;
  comments: IdeaCommentListItem[];
};

export type IdeaCommentListItem = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
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

export type IdeaRankingItem = {
  id: string;
  title: string;
  location: string | null;
  createdAt: string;
  voteCount: number;
};

export type IdeaRankingResult =
  | {
      status: "ready";
      ideas: IdeaRankingItem[];
    }
  | {
      status: "unconfigured" | "error";
      ideas: [];
    };

export type EditableIdea = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number | null;
};

export type EditableIdeaResult =
  | {
      status: "ready";
      idea: EditableIdea;
    }
  | {
      status: "unconfigured" | "auth-required" | "not-found" | "error";
      idea: null;
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

type IdeaRankingRow = {
  id: string;
  title: string;
  location: string | null;
  created_at: string;
};

type EditableIdeaRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  price: number | string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type VoteRow = {
  idea_id: string;
  user_id?: string;
};

type IdeaCommentRow = {
  id: string;
  idea_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type IdeasListOptions = {
  includeComments?: boolean;
  includeCurrentUserVoteState?: boolean;
  /**
   * Trusted server-derived Supabase user id for current-user vote state.
   * Pass only ids from server-side Supabase session/cookie state, such as
   * getCurrentSupabaseUser(). Never pass values from client props, form input,
   * URL params, search params, or any other user-controlled source. RLS remains
   * the security boundary, but application identity logic must stay
   * server-derived.
   */
  currentUserId?: string | null;
  sort?: "newest" | "ranking";
};

const fallbackAuthorName = "Użytkownik";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function normalizePrice(price: number | string | null) {
  if (price === null) {
    return null;
  }

  const numericPrice = typeof price === "number" ? price : Number(price);

  return Number.isFinite(numericPrice) ? numericPrice : null;
}

function sortIdeasForRanking(ideas: IdeaListItem[]) {
  return ideas.sort((first, second) => {
    const voteDifference = second.voteCount - first.voteCount;

    if (voteDifference !== 0) {
      return voteDifference;
    }

    const dateDifference =
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return first.id.localeCompare(second.id);
  });
}

function sortRankingItems(ideas: IdeaRankingItem[]) {
  return ideas.sort((first, second) => {
    const voteDifference = second.voteCount - first.voteCount;

    if (voteDifference !== 0) {
      return voteDifference;
    }

    const dateDifference =
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return first.id.localeCompare(second.id);
  });
}

function createEmptyVoteState() {
  return {
    voteCountsByIdeaId: new Map<string, number>(),
    currentUserVotedIdeaIds: new Set<string>(),
  };
}

function mapVoteState(voteRows: VoteRow[], currentUserId: string | null) {
  const voteState = createEmptyVoteState();

  for (const vote of voteRows) {
    voteState.voteCountsByIdeaId.set(
      vote.idea_id,
      (voteState.voteCountsByIdeaId.get(vote.idea_id) ?? 0) + 1,
    );

    if (currentUserId && vote.user_id === currentUserId) {
      voteState.currentUserVotedIdeaIds.add(vote.idea_id);
    }
  }

  return voteState;
}

async function getVoteStateForIdeaIds({
  supabase,
  ideaIds,
  includeCurrentUserVoteState,
  currentUserId,
  timingLabel,
}: {
  supabase: SupabaseServerClient;
  ideaIds: string[];
  includeCurrentUserVoteState: boolean;
  currentUserId: string | null;
  timingLabel: string;
}) {
  if (ideaIds.length === 0) {
    return createEmptyVoteState();
  }

  const shouldSelectUserIds = includeCurrentUserVoteState && Boolean(currentUserId);
  const { data, error } = await measureServerTiming(timingLabel, () =>
    shouldSelectUserIds
      ? supabase.from("votes").select("idea_id,user_id").in("idea_id", ideaIds)
      : supabase.from("votes").select("idea_id").in("idea_id", ideaIds),
  );

  if (!error) {
    return mapVoteState((data ?? []) as VoteRow[], currentUserId);
  }

  if (!shouldSelectUserIds || !currentUserId) {
    return null;
  }

  const [voteResult, currentUserVoteResult] = await Promise.all([
    measureServerTiming(`${timingLabel}:fallbackCounts`, () =>
      supabase.from("votes").select("idea_id").in("idea_id", ideaIds),
    ),
    measureServerTiming(`${timingLabel}:fallbackCurrentUser`, () =>
      supabase
        .from("votes")
        .select("idea_id")
        .in("idea_id", ideaIds)
        .eq("user_id", currentUserId),
    ),
  ]);

  if (voteResult.error || currentUserVoteResult.error) {
    return null;
  }

  const voteState = mapVoteState((voteResult.data ?? []) as VoteRow[], null);

  for (const vote of (currentUserVoteResult.data ?? []) as VoteRow[]) {
    voteState.currentUserVotedIdeaIds.add(vote.idea_id);
  }

  return voteState;
}

export async function getIdeasForList(
  options: IdeasListOptions = {},
): Promise<IdeasListResult> {
  if (!getSupabasePublicConfig()) {
    return {
      status: "unconfigured",
      ideas: [],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const includeCurrentUserVoteState =
      options.includeCurrentUserVoteState ?? true;
    let currentUserId = options.currentUserId;

    if (includeCurrentUserVoteState && currentUserId === undefined) {
      const {
        data: { user },
      } = await measureServerTiming("supabase.ideas.getUser", () =>
        supabase.auth.getUser(),
      );

      currentUserId = user?.id ?? null;
    }

    const { data, error } = await measureServerTiming(
      "supabase.ideas.list",
      () =>
        supabase
          .from("ideas")
          .select("id,title,description,location,price,created_by,created_at")
          .order("created_at", { ascending: false }),
    );

    if (error) {
      return {
        status: "error",
        ideas: [],
      };
    }

    const ideaRows = (data ?? []) as IdeaRow[];
    const ideaIds = ideaRows.map((idea) => idea.id);
    const profileIds = new Set(
      ideaRows.map((idea) => idea.created_by).filter(Boolean),
    );
    const profilesById = new Map<string, string>();
    const commentsByIdeaId = new Map<string, IdeaCommentRow[]>();
    const commentsPromise = (async () => {
      if (!options.includeComments || ideaIds.length === 0) {
        return {
          error: null,
          rows: [] as IdeaCommentRow[],
        };
      }

      const { data: commentData, error: commentError } =
        await measureServerTiming("supabase.ideas.commentsForList", () =>
          supabase
            .from("idea_comments")
            .select("id,idea_id,user_id,body,created_at,updated_at")
            .in("idea_id", ideaIds)
            .order("created_at", { ascending: true }),
        );

      return {
        error: commentError,
        rows: (commentData ?? []) as IdeaCommentRow[],
      };
    })();
    const voteStatePromise = getVoteStateForIdeaIds({
      supabase,
      ideaIds,
      includeCurrentUserVoteState,
      currentUserId: currentUserId ?? null,
      timingLabel: "supabase.ideas.votesForList",
    });
    const [commentResult, voteState] = await Promise.all([
      commentsPromise,
      voteStatePromise,
    ]);

    if (commentResult.error || !voteState) {
      return {
        status: "error",
        ideas: [],
      };
    }

    for (const comment of commentResult.rows) {
      profileIds.add(comment.user_id);

      const ideaComments = commentsByIdeaId.get(comment.idea_id) ?? [];

      ideaComments.push(comment);
      commentsByIdeaId.set(comment.idea_id, ideaComments);
    }

    const profileIdList = Array.from(profileIds);

    if (profileIdList.length > 0) {
      const { data: profileData } = await measureServerTiming(
        "supabase.ideas.profilesForList",
        () =>
          supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", profileIdList),
      );

      const profileRows = (profileData ?? []) as ProfileRow[];

      for (const profile of profileRows) {
        const displayName = profile.display_name?.trim();

        if (displayName) {
          profilesById.set(profile.id, displayName);
        }
      }
    }

    const ideas = ideaRows.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      location: idea.location,
      price: normalizePrice(idea.price),
      createdAt: idea.created_at,
      authorName: profilesById.get(idea.created_by) ?? fallbackAuthorName,
      isOwnedByCurrentUser: Boolean(
        currentUserId && currentUserId === idea.created_by,
      ),
      voteCount: voteState.voteCountsByIdeaId.get(idea.id) ?? 0,
      hasCurrentUserVote: voteState.currentUserVotedIdeaIds.has(idea.id),
      comments: (commentsByIdeaId.get(idea.id) ?? []).map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        authorName: profilesById.get(comment.user_id) ?? fallbackAuthorName,
      })),
    }));

    return {
      status: "ready",
      ideas: options.sort === "ranking" ? sortIdeasForRanking(ideas) : ideas,
    };
  } catch {
    return {
      status: "error",
      ideas: [],
    };
  }
}

export async function getIdeasForRanking(): Promise<IdeaRankingResult> {
  if (!getSupabasePublicConfig()) {
    return {
      status: "unconfigured",
      ideas: [],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await measureServerTiming(
      "supabase.ideas.rankingList",
      () =>
        supabase
          .from("ideas")
          .select("id,title,location,created_at")
          .order("created_at", { ascending: false }),
    );

    if (error) {
      return {
        status: "error",
        ideas: [],
      };
    }

    const ideaRows = (data ?? []) as IdeaRankingRow[];
    const voteState = await getVoteStateForIdeaIds({
      supabase,
      ideaIds: ideaRows.map((idea) => idea.id),
      includeCurrentUserVoteState: false,
      currentUserId: null,
      timingLabel: "supabase.ideas.votesForRanking",
    });

    if (!voteState) {
      return {
        status: "error",
        ideas: [],
      };
    }

    return {
      status: "ready",
      ideas: sortRankingItems(
        ideaRows.map((idea) => ({
          id: idea.id,
          title: idea.title,
          location: idea.location,
          createdAt: idea.created_at,
          voteCount: voteState.voteCountsByIdeaId.get(idea.id) ?? 0,
        })),
      ),
    };
  } catch {
    return {
      status: "error",
      ideas: [],
    };
  }
}

export async function getEditableIdeaForOwner(
  ideaId: string,
  currentUserId?: string | null,
): Promise<EditableIdeaResult> {
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
    let ownerUserId = currentUserId;

    if (ownerUserId === undefined) {
      const {
        data: { user },
        error: userError,
      } = await measureServerTiming("supabase.ideas.getUserForEdit", () =>
        supabase.auth.getUser(),
      );

      if (userError || !user) {
        return {
          status: "auth-required",
          idea: null,
        };
      }

      ownerUserId = user.id;
    }

    if (!ownerUserId) {
      return {
        status: "auth-required",
        idea: null,
      };
    }

    const { data, error } = await measureServerTiming(
      "supabase.ideas.ideaForEdit",
      () =>
        supabase
          .from("ideas")
          .select("id,title,description,location,price")
          .eq("id", ideaId)
          .limit(1),
    );

    if (error) {
      return {
        status: "error",
        idea: null,
      };
    }

    const idea = ((data ?? []) as EditableIdeaRow[])[0];

    if (!idea) {
      return {
        status: "not-found",
        idea: null,
      };
    }

    return {
      status: "ready",
      idea: {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        location: idea.location,
        price: normalizePrice(idea.price),
      },
    };
  } catch {
    return {
      status: "error",
      idea: null,
    };
  }
}
