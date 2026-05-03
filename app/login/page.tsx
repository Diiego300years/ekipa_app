import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-slate-50 px-5 py-10">
      <section className="space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Ekipa
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Zaloguj się
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Ekran logowania jest na razie wersją demonstracyjną.
          </p>
        </div>

        <form className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              name="email"
              placeholder="email@example.com"
              type="email"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Hasło</span>
            <input
              className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              name="password"
              placeholder="Wpisz hasło"
              type="password"
            />
          </label>

          <button
            className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800"
            type="button"
          >
            Zaloguj
          </button>

          <button
            className="min-h-12 w-full rounded-md border border-slate-300 px-4 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
            type="button"
          >
            Utwórz konto
          </button>
        </form>

        <Link
          href="/ideas"
          className="block text-center text-sm font-semibold text-teal-700"
        >
          Przejdź do wersji demonstracyjnej
        </Link>
      </section>
    </main>
  );
}
