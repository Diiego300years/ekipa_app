import { placeholderIdeas } from "../placeholder-data";

export default function IdeasPage() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Pomysły
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Przykładowe propozycje dla ekipy. Dane są tylko pokazowe.
        </p>
      </div>

      <div className="space-y-3">
        {placeholderIdeas.map((idea) => (
          <article
            key={idea.id}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  {idea.title}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {idea.description}
                </p>
              </div>
              <div className="shrink-0 rounded-md bg-teal-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-teal-800">{idea.votes}</p>
                <p className="text-xs font-medium text-teal-700">głosów</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Miejsce</dt>
                <dd className="mt-1 text-slate-800">{idea.location}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Cena</dt>
                <dd className="mt-1 text-slate-800">{idea.price}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
