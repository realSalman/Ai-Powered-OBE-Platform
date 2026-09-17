import { cacheGet, cacheSet } from '../../config/redis';

// Active in-flight promises map to prevent cache stampedes (Singleflight pattern)
const inFlightPromises = new Map<string, Promise<any>>();

/**
 * Read-through caching with built-in Cache Stampede (Singleflight) protection.
 * If 200 concurrent requests request an expired key at the same millisecond,
 * only ONE request executes the database fetchFn while all others await the same promise.
 */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 1. Check Redis cache
  const cached = await cacheGet(key);
  if (cached !== null && cached !== undefined) return cached as T;

  // 2. Check if a concurrent request is already resolving this key
  const existingPromise = inFlightPromises.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  // 3. Execute fetchFn and register the promise
  const fetchPromise = (async () => {
    try {
      const data = await fetchFn();
      if (data !== undefined && data !== null) {
        await cacheSet(key, data, ttlSeconds);
      }
      return data;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, fetchPromise);
  return fetchPromise;
}
