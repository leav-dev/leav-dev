import type { GitHubMetrics } from './metrics.js';

export interface EngineConfig {
  token: string;
  username: string;
  /** @default true */
  includePrivate?: boolean;
  /** TTL en segundos por defecto para caché */
  cacheTTL?: number;
  /** Machine-friendly timestamp for contribution ranges */
  now?: Date;
}

export interface RestClient {
  get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<{ data: T }>;
  paginate<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T[]>;
  search<T = unknown>(url: string, params?: Record<string, unknown>): Promise<{ data: { items: T[]; total_count: number } }>;
}

export interface GraphQLResponse {
  user: Record<string, unknown> | null;
}

export interface GraphQLClient {
  query<T = Record<string, unknown>>(query: string, variables: Record<string, unknown>): Promise<T>;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheManager {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  /** Returns the cached value or computes and stores it */
  fetch<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>;
}

export interface MetricCollector<T> {
  readonly key: string;
  readonly dependencies?: string[];
  collect(ctx: CollectContext): Promise<CollectResult<T>>;
}

export interface CollectContext {
  rest: RestClient;
  graphql: GraphQLClient;
  cache: CacheManager;
  shared: Map<string, unknown>;
  config: EngineConfig;
}

export interface CollectResult<T> {
  key: string;
  data: T;
  meta: Record<string, { source: 'REST' | 'GRAPHQL' | 'DERIVED'; description: string; endpoint?: string; cached: boolean }>;
  errors: string[];
  cached: boolean;
  elapsed: number;
}

export interface MetricsEngine {
  collect(): Promise<GitHubMetrics>;
}
