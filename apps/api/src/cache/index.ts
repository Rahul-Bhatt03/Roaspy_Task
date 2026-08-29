export const cache = new Map<string, unknown>();

export function getCacheValue<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCacheValue<T>(key: string, value: T): void {
  cache.set(key, value);
}
