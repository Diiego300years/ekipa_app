import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import {
  getSupabasePublicTestConfig,
  getTestEnv,
  hasSupabasePublicTestConfig,
} from "../../e2e/support/test-env";

export const performanceAuthEmail = getTestEnv("E2E_AUTH_EMAIL");
export const performanceAuthPassword = getTestEnv("E2E_AUTH_PASSWORD");

const supabasePublicConfig = getSupabasePublicTestConfig();

export function hasRealSupabasePerformanceConfig() {
  return Boolean(
    hasSupabasePublicTestConfig() &&
      supabasePublicConfig &&
      performanceAuthEmail &&
      performanceAuthPassword,
  );
}

export function createPerformanceDataText(label: string) {
  const uniqueSuffix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

  return `PERF E2E ${label} ${uniqueSuffix}`;
}

export async function createAuthenticatedPublicClient(): Promise<{
  client: SupabaseClient;
  user: User;
}> {
  if (!supabasePublicConfig) {
    throw new Error("Public Supabase performance configuration is required.");
  }

  const client = createClient(
    supabasePublicConfig.url,
    supabasePublicConfig.publicKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );

  const { data: authData, error: signInError } =
    await client.auth.signInWithPassword({
      email: performanceAuthEmail,
      password: performanceAuthPassword,
    });

  if (signInError) {
    throw new Error(
      `Cleanup sign-in with the public Supabase key failed: ${signInError.message}`,
    );
  }

  if (!authData.user) {
    throw new Error("Public Supabase sign-in did not return a user.");
  }

  return {
    client,
    user: authData.user,
  };
}

async function findGeneratedIdeaIdThroughRls(
  client: SupabaseClient,
  userId: string,
  title: string,
) {
  const { data: ideas, error } = await client
    .from("ideas")
    .select("id,title,created_by")
    .eq("title", title)
    .eq("created_by", userId);

  if (error) {
    throw new Error(
      `Could not find generated idea through RLS: ${error.message}`,
    );
  }

  const matchingIdeas = ideas ?? [];

  if (matchingIdeas.length !== 1) {
    throw new Error(
      `Found ${matchingIdeas.length} generated ideas for performance cleanup. Expected exactly 1.`,
    );
  }

  return matchingIdeas[0].id as string;
}

async function deleteGeneratedIdeaByIdThroughRls(
  client: SupabaseClient,
  userId: string,
  ideaId: string,
) {
  const { data: deletedIdeas, error: deleteError } = await client
    .from("ideas")
    .delete()
    .eq("id", ideaId)
    .eq("created_by", userId)
    .select("id,created_by");

  if (deleteError) {
    throw new Error(
      `Cleanup failed through RLS/delete policy: ${deleteError.message}`,
    );
  }

  if ((deletedIdeas ?? []).length !== 1) {
    throw new Error(
      `Cleanup through RLS/delete policy deleted ${
        deletedIdeas?.length ?? 0
      } generated ideas. Expected exactly 1.`,
    );
  }
}

export async function deleteGeneratedPerformanceDataThroughRls({
  title,
  commentBody,
  eventNote,
}: {
  title: string;
  commentBody?: string;
  eventNote?: string;
}) {
  const { client, user } = await createAuthenticatedPublicClient();

  try {
    const ideaId = await findGeneratedIdeaIdThroughRls(client, user.id, title);

    if (eventNote) {
      const { data: deletedEvents, error: deleteEventError } = await client
        .from("calendar_events")
        .delete()
        .eq("idea_id", ideaId)
        .eq("scheduled_by", user.id)
        .eq("note", eventNote)
        .select("id,idea_id,scheduled_by");

      if (deleteEventError) {
        throw new Error(
          `Cleanup failed through calendar events RLS/delete policy: ${deleteEventError.message}`,
        );
      }

      if ((deletedEvents ?? []).length !== 1) {
        throw new Error(
          `Cleanup through calendar events RLS/delete policy deleted ${
            deletedEvents?.length ?? 0
          } generated events. Expected exactly 1.`,
        );
      }
    }

    if (commentBody) {
      const { data: deletedComments, error: deleteCommentError } = await client
        .from("idea_comments")
        .delete()
        .eq("idea_id", ideaId)
        .eq("user_id", user.id)
        .eq("body", commentBody)
        .select("id,idea_id,user_id");

      if (deleteCommentError) {
        throw new Error(
          `Cleanup failed through comments RLS/delete policy: ${deleteCommentError.message}`,
        );
      }

      if ((deletedComments ?? []).length !== 1) {
        throw new Error(
          `Cleanup through comments RLS/delete policy deleted ${
            deletedComments?.length ?? 0
          } generated comments. Expected exactly 1.`,
        );
      }
    }

    const { error: deleteVoteError } = await client
      .from("votes")
      .delete()
      .eq("idea_id", ideaId)
      .eq("user_id", user.id);

    if (deleteVoteError) {
      throw new Error(
        `Cleanup failed through votes RLS/delete policy: ${deleteVoteError.message}`,
      );
    }

    await deleteGeneratedIdeaByIdThroughRls(client, user.id, ideaId);
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
