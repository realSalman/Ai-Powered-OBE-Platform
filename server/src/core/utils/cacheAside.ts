import { cacheGet, cacheSet } from '../../config/redis';

export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) return cached as T;

  const data = await fetchFn();
  if (data !== undefined && data !== null) {
    await cacheSet(key, data, ttlSeconds);
  }
  return data;
}
