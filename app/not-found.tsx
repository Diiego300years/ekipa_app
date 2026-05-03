import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-slate-50 px-5 py-10 text-center">
      <div className="space-y-5">
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          Nie znaleziono strony
        </h1>
        <Link
          href="/ideas"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-5 text-base font-semibold text-white transition hover:bg-teal-800"
        >
          Wróć do pomysłów
        </Link>
      </div>
    </main>
  );
}
