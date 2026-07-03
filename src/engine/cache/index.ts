import type { CacheAdapter, CacheManager } from '../types/engine.js';
import { MemoryCacheAdapter } from './adapters/memory.adapter.js';

export interface CacheConfig {
  adapter?: CacheAdapter;
  defaultTTL?: number;
}

export class CacheManagerImpl implements CacheManager {
  private adapter: CacheAdapter;
  private defaultTTL: number;

  constructor(config?: CacheConfig) {
    this.adapter = config?.adapter ?? new MemoryCacheAdapter();
    this.defaultTTL = config?.defaultTTL ?? 1800;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.adapter.set(key, value, ttl ?? this.defaultTTL);
  }

  async has(key: string): Promise<boolean> {
    return this.adapter.has(key);
  }

  async fetch<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}
