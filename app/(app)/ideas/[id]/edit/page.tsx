import Link from "next/link";

import { appendAuthRedirectMessage } from "@/lib/auth/redirect-message";
import { getEditableIdeaForOwner } from "@/lib/supabase/ideas";
import { getCurrentSupabaseUser } from "@/lib/supabase/session";

import { EditIdeaForm } from "./edit-idea-form";

type EditIdeaPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getFallbackIdeaFromSearchParams({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const title = firstSearchParam(searchParams.title)?.trim();

  if (!title) {
    return null;
  }

  return {
    id,
    title,
    description: firstSearchParam(searchParams.description)?.trim() || null,
    location: firstSearchParam(searchParams.location)?.trim() || null,
    price: null,
    priceInput: firstSearchParam(searchParams.price)?.trim() || "",
  };
}

export default async function EditIdeaPage({
  params,
  searchParams,
}: EditIdeaPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentSupabaseUser();
  const ideaResult = await getEditableIdeaForOwner(id, user?.id ?? null);
  const fallbackIdea =
    user && ideaResult.status !== "ready"
      ? getFallbackIdeaFromSearchParams({
          id,
          searchParams: resolvedSearchParams,
        })
      : null;
  const editableIdea =
    ideaResult.status === "ready" ? ideaResult.idea : fallbackIdea;
  const loginHref = appendAuthRedirectMessage(
    "/login",
    "error",
    "Zaloguj się, żeby edytować pomysł.",
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
          {editableIdea
            ? `Edytuj: ${editableIdea.title}`
            : "Edytuj pomysł"}
        </h1>
        <p className="text-base leading-7 text-slate-600">
          Zmień szczegóły pomysłu widoczne dla ekipy.
        </p>
      </div>

      {ideaResult.status === "unconfigured" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">
          Edycja będzie dostępna po skonfigurowaniu Supabase.
        </p>
      ) : null}

      {ideaResult.status === "auth-required" ? (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium leading-6 text-amber-900">
            Zaloguj się, żeby edytować ten pomysł.
          </p>
          <Link
            className="inline-flex text-sm font-semibold text-teal-700"
            href={loginHref}
          >
            Przejdź do logowania
          </Link>
        </div>
      ) : null}

      {!fallbackIdea &&
      (ideaResult.status === "not-found" || ideaResult.status === "error") ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm">
          Nie znaleziono pomysłu do edycji albo nie masz do niego dostępu.
        </p>
      ) : null}

      {editableIdea ? (
        <EditIdeaForm idea={editableIdea} loginHref={loginHref} />
      ) : null}
    </section>
  );
}
