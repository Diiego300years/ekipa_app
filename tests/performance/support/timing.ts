type TimingKind = "route" | "action";
type TimingStatus = "OK" | "WARN" | "SLOW";

const routeThresholds = {
  excellentMs: 1000,
  warningMs: 2000,
} as const;

const actionThresholds = {
  excellentMs: 500,
  warningMs: 1000,
  criticalMs: 2000,
} as const;

function formatDuration(durationMs: number) {
  return `${Math.round(durationMs)} ms`;
}

function getTimingStatus(kind: TimingKind, durationMs: number): TimingStatus {
  if (kind === "route") {
    if (durationMs < routeThresholds.excellentMs) {
      return "OK";
    }

    if (durationMs > routeThresholds.warningMs) {
      return "SLOW";
    }

    return "WARN";
  }

  if (durationMs < actionThresholds.excellentMs) {
    return "OK";
  }

  if (durationMs > actionThresholds.warningMs) {
    return "SLOW";
  }

  return "WARN";
}

function getThresholdSummary(kind: TimingKind, durationMs: number) {
  if (kind === "route") {
    return `OK < ${routeThresholds.excellentMs} ms, WARN ${routeThresholds.excellentMs}-${routeThresholds.warningMs} ms, SLOW > ${routeThresholds.warningMs} ms`;
  }

  const criticalNote =
    durationMs > actionThresholds.criticalMs
      ? `, CRITICAL > ${actionThresholds.criticalMs} ms`
      : "";

  return `OK < ${actionThresholds.excellentMs} ms, WARN ${actionThresholds.excellentMs}-${actionThresholds.warningMs} ms, SLOW > ${actionThresholds.warningMs} ms${criticalNote}`;
}

export function getPerformanceTargetLabel() {
  const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;

  if (!configuredBaseURL) {
    return "local dev server";
  }

  try {
    const url = new URL(configuredBaseURL);
    const path = url.pathname === "/" ? "" : url.pathname;

    return `${url.origin}${path}`;
  } catch {
    return "custom PLAYWRIGHT_BASE_URL";
  }
}

export async function measureAndLog<T>(
  label: string,
  kind: TimingKind,
  operation: () => Promise<T>,
) {
  const start = performance.now();
  const result = await operation();
  const durationMs = performance.now() - start;
  const status = getTimingStatus(kind, durationMs);

  console.log(
    `[perf] ${status} ${label}: ${formatDuration(
      durationMs,
    )} (${getThresholdSummary(kind, durationMs)})`,
  );

  return result;
}
