import { SubmitButton } from "@/app/submit-button";

export function LogoutButton() {
  return (
    <SubmitButton
      className="min-h-10 min-w-[9.75rem] whitespace-nowrap rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      label="Wyloguj"
      pendingLabel="Wylogowywanie..."
    />
  );
}
