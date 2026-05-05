"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/submit-button";

import { loginAction, registerAction } from "./actions";
import { emptyAuthActionState, type AuthActionState } from "./auth-state";

type AuthMode = "login" | "register";

function fieldDescription(
  state: AuthActionState,
  field: keyof AuthActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `auth-${field}-error` : undefined;
}

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginState, submitLogin] = useActionState(
    loginAction,
    emptyAuthActionState,
  );
  const [registerState, submitRegister] = useActionState(
    registerAction,
    emptyAuthActionState,
  );

  const isRegisterMode = mode === "register";
  const state = isRegisterMode ? registerState : loginState;
  const formAction = isRegisterMode ? submitRegister : submitLogin;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-1">
        <button
          aria-pressed={!isRegisterMode}
          className={`min-h-11 rounded-md px-3 text-sm font-semibold transition ${
            !isRegisterMode
              ? "bg-teal-700 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          type="button"
          onClick={() => setMode("login")}
        >
          Logowanie
        </button>
        <button
          aria-pressed={isRegisterMode}
          className={`min-h-11 rounded-md px-3 text-sm font-semibold transition ${
            isRegisterMode
              ? "bg-teal-700 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
          type="button"
          onClick={() => setMode("register")}
        >
          Rejestracja
        </button>
      </div>

      <form
        action={formAction}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="auth-form"
        noValidate
      >
        {isRegisterMode ? (
          <>
            <label className="block space-y-2" htmlFor="auth-displayName">
              <span className="text-sm font-semibold text-slate-700">
                Nazwa wyświetlana
              </span>
              <input
                aria-describedby={fieldDescription(state, "displayName")}
                aria-invalid={Boolean(state.fieldErrors.displayName)}
                className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="auth-displayName"
                name="displayName"
                placeholder="Jak mamy Cię pokazywać?"
                type="text"
              />
            </label>
            {state.fieldErrors.displayName ? (
              <p
                className="text-sm font-medium leading-6 text-red-700"
                id="auth-displayName-error"
              >
                {state.fieldErrors.displayName}
              </p>
            ) : null}
          </>
        ) : null}

        <label className="block space-y-2" htmlFor="auth-email">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input
            aria-describedby={fieldDescription(state, "email")}
            aria-invalid={Boolean(state.fieldErrors.email)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="auth-email"
            name="email"
            placeholder="email@example.com"
            type="email"
          />
        </label>
        {state.fieldErrors.email ? (
          <p
            className="text-sm font-medium leading-6 text-red-700"
            id="auth-email-error"
          >
            {state.fieldErrors.email}
          </p>
        ) : null}

        <label className="block space-y-2" htmlFor="auth-password">
          <span className="text-sm font-semibold text-slate-700">Hasło</span>
          <input
            aria-describedby={fieldDescription(state, "password")}
            aria-invalid={Boolean(state.fieldErrors.password)}
            className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="auth-password"
            name="password"
            placeholder="Wpisz hasło"
            type="password"
          />
        </label>
        {state.fieldErrors.password ? (
          <p
            className="text-sm font-medium leading-6 text-red-700"
            id="auth-password-error"
          >
            {state.fieldErrors.password}
          </p>
        ) : null}

        {!isRegisterMode ? (
          <Link
            href="/reset-password"
            className="inline-flex text-sm font-semibold text-teal-700"
          >
            Zapomniałem hasła
          </Link>
        ) : null}

        {isRegisterMode ? (
          <>
            <label className="block space-y-2" htmlFor="auth-confirmPassword">
              <span className="text-sm font-semibold text-slate-700">
                Powtórz hasło
              </span>
              <input
                aria-describedby={fieldDescription(state, "confirmPassword")}
                aria-invalid={Boolean(state.fieldErrors.confirmPassword)}
                className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                id="auth-confirmPassword"
                name="confirmPassword"
                placeholder="Wpisz hasło ponownie"
                type="password"
              />
            </label>
            {state.fieldErrors.confirmPassword ? (
              <p
                className="text-sm font-medium leading-6 text-red-700"
                id="auth-confirmPassword-error"
              >
                {state.fieldErrors.confirmPassword}
              </p>
            ) : null}
          </>
        ) : null}

        <SubmitButton
          className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          label={isRegisterMode ? "Utwórz konto" : "Zaloguj się"}
          pendingLabel={
            isRegisterMode ? "Tworzenie konta..." : "Logowanie..."
          }
        />

        {state.message ? (
          <p
            aria-live="polite"
            className={`rounded-md px-4 py-3 text-sm font-medium leading-6 ${
              state.status === "success"
                ? "bg-teal-50 text-teal-900"
                : "bg-red-50 text-red-800"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
