/**
 * Retry a function with exponential backoff.
 * Retries on network errors and 5xx responses.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on auth errors or client errors
      if (error instanceof SyncError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

export class SyncError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'SyncError';
    this.statusCode = statusCode;
  }
}

/**
 * Wrapper around fetch that throws SyncError with status codes
 * for better retry decision-making.
 */
export const syncFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new SyncError(
      `Google Drive API error: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  return response;
};
