import { AuthStatusMessage } from "@/app/auth-status-message";
import { readAuthRedirectMessage } from "@/lib/auth/redirect-message";

import { PasswordUpdateForm } from "./password-update-form";

type PasswordUpdatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PasswordUpdatePage({
  searchParams,
}: PasswordUpdatePageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-slate-50 px-5 py-10">
      <section className="space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Ekipa
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Ustaw nowe hasło
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Wpisz nowe hasło, którego chcesz używać do logowania.
          </p>
        </div>

        <AuthStatusMessage
          authMessage={readAuthRedirectMessage(resolvedSearchParams)}
        />

        <PasswordUpdateForm />
      </section>
    </main>
  );
}
