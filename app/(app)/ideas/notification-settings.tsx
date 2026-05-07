"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  type PushSubscriptionActionResult,
} from "./push-actions";

type NotificationSettingsProps = {
  isAuthenticated: boolean;
  loginHref: string;
  vapidPublicKey: string | null;
};

type NotificationStatus =
  | "checking"
  | "default"
  | "denied"
  | "granted"
  | "missing-key"
  | "register-error"
  | "removed"
  | "remove-error"
  | "removing"
  | "save-error"
  | "saved"
  | "saving"
  | "unsupported";

type NotificationState = {
  status: NotificationStatus;
  message: string;
  retryRemoveEndpoint?: string;
  subscription?: PushSubscription | null;
};

type SerializablePushSubscription = {
  endpoint?: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

const deviceCopy = "Powiadomienia dotyczą tej przeglądarki lub urządzenia.";

function hasPushSupport() {
  return (
    typeof window !== "undefined" &&
    Boolean(navigator.serviceWorker) &&
    Boolean(window.PushManager) &&
    Boolean(window.Notification)
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON() as SerializablePushSubscription;
  const endpoint = json.endpoint ?? subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Push subscription is missing required keys.");
  }

  return {
    endpoint,
    keys: {
      auth,
      p256dh,
    },
    userAgent: navigator.userAgent,
  };
}

function getStateFromPermission(
  permission: NotificationPermission,
  subscription: PushSubscription | null,
): NotificationState {
  if (permission === "denied") {
    return {
      status: "denied",
      message:
        "Powiadomienia są zablokowane w ustawieniach przeglądarki lub systemu. Odblokuj je tam, jeśli chcesz je włączyć.",
    };
  }

  if (permission === "granted" && subscription) {
    return {
      status: "saved",
      message: "Powiadomienia są włączone na tym urządzeniu.",
      subscription,
    };
  }

  if (permission === "granted") {
    return {
      status: "granted",
      message:
        "Zgoda na powiadomienia jest aktywna. Włącz je dla tego urządzenia.",
      subscription,
    };
  }

  return {
    status: "default",
    message: "Możesz włączyć powiadomienia o nowych pomysłach.",
    subscription,
  };
}

function getStatusClassName(status: NotificationStatus) {
  if (
    status === "denied" ||
    status === "missing-key" ||
    status === "unsupported"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (
    status === "register-error" ||
    status === "remove-error" ||
    status === "save-error"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (status === "removed" || status === "saved") {
    return "border-teal-200 bg-teal-50 text-teal-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function mapActionFailure(result: PushSubscriptionActionResult) {
  return result.status === "auth-required"
    ? "Zaloguj się ponownie, żeby zarządzać powiadomieniami."
    : result.message;
}

export function NotificationSettings({
  isAuthenticated,
  loginHref,
  vapidPublicKey,
}: NotificationSettingsProps) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [state, setState] = useState<NotificationState>({
    status: "checking",
    message: "Sprawdzanie obsługi powiadomień...",
  });

  const getRegistration = useCallback(async () => {
    if (registrationRef.current) {
      return registrationRef.current;
    }

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registrationRef.current = registration;
    return registration;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializePushState() {
      if (!isAuthenticated) {
        return;
      }

      if (!vapidPublicKey) {
        setState({
          status: "missing-key",
          message:
            "Powiadomienia są niedostępne, bo brakuje konfiguracji klucza publicznego.",
        });
        return;
      }

      if (!hasPushSupport()) {
        setState({
          status: "unsupported",
          message: "Ta przeglądarka nie obsługuje powiadomień push.",
        });
        return;
      }

      try {
        const registration = await getRegistration();
        const subscription = await registration.pushManager.getSubscription();

        if (!isMounted) {
          return;
        }

        setState(getStateFromPermission(Notification.permission, subscription));
      } catch {
        if (!isMounted) {
          return;
        }

        console.warn("[push] Service worker registration failed.");
        setState({
          status: "register-error",
          message:
            "Nie udało się przygotować powiadomień w tej przeglądarce. Spróbuj ponownie.",
        });
      }
    }

    initializePushState();

    return () => {
      isMounted = false;
    };
  }, [getRegistration, isAuthenticated, vapidPublicKey]);

  async function handleEnable() {
    if (!vapidPublicKey || !hasPushSupport()) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      status: "saving",
      message: "Włączanie powiadomień...",
    }));

    try {
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "denied") {
        setState(getStateFromPermission(permission, null));
        return;
      }

      if (permission !== "granted") {
        setState(getStateFromPermission(permission, null));
        return;
      }

      const registration = await getRegistration();
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          userVisibleOnly: true,
        }));
      const result = await savePushSubscriptionAction(
        serializeSubscription(subscription),
      );

      if (result.status !== "success") {
        setState({
          status: "save-error",
          message: mapActionFailure(result),
          subscription,
        });
        return;
      }

      setState({
        status: "saved",
        message: result.message,
        subscription,
      });
    } catch {
      setState((currentState) => ({
        ...currentState,
        status: "save-error",
        message: "Nie udało się zapisać powiadomień. Spróbuj ponownie.",
      }));
    }
  }

  async function removeSubscriptionFromDatabase(endpoint: string) {
    const result = await removePushSubscriptionAction({ endpoint });

    if (result.status !== "success") {
      setState({
        status: "remove-error",
        message:
          "Powiadomienia wyłączono w przeglądarce, ale nie udało się usunąć zapisu z bazy. Spróbuj ponownie.",
        retryRemoveEndpoint: endpoint,
        subscription: null,
      });
      return;
    }

    setState({
      status: "removed",
      message: result.message,
      subscription: null,
    });
  }

  async function handleDisable() {
    setState((currentState) => ({
      ...currentState,
      status: "removing",
      message: "Wyłączanie powiadomień...",
    }));

    try {
      const registration = await getRegistration();
      const subscription =
        state.subscription ?? (await registration.pushManager.getSubscription());

      if (!subscription) {
        setState({
          status: "removed",
          message: "Powiadomienia zostały wyłączone na tym urządzeniu.",
          subscription: null,
        });
        return;
      }

      const endpoint = subscription.endpoint;
      const didUnsubscribe = await subscription.unsubscribe();

      if (!didUnsubscribe) {
        setState({
          status: "remove-error",
          message: "Nie udało się wyłączyć powiadomień. Spróbuj ponownie.",
          subscription,
        });
        return;
      }

      await removeSubscriptionFromDatabase(endpoint);
    } catch {
      setState((currentState) => ({
        ...currentState,
        status: "remove-error",
        message: "Nie udało się wyłączyć powiadomień. Spróbuj ponownie.",
      }));
    }
  }

  async function handleRemoveRetry() {
    if (!state.retryRemoveEndpoint) {
      await handleDisable();
      return;
    }

    setState((currentState) => ({
      ...currentState,
      status: "removing",
      message: "Usuwanie zapisu powiadomień...",
    }));
    await removeSubscriptionFromDatabase(state.retryRemoveEndpoint);
  }

  if (!isAuthenticated) {
    return (
      <section
        className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="notification-settings"
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-950">
            Powiadomienia
          </h2>
          <p className="text-sm leading-6 text-slate-600">{deviceCopy}</p>
          <p className="text-sm leading-6 text-slate-600">
            Zaloguj się, żeby włączyć powiadomienia na tym urządzeniu.
          </p>
        </div>
        <Link
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
          href={loginHref}
        >
          Przejdź do logowania
        </Link>
      </section>
    );
  }

  const canEnable =
    state.status === "default" ||
    state.status === "granted" ||
    state.status === "removed" ||
    state.status === "save-error";
  const canDisable = state.status === "saved";
  const canRetryRemove = state.status === "remove-error";
  const isBusy = state.status === "saving" || state.status === "removing";

  return (
    <section
      className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="notification-settings"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-950">
          Powiadomienia
        </h2>
        <p className="text-sm leading-6 text-slate-600">{deviceCopy}</p>
      </div>

      <p
        aria-live="polite"
        className={`mt-3 rounded-md border px-3 py-2 text-sm font-medium leading-6 ${getStatusClassName(
          state.status,
        )}`}
        data-testid="notification-settings-status"
      >
        {state.message}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canEnable ? (
          <button
            className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isBusy}
            onClick={handleEnable}
            type="button"
          >
            Włącz powiadomienia
          </button>
        ) : null}

        {canDisable ? (
          <button
            className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isBusy}
            onClick={handleDisable}
            type="button"
          >
            Wyłącz powiadomienia
          </button>
        ) : null}

        {canRetryRemove ? (
          <button
            className="min-h-11 rounded-md border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-400"
            disabled={isBusy}
            onClick={handleRemoveRetry}
            type="button"
          >
            Spróbuj ponownie
          </button>
        ) : null}
      </div>
    </section>
  );
}
