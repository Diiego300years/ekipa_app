"use client";

import { SubmitButton } from "@/app/submit-button";

type VoteButtonProps = {
  label?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
};

export function VoteButton({
  label = "Głosuj",
  pendingLabel = "Głosowanie...",
  variant = "primary",
}: VoteButtonProps) {
  const className =
    variant === "secondary"
      ? "min-h-11 min-w-[9.75rem] whitespace-nowrap rounded-md border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      : "min-h-11 min-w-[9.75rem] whitespace-nowrap rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400";

  return (
    <SubmitButton
      className={className}
      label={label}
      pendingLabel={pendingLabel}
    />
  );
}
