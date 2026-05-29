import type { Result, ServiceError } from '@/types/result';

export type ApiAuthService = {
  getTokens: () => Promise<{
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null>;
  refreshToken: () => Promise<Result<unknown, ServiceError>>;
  logout: () => Promise<void>;
};

let registeredAuthService: ApiAuthService | null = null;

export function registerApiAuthService(authService: ApiAuthService): void {
  registeredAuthService = authService;
}

export function getRegisteredApiAuthService(): ApiAuthService | null {
  return registeredAuthService;
}
