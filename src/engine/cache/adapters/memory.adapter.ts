import type { CacheAdapter } from '../../types/engine.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
