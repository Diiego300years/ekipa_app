"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/ideas", label: "Pomysły" },
  { href: "/voting", label: "Głosowanie" },
  { href: "/calendar", label: "Kalendarz" },
  { href: "/add", label: "Dodaj" },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Główna nawigacja"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 items-center justify-center rounded-md px-2 text-center text-sm font-semibold transition ${
                isActive
                  ? "bg-teal-700 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
