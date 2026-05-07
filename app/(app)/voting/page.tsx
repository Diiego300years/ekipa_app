import { formatIdeaVoteCount, getIdeasForRanking } from "@/lib/supabase/ideas";

export default async function VotingPage() {
  const ideasResult = await getIdeasForRanking();

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Głosowanie
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Ranking pokazuje, które pomysły mają najwięcej głosów.
        </p>
      </div>

      {ideasResult.status === "unconfigured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
          Ranking będzie dostępny po skonfigurowaniu Supabase.
        </p>
      ) : null}

      {ideasResult.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800">
          Nie udało się wczytać rankingu. Sprawdź konfigurację bazy danych.
        </p>
      ) : null}

      {ideasResult.status === "ready" && ideasResult.ideas.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
          Nie ma jeszcze pomysłów do głosowania.
        </p>
      ) : null}

      {ideasResult.status === "ready" && ideasResult.ideas.length > 0 ? (
        <ol className="space-y-3" data-testid="voting-ranking">
          {ideasResult.ideas.map((idea, index) => (
            <li
              key={idea.id}
              className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
              data-testid="voting-ranking-item"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-base font-bold text-slate-700">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-slate-950">
                  {idea.title}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {idea.location || "Miejsce: nie podano"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-sm font-bold text-teal-800"
                  data-testid="voting-vote-count"
                >
                  {formatIdeaVoteCount(idea.voteCount)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
