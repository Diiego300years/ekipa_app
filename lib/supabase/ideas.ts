import { measureServerTiming } from "@/lib/performance/server-timing";

import { getSupabasePublicConfig } from "./config";
import { createServerSupabaseClient } from "./server";

export { formatIdeaPrice, formatIdeaVoteCount } from "@/lib/idea-formatting";

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

type VoteRow = {
  idea_id: string;
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
    const voteCountsByIdeaId = new Map<string, number>();
    const currentUserVotedIdeaIds = new Set<string>();
    const commentsByIdeaId = new Map<string, IdeaCommentRow[]>();

    if (options.includeComments && ideaIds.length > 0) {
      const { data: commentData, error: commentError } =
        await measureServerTiming("supabase.ideas.commentsForList", () =>
          supabase
            .from("idea_comments")
            .select("id,idea_id,user_id,body,created_at,updated_at")
            .in("idea_id", ideaIds)
            .order("created_at", { ascending: true }),
        );

      if (commentError) {
        return {
          status: "error",
          ideas: [],
        };
      }

      const commentRows = (commentData ?? []) as IdeaCommentRow[];

      for (const comment of commentRows) {
        profileIds.add(comment.user_id);

        const ideaComments = commentsByIdeaId.get(comment.idea_id) ?? [];

        ideaComments.push(comment);
        commentsByIdeaId.set(comment.idea_id, ideaComments);
      }
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

    if (ideaIds.length > 0) {
      const { data: voteData, error: voteError } = await measureServerTiming(
        "supabase.ideas.votesForList",
        () => supabase.from("votes").select("idea_id").in("idea_id", ideaIds),
      );

      if (voteError) {
        return {
          status: "error",
          ideas: [],
        };
      }

      const voteRows = (voteData ?? []) as VoteRow[];

      for (const vote of voteRows) {
        voteCountsByIdeaId.set(
          vote.idea_id,
          (voteCountsByIdeaId.get(vote.idea_id) ?? 0) + 1,
        );
      }

      if (includeCurrentUserVoteState && currentUserId) {
        const { data: currentUserVoteData, error: currentUserVoteError } =
          await measureServerTiming("supabase.ideas.currentUserVotes", () =>
            supabase
              .from("votes")
              .select("idea_id")
              .in("idea_id", ideaIds)
              .eq("user_id", currentUserId),
          );

        if (currentUserVoteError) {
          return {
            status: "error",
            ideas: [],
          };
        }

        const currentUserVoteRows = (currentUserVoteData ?? []) as VoteRow[];

        for (const vote of currentUserVoteRows) {
          currentUserVotedIdeaIds.add(vote.idea_id);
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
      voteCount: voteCountsByIdeaId.get(idea.id) ?? 0,
      hasCurrentUserVote: currentUserVotedIdeaIds.has(idea.id),
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
