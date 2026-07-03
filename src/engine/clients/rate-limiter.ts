export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private lastCall = 0;
  private readonly minInterval: number;

  constructor(private maxRequestsPerSecond: number) {
    this.minInterval = 1000 / maxRequestsPerSecond;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result as T);
        } catch (err) {
          reject(err);
        }
      });
      void this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const elapsed = Date.now() - this.lastCall;
      if (elapsed < this.minInterval) {
        await sleep(this.minInterval - elapsed);
      }
      this.lastCall = Date.now();
      const fn = this.queue.shift()!;
      await fn();
    }

    this.processing = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
