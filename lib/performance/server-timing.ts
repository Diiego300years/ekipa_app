export async function measureServerTiming<T>(
  label: string,
  operation: () => PromiseLike<T> | T,
): Promise<T> {
  if (process.env.PERF_DEBUG !== "true") {
    return operation();
  }

  const start = performance.now();

  try {
    return await operation();
  } finally {
    const durationMs = Math.round(performance.now() - start);

    console.log(`[perf-debug] ${sanitizeTimingLabel(label)}: ${durationMs} ms`);
  }
}

function sanitizeTimingLabel(label: string) {
  const safeLabel = label.replace(/[^a-zA-Z0-9:._ -]/g, "").slice(0, 120);

  return safeLabel || "operation";
}
