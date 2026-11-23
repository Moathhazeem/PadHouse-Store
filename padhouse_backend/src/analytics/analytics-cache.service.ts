import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * Small in-process TTL cache for the Analytics read endpoints.
 *
 * Analytics payloads are expensive (several cross-table aggregations) but only
 * change when sales, refunds, purchases or inventory movements are written.
 * Caching them for a short window removes most of that cost while staying
 * correct, because every relevant write path calls {@link invalidateAll} through
 * the module wiring.
 *
 * Design notes:
 *  - Deliberately dependency-free (a single `Map`) so no extra runtime package
 *    is required. It is per-process, which is fine for this single-instance API;
 *    a shared store (Redis) can replace it later behind the same interface.
 *  - Entries expire on read and are dropped lazily — no timers to leak.
 *  - `ANALYTICS_CACHE_TTL_MS` (env) tunes the window; `0` disables caching.
 */
@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor() {
    const configured = Number(process.env.ANALYTICS_CACHE_TTL_MS);
    this.ttlMs = Number.isFinite(configured) && configured >= 0 ? configured : 30_000;
  }

  /** Builds a stable cache key from a scope and its (order-independent) params. */
  buildKey(scope: string, params: Record<string, unknown> = {}): string {
    const normalized = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key] ?? ''}`)
      .join('&');
    return normalized ? `${scope}?${normalized}` : scope;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    if (this.ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Returns the cached value or computes, stores and returns a fresh one. */
  async wrap<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    this.set(key, value);
    return value;
  }

  /**
   * Drops every cached analytics payload. Called after any write that can change
   * a sales, refund, purchase or inventory-movement aggregate.
   */
  invalidateAll(): void {
    if (this.store.size === 0) return;
    this.store.clear();
    this.logger.debug('Analytics cache invalidated');
  }
}
