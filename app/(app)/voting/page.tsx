import { placeholderIdeas } from "../placeholder-data";

export default function VotingPage() {
  const rankedIdeas = [...placeholderIdeas].sort((first, second) => {
    return second.votes - first.votes;
  });

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

      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
        Głosowanie będzie dostępne po zalogowaniu
      </p>

      <ol className="space-y-3">
        {rankedIdeas.map((idea, index) => (
          <li
            key={idea.id}
            className="flex items-center gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-base font-bold text-slate-700">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-slate-950">
                {idea.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{idea.location}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-teal-800">{idea.votes}</p>
              <p className="text-xs font-medium text-slate-500">głosów</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
