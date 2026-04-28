export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) break;

      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      if (onRetry) {
        onRetry(attempt, lastError);
      } else {
        console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export class AsyncQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private running = 0;

  constructor(private concurrency: number = 5) {}

  async add(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          return await task();
        } catch (e) {
          reject(e);
          throw e;
        }
      });
      this.process();
    });
  }

  private async process() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      this.running++;
      task()
        .finally(() => {
          this.running--;
          this.process();
        });
    }
  }
}
