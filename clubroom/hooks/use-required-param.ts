import { useLocalSearchParams } from 'expo-router';

type ParamResult =
  | { valid: true; value: string }
  | { valid: false; value: undefined };

export function useRequiredParam<T extends string>(name: T): ParamResult {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const raw = params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value || typeof value !== 'string') {
    return { valid: false, value: undefined };
  }

  return { valid: true, value };
}
