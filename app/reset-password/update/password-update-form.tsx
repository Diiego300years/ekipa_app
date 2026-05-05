"use client";

import { useActionState } from "react";

import { AuthStatusMessage } from "@/app/auth-status-message";
import {
  emptyAuthActionState,
  type AuthActionState,
} from "@/app/login/auth-state";
import { SubmitButton } from "@/app/submit-button";

import { updatePasswordAction } from "./actions";

function fieldDescription(
  state: AuthActionState,
  field: keyof AuthActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `update-password-${field}-error` : undefined;
}

export function PasswordUpdateForm() {
  const [state, submitAction] = useActionState(
    updatePasswordAction,
    emptyAuthActionState,
  );

  return (
    <form
      action={submitAction}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      noValidate
    >
      <label className="block space-y-2" htmlFor="update-password-password">
        <span className="text-sm font-semibold text-slate-700">
          Nowe hasło
        </span>
        <input
          aria-describedby={fieldDescription(state, "password")}
          aria-invalid={Boolean(state.fieldErrors.password)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="update-password-password"
          name="password"
          placeholder="Wpisz nowe hasło"
          type="password"
        />
      </label>
      {state.fieldErrors.password ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="update-password-password-error"
        >
          {state.fieldErrors.password}
        </p>
      ) : null}

      <label
        className="block space-y-2"
        htmlFor="update-password-confirmPassword"
      >
        <span className="text-sm font-semibold text-slate-700">
          Powtórz nowe hasło
        </span>
        <input
          aria-describedby={fieldDescription(state, "confirmPassword")}
          aria-invalid={Boolean(state.fieldErrors.confirmPassword)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="update-password-confirmPassword"
          name="confirmPassword"
          placeholder="Wpisz nowe hasło ponownie"
          type="password"
        />
      </label>
      {state.fieldErrors.confirmPassword ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="update-password-confirmPassword-error"
        >
          {state.fieldErrors.confirmPassword}
        </p>
      ) : null}

      <SubmitButton
        className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        label="Zmień hasło"
        pendingLabel="Zapisywanie..."
      />

      <AuthStatusMessage
        authMessage={
          state.message
            ? {
                status: state.status === "success" ? "success" : "error",
                message: state.message,
              }
            : null
        }
      />
    </form>
  );
}
