import { api } from '@/constants/config';

export function isDemoMode(): boolean {
  return api.useMock;
}
