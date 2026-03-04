export function normalizeForJson<T>(value: T): T {
  const normalized = JSON.parse(
    JSON.stringify(value, (_, currentValue: unknown) => {
      if (typeof currentValue === 'bigint') {
        return Number(currentValue);
      }
      if (currentValue instanceof Date) {
        return currentValue.toISOString();
      }
      return currentValue;
    }),
  ) as T;
  return normalized;
}
