import Link from "next/link";

import { AuthStatusMessage } from "@/app/auth-status-message";
import {
  appendAuthRedirectMessage,
  readAuthRedirectMessage,
} from "@/lib/auth/redirect-message";
import {
  formatIdeaPrice,
  formatIdeaVoteCount,
  getIdeasForList,
} from "@/lib/supabase/ideas";
import { getCurrentSupabaseUser } from "@/lib/supabase/session";

import { IdeaComments } from "./idea-comments";
import { VoteControl } from "./vote-control";

type IdeasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const fallbackDisplayName = "Użytkownik";

function getKnownUserDisplayName(
  user: Awaited<ReturnType<typeof getCurrentSupabaseUser>>,
) {
  const displayName = user?.user_metadata.display_name;

  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : fallbackDisplayName;
}

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentSupabaseUser();
  const ideasResult = await getIdeasForList({
    currentUserId: user?.id ?? null,
    includeComments: true,
  });
  const currentUserDisplayName = getKnownUserDisplayName(user);
  const voteLoginHref = appendAuthRedirectMessage(
    "/login",
    "error",
    "Zaloguj się, żeby oddać głos.",
  );
  const commentLoginHref = appendAuthRedirectMessage(
    "/login",
    "error",
    "Zaloguj się, żeby dodać komentarz.",
  );

  return (
    <section className="space-y-5">
      <AuthStatusMessage
        authMessage={readAuthRedirectMessage(resolvedSearchParams)}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Pomysły
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Najnowsze propozycje zapisane przez ekipę.
        </p>
      </div>

      {ideasResult.status === "unconfigured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
          Pomysły będą dostępne po skonfigurowaniu Supabase.
        </p>
      ) : null}

      {ideasResult.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800">
          Nie udało się wczytać pomysłów. Sprawdź konfigurację bazy danych.
        </p>
      ) : null}

      {ideasResult.status === "ready" && ideasResult.ideas.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
          Nie ma jeszcze żadnych pomysłów.
        </p>
      ) : null}

      {ideasResult.status === "ready" && ideasResult.ideas.length > 0 ? (
        <div className="space-y-3">
          {ideasResult.ideas.map((idea) => (
            <article
              key={idea.id}
              data-testid="idea-card"
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {idea.title}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Autor: {idea.authorName}
                </p>
                {idea.description ? (
                  <p className="text-sm leading-6 text-slate-600">
                    {idea.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <p>
                  Miejsce:{" "}
                  <span className="font-medium text-slate-900">
                    {idea.location || "nie podano"}
                  </span>
                </p>
                <p className="font-medium text-slate-900">
                  {formatIdeaPrice(idea.price)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                {user ? (
                  <VoteControl
                    ideaId={idea.id}
                    initialHasCurrentUserVote={idea.hasCurrentUserVote}
                    initialVoteCount={idea.voteCount}
                    key={`${idea.id}-${idea.voteCount}-${idea.hasCurrentUserVote}`}
                  />
                ) : (
                  <>
                    <p
                      className="text-sm font-semibold text-slate-900"
                      data-testid="idea-vote-count"
                    >
                      {formatIdeaVoteCount(idea.voteCount)}
                    </p>

                    <div className="text-right">
                      <Link
                        className="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
                        href={voteLoginHref}
                      >
                        Głosuj
                      </Link>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                        Zaloguj się, żeby oddać głos.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Link
                  className="inline-flex min-h-10 items-center rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
                  href={`/ideas/${idea.id}/schedule`}
                >
                  Zaplanuj
                </Link>
              </div>

              <IdeaComments
                currentUserDisplayName={currentUserDisplayName}
                ideaId={idea.id}
                initialComments={idea.comments}
                key={`${idea.id}-${idea.comments.length}`}
                loginHref={commentLoginHref}
              />
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
