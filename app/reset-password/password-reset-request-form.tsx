"use client";

import { useActionState } from "react";

import { AuthStatusMessage } from "@/app/auth-status-message";
import {
  emptyAuthActionState,
  type AuthActionState,
} from "@/app/login/auth-state";

import { requestPasswordResetAction } from "./actions";

function fieldDescription(
  state: AuthActionState,
  field: keyof AuthActionState["fieldErrors"],
) {
  return state.fieldErrors[field] ? `reset-password-${field}-error` : undefined;
}

export function PasswordResetRequestForm() {
  const [state, submitAction, isPending] = useActionState(
    requestPasswordResetAction,
    emptyAuthActionState,
  );

  return (
    <form
      action={submitAction}
      className="space-y-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      noValidate
    >
      <label className="block space-y-2" htmlFor="reset-password-email">
        <span className="text-sm font-semibold text-slate-700">Email</span>
        <input
          aria-describedby={fieldDescription(state, "email")}
          aria-invalid={Boolean(state.fieldErrors.email)}
          className="min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
          id="reset-password-email"
          name="email"
          placeholder="email@example.com"
          type="email"
        />
      </label>
      {state.fieldErrors.email ? (
        <p
          className="text-sm font-medium leading-6 text-red-700"
          id="reset-password-email-error"
        >
          {state.fieldErrors.email}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Wysyłanie..." : "Wyślij link do zmiany hasła"}
      </button>

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
