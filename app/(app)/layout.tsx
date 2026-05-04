import type { ReactNode } from "react";
import Link from "next/link";
import { getUserDisplayName } from "@/lib/supabase/profiles";
import { getCurrentSupabaseUser } from "@/lib/supabase/session";
import { logoutAction } from "./auth-actions";
import { BottomNavigation } from "./bottom-navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentSupabaseUser();
  const displayName = user ? await getUserDisplayName(user) : "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Ekipa</p>
            <p className="text-xs text-slate-500">
              {displayName ? displayName : "Wersja demonstracyjna"}
            </p>
          </div>
          {user ? (
            <form action={logoutAction}>
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                type="submit"
              >
                Wyloguj
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Zaloguj
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>
      <BottomNavigation />
    </div>
  );
}
