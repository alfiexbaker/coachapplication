import { useLocalSearchParams } from 'expo-router';

type ParamResult =
  | { valid: true; value: string }
  | { valid: false; value: undefined };

export function useRequiredParam<T extends string>(name: T): ParamResult {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const raw = params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value || typeof value !== 'string') {
    return { valid: false, value: undefined };
  }

  return { valid: true, value };
}

export function useOptionalParam<T extends string>(name: T): string | undefined {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const raw = params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== 'string') return undefined;
  return value;
}
