import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNavigation } from "./bottom-navigation";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Ekipa</p>
            <p className="text-xs text-slate-500">Wersja demonstracyjna</p>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Zaloguj
          </Link>
        </div>
      </header>
      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>
      <BottomNavigation />
    </div>
  );
}
