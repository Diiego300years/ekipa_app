import Link from "next/link";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { getIdeaForScheduling } from "@/lib/supabase/calendar";

import { ScheduleIdeaForm } from "./schedule-form";

type ScheduleIdeaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ScheduleIdeaPage({
  params,
}: ScheduleIdeaPageProps) {
  const { id } = await params;
  const ideaResult = await getIdeaForScheduling(id);
  const loginHref = appendAuthRedirectMessage(
    "/login",
    "error",
    "Zaloguj się, żeby zaplanować pomysł.",
  );

  return (
    <section className="space-y-5">
      <Link
        className="inline-flex text-sm font-semibold text-teal-700"
        href="/ideas"
      >
        Wróć do pomysłów
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          {ideaResult.status === "ready"
            ? `Zaplanuj: ${ideaResult.idea.title}`
            : "Zaplanuj pomysł"}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Wybierz datę i godzinę spotkania dla ekipy.
        </p>
      </div>

      {ideaResult.status === "unconfigured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
          Planowanie będzie dostępne po skonfigurowaniu Supabase.
        </p>
      ) : null}

      {ideaResult.status === "not-found" || ideaResult.status === "error" ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
          Nie znaleziono pomysłu do zaplanowania.
        </p>
      ) : null}

      {ideaResult.status === "ready" ? (
        <ScheduleIdeaForm idea={ideaResult.idea} loginHref={loginHref} />
      ) : null}
    </section>
  );
}
