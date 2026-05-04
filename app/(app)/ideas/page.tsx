import { AuthStatusMessage } from "@/app/auth-status-message";
import { readAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { formatIdeaPrice, getIdeasForList } from "@/lib/supabase/ideas";

type IdeasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IdeasPage({ searchParams }: IdeasPageProps) {
  const resolvedSearchParams = await searchParams;
  const ideasResult = await getIdeasForList();

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
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
