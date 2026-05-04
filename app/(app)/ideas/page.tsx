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

import { removeVoteForIdeaAction, voteForIdeaAction } from "./actions";
import { CommentForm } from "./comment-form";
import { VoteButton } from "./vote-button";

type IdeasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentSupabaseUser();
  const ideasResult = await getIdeasForList({ includeComments: true });
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
                <p
                  className="text-sm font-semibold text-slate-900"
                  data-testid="idea-vote-count"
                >
                  {formatIdeaVoteCount(idea.voteCount)}
                </p>

                {user ? (
                  idea.hasCurrentUserVote ? (
                    <form
                      action={removeVoteForIdeaAction}
                      data-testid="idea-voted-state"
                    >
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <VoteButton
                        label="Cofnij głos"
                        pendingLabel="Cofanie..."
                        variant="secondary"
                      />
                    </form>
                  ) : (
                    <form action={voteForIdeaAction}>
                      <input name="ideaId" type="hidden" value={idea.id} />
                      <VoteButton />
                    </form>
                  )
                ) : (
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
                )}
              </div>

              <div
                className="mt-4 border-t border-slate-100 pt-4"
                data-testid="idea-comments"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Komentarze
                </h3>

                {idea.comments.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {idea.comments.map((comment) => (
                      <li
                        className="border-l border-slate-200 pl-3 text-sm"
                        data-testid="idea-comment"
                        key={comment.id}
                      >
                        <p className="font-semibold text-slate-700">
                          {comment.authorName}
                        </p>
                        <p className="whitespace-pre-wrap break-words leading-6 text-slate-700">
                          {comment.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Brak komentarzy.
                  </p>
                )}

                <CommentForm ideaId={idea.id} loginHref={commentLoginHref} />
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
