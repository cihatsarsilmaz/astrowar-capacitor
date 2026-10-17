const RETRYABLE_CODES = new Set([
  "aborted",
  "deadline-exceeded",
  "internal",
  "network-request-failed",
  "resource-exhausted",
  "unavailable",
]);

export function isRetryableError(error) {
  const code = String(error?.code || "").split("/").pop();
  if (RETRYABLE_CODES.has(code)) return true;
  if (error?.name === "TypeError" && /fetch|network/i.test(error?.message || "")) return true;
  return /network|timeout|temporarily unavailable|connection/i.test(error?.message || "");
}

export async function retry(operation, { attempts = 3, delayMs = 250, maxDelayMs = 2000 } = {}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt + 1 >= attempts || !isRetryableError(error)) throw error;
      const delay = Math.min(delayMs * 2 ** attempt, maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
