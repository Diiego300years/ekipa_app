import type { AuthRedirectMessage } from "@/lib/auth/redirect-message";

export function AuthStatusMessage({
  authMessage,
}: {
  authMessage: AuthRedirectMessage | null;
}) {
  if (!authMessage) {
    return null;
  }

  return (
    <p
      aria-live="polite"
      className={`rounded-md px-4 py-3 text-sm font-medium leading-6 ${
        authMessage.status === "success"
          ? "bg-teal-50 text-teal-900"
          : "bg-red-50 text-red-800"
      }`}
    >
      {authMessage.message}
    </p>
  );
}
