/**
 * Secure Hybrid Cache Manager for Skin Hub Next.js Backend
 * Supports Upstash Redis REST API with automatic fallback to high-speed In-Memory cache.
 */

import { Redis } from '@upstash/redis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL: number = 600; // Default 10 minutes in seconds
  private redis: Redis | null = null;
  private isRedisConfigured: boolean = false;

  // List of forbidden patterns for cache keys to prevent accidental storing of sensitive patient PII
  private FORBIDDEN_KEY_PATTERNS = [
    'patient:',
    'prescription:',
    'auth_token',
    'password',
    'session:',
    'medical_record:',
  ];

  constructor() {
    this.initRedis();

    // Background cleanup of expired items in local memory every 3 minutes
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        this.cleanupExpiredMemory();
      }, 3 * 60 * 1000);
      if (interval.unref) {
        interval.unref(); // Don't block Node process termination
      }
    }
  }

  private initRedis(): void {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token && url.startsWith('http')) {
      try {
        this.redis = new Redis({ url, token });
        this.isRedisConfigured = true;
        console.log('[CACHE] Upstash Redis initialized successfully');
      } catch (err) {
        console.warn('[CACHE] Failed to initialize Upstash Redis, falling back to in-memory cache:', err);
        this.redis = null;
        this.isRedisConfigured = false;
      }
    } else {
      this.redis = null;
      this.isRedisConfigured = false;
    }
  }

  /**
   * Returns current cache mode status
   */
  getStatus(): { redisActive: boolean; localMemoryKeys: number } {
    return {
      redisActive: this.isRedisConfigured && this.redis !== null,
      localMemoryKeys: this.memoryCache.size,
    };
  }

  /**
   * Enforces security check to prevent storing private patient/auth data in global cache
   */
  private checkSecurityGuardrail(key: string): void {
    const lowerKey = key.toLowerCase();
    for (const pattern of this.FORBIDDEN_KEY_PATTERNS) {
      if (lowerKey.includes(pattern)) {
        throw new Error(
          `[SECURITY ERROR] Attempted to store sensitive/private key pattern "${pattern}" in global cache. Private data must not be cached globally.`
        );
      }
    }
  }

  /**
   * Retrieve cached value if present and not expired (Tries Redis first, then Memory)
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Try Redis if available
    if (this.redis) {
      try {
        const redisValue = await this.redis.get<T>(key);
        if (redisValue !== null && redisValue !== undefined) {
          return redisValue;
        }
      } catch (err) {
        console.warn(`[CACHE] Redis get error for key "${key}", falling back to local memory:`, err);
      }
    }

    // 2. Fallback to Local Memory Cache
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cached value with TTL in seconds (Stores in both Redis and Memory)
   */
  async set<T>(key: string, value: T, ttlSeconds: number = this.defaultTTL): Promise<void> {
    this.checkSecurityGuardrail(key);

    // Set in Local Memory Cache
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryCache.set(key, { value, expiresAt });

    // Set in Redis if available
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
      } catch (err) {
        console.warn(`[CACHE] Redis set error for key "${key}":`, err);
      }
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key);

    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        console.warn(`[CACHE] Redis del error for key "${key}":`, err);
      }
    }

    return memoryDeleted;
  }

  /**
   * Invalidate all keys matching a prefix pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;

    // Delete from Local Memory Cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    // Delete matching keys from Redis if available
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err) {
        console.warn(`[CACHE] Redis invalidatePattern error for pattern "${pattern}":`, err);
      }
    }

    return count;
  }

  /**
   * Cache wrapper for async fetch functions (Get or Set)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshValue = await fetchFn();
    if (freshValue !== null && freshValue !== undefined) {
      await this.set(key, freshValue, ttlSeconds);
    }
    return freshValue;
  }

  /**
   * Evict all expired entries from memory cache
   */
  private cleanupExpiredMemory(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear entire local memory cache
   */
  clear(): void {
    this.memoryCache.clear();
  }
}

// Export singleton instance
export const cache = new CacheManager();
export default cache;
