export function normalizeRelation<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value)) {
    const first = value[0];
    return (first ?? fallback) as T;
  }

  if (value && typeof value === 'object') {
    return value as T;
  }

  return fallback;
}