import { env } from '@clubroom/config';
import { serviceUnavailable } from './http-errors.js';

export type ApiDataBackend = 'seed' | 'db';

export function getApiDataBackend(): ApiDataBackend {
  return env.API_DATA_BACKEND;
}

export function assertSeedBackendEnabled(context: string): void {
  if (getApiDataBackend() !== 'seed') {
    throw serviceUnavailable('Seed-backed endpoint is disabled', {
      context,
      apiDataBackend: getApiDataBackend(),
      expected: 'seed',
      action: 'Set API_DATA_BACKEND=seed or migrate this endpoint to db repositories.',
    });
  }
}
