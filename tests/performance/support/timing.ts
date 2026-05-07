type TimingKind = "route" | "action";
type TimingStatus = "OK" | "WARN" | "SLOW";

export const performanceMeasurementRepetitions = 3;

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

function formatDurationRange(durationMs: number[]) {
  const sortedDurations = [...durationMs].sort((first, second) => first - second);
  const minimumDuration = sortedDurations[0] ?? 0;
  const maximumDuration = sortedDurations[sortedDurations.length - 1] ?? 0;

  return `${formatDuration(minimumDuration)}-${formatDuration(maximumDuration)}`;
}

function getMedianDuration(durationMs: number[]) {
  if (durationMs.length === 0) {
    return 0;
  }

  const sortedDurations = [...durationMs].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedDurations.length / 2);

  if (sortedDurations.length % 2 === 1) {
    return sortedDurations[middleIndex];
  }

  return (sortedDurations[middleIndex - 1] + sortedDurations[middleIndex]) / 2;
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
  const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();

  if (!configuredBaseURL) {
    return "local dev server";
  }

  return configuredBaseURL;
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

export async function measureRepeatedAndLog<T>(
  label: string,
  kind: TimingKind,
  operation: (runIndex: number) => Promise<T>,
  repetitions = performanceMeasurementRepetitions,
) {
  const durations: number[] = [];
  let result: T | undefined;

  for (let runIndex = 0; runIndex < repetitions; runIndex += 1) {
    const start = performance.now();

    result = await operation(runIndex);
    durations.push(performance.now() - start);
  }

  const medianDuration = getMedianDuration(durations);
  const status = getTimingStatus(kind, medianDuration);

  console.log(
    `[perf] ${status} ${label}: median ${formatDuration(
      medianDuration,
    )}, range ${formatDurationRange(durations)}, runs ${durations
      .map(formatDuration)
      .join(", ")} (${getThresholdSummary(kind, medianDuration)})`,
  );

  return result as T;
}

export function createTimingCollector(kind: TimingKind) {
  const durationsByLabel = new Map<string, number[]>();

  return {
    async measure<T>(label: string, operation: () => Promise<T>) {
      const start = performance.now();
      const result = await operation();
      const durationMs = performance.now() - start;
      const durations = durationsByLabel.get(label) ?? [];

      durations.push(durationMs);
      durationsByLabel.set(label, durations);

      return result;
    },
    logSummary() {
      for (const [label, durations] of durationsByLabel) {
        const medianDuration = getMedianDuration(durations);
        const status = getTimingStatus(kind, medianDuration);

        console.log(
          `[perf] ${status} ${label}: median ${formatDuration(
            medianDuration,
          )}, range ${formatDurationRange(durations)}, runs ${durations
            .map(formatDuration)
            .join(", ")} (${getThresholdSummary(kind, medianDuration)})`,
        );
      }
    },
  };
}
