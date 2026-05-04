import Link from "next/link";

import { AuthStatusMessage } from "@/app/auth-status-message";
import { readAuthRedirectMessage } from "@/lib/auth/redirect-message";

import { PasswordResetRequestForm } from "./password-reset-request-form";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-slate-50 px-5 py-10">
      <section className="space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Ekipa
          </p>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Odzyskaj dostęp do konta
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Podaj email, a wyślemy link do zmiany hasła.
          </p>
        </div>

        <AuthStatusMessage
          authMessage={readAuthRedirectMessage(resolvedSearchParams)}
        />

        <PasswordResetRequestForm />

        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-teal-700"
        >
          Wróć do logowania
        </Link>
      </section>
    </main>
  );
}
