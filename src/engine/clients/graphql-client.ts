import { graphql as octokitGraphql } from '@octokit/graphql';
import type { GraphQLClient as GraphQLClientInterface } from '../types/engine.js';
import { RateLimiter } from './rate-limiter.js';

export interface GraphQLClientConfig {
  token: string;
}

export class GraphQLClient implements GraphQLClientInterface {
  private gql: ReturnType<typeof octokitGraphql.defaults>;
  private limiter: RateLimiter;

  constructor(config: GraphQLClientConfig) {
    this.gql = octokitGraphql.defaults({ headers: { authorization: `token ${config.token}` } });
    this.limiter = new RateLimiter(1);
  }

  async query<T = Record<string, unknown>>(query: string, variables: Record<string, unknown>): Promise<T> {
    return this.limiter.schedule(async () => {
      return await withRetry(() => this.gql(query, variables) as Promise<T>);
    });
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 403 || e.status === 429 || (e.message && e.message.includes('secondary rate limit'))) {
        const wait = Math.pow(2, attempt) * 2000 + Math.random() * 2000;
        await sleep(wait);
        continue;
      }
      if (e.status === 401) throw err;
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
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
