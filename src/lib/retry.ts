const DELAYS = [1000, 2000, 4000, 8000];

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= DELAYS.length; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === DELAYS.length) break;
      await new Promise((r) => setTimeout(r, DELAYS[i]));
    }
  }
  throw lastError;
}
