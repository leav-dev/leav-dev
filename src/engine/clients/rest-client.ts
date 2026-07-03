import { Octokit } from '@octokit/rest';
import type { RestClient as RestClientInterface } from '../types/engine.js';
import { RateLimiter } from './rate-limiter.js';

export interface RestClientConfig {
  token: string;
  maxRetries?: number;
}

export class RestClient implements RestClientInterface {
  private octokit: Octokit;
  private limiter: RateLimiter;

  constructor(config: RestClientConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.limiter = new RateLimiter(2);
  }

  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<{ data: T }> {
    return this.limiter.schedule(async () => {
      const response = await withRetry(() => this.octokit.request(`GET ${url}`, params ?? {}));
      return { data: response.data as T };
    });
  }

  async paginate<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T[]> {
    return this.limiter.schedule(async () => {
      const items = await this.octokit.paginate(`GET ${url}`, params ?? {});
      return items as T[];
    });
  }

  async search<T = unknown>(url: string, params?: Record<string, unknown>): Promise<{ data: { items: T[]; total_count: number } }> {
    return this.limiter.schedule(async () => {
      const response = await withRetry(() => this.octokit.request(`GET ${url}`, params ?? {}));
      return { data: response.data as { items: T[]; total_count: number } };
    });
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 403 || status === 429) {
        const wait = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await sleep(wait);
        continue;
      }
      if (status === 401 || status === 404) throw err;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 500);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
