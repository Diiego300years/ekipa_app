import { placeholderEvents } from "../placeholder-data";

export default function CalendarPage() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Kalendarz
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Przykładowe terminy zapisane dla wybranych pomysłów.
        </p>
      </div>

      <div className="space-y-3">
        {placeholderEvents.map((event) => (
          <article
            key={event.id}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-slate-100 px-3 py-2 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {event.time}
                </p>
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-950">
                  {event.ideaTitle}
                </h2>
                <p className="text-sm text-slate-600">{event.date}</p>
                <p className="text-sm text-slate-600">{event.location}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
