import { afterEach, describe, expect, it, vi } from "vitest";
import { isRetryableError, retry } from "./retry.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("retry", () => {
  it("retries transient failures with exponential backoff", async () => {
    vi.useFakeTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: "unavailable" })
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue("done");

    const result = retry(operation, { delayMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    await expect(result).resolves.toBe("done");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("stops after the configured number of attempts", async () => {
    vi.useFakeTimers();
    const error = { code: "unavailable" };
    const operation = vi.fn().mockRejectedValue(error);

    const result = retry(operation, { attempts: 2, delayMs: 10 });
    const rejection = expect(result).rejects.toBe(error);
    await vi.runAllTimersAsync();

    await rejection;
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent errors", async () => {
    const error = { code: "permission-denied" };
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retry(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("does not retry programming TypeErrors", async () => {
    const error = new TypeError("Cannot read properties of undefined");
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retry(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("recognizes transient Firebase errors", () => {
    expect(isRetryableError({ code: "firestore/unavailable" })).toBe(true);
    expect(isRetryableError({ code: "permission-denied" })).toBe(false);
  });
});
