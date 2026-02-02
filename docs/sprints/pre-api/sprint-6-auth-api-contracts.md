# Sprint 6: Auth Preparation + API Contracts

## Goal

Auth flow is ready for a real backend (JWT-based). Every domain has a documented API contract. The service layer can be flipped from mock to real with a config change. This is the final sprint before backend work begins.

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **All** | I want to log in securely with email/password | Hardcoded demo users |
| **All** | I want to stay logged in between app restarts | No session persistence |
| **All** | I want to reset my password if I forget it | Mock function, does nothing |
| **Coach** | I want my data to be private to my account | No real auth — all data visible |
| **Parent** | I want my children's data to be secure | Same — no auth enforcement |

## Task 1: Auth Service Rewrite

**File**: `services/auth-service.ts`

Replace hardcoded demo users with a proper auth flow structure:

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

interface AuthState {
  user: SimplifiedUser | SimplifiedCoach | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const authService = {
  // Mock mode: works with demo users
  // API mode: calls POST /api/auth/login
  async login(email: string, password: string): Promise<AuthResult>,

  // Mock mode: creates demo user
  // API mode: calls POST /api/auth/register
  async register(input: RegisterInput): Promise<AuthResult>,

  // Store tokens securely (expo-secure-store in API mode)
  async storeTokens(tokens: AuthTokens): Promise<void>,

  // Get stored tokens
  async getTokens(): Promise<AuthTokens | null>,

  // Refresh expired access token
  // API mode: calls POST /api/auth/refresh
  async refreshToken(): Promise<AuthTokens>,

  // Clear all stored auth data
  async logout(): Promise<void>,

  // Check if user is still authenticated
  async checkAuth(): Promise<AuthState>,

  // Mock mode: no-op
  // API mode: calls POST /api/auth/forgot-password
  async forgotPassword(email: string): Promise<void>,

  // Mock mode: no-op
  // API mode: calls POST /api/auth/reset-password
  async resetPassword(token: string, newPassword: string): Promise<void>,
};
```

**Key requirement**: Demo mode must still work perfectly. The `USE_MOCK` toggle in `api-client.ts` controls whether we hit real APIs or use local data.

## Task 2: Auth Context Update

**File**: `hooks/use-auth.tsx`

Update the auth hook to:
- Call `authService.checkAuth()` on app start
- Inject access token into `api-client.ts` headers
- Handle token refresh automatically (transparent to UI)
- Redirect to login on 401 responses
- Persist login state across app restarts

```typescript
function useAuth() {
  return {
    user,
    isAuthenticated,
    isLoading, // true during initial auth check
    login: async (email, password) => { ... },
    logout: async () => { ... },
    register: async (input) => { ... },
    forgotPassword: async (email) => { ... },
  };
}
```

## Task 3: API Client — Auth Headers

**File**: `services/api-client.ts` (from Sprint 1)

Add auth token injection for API mode:

```typescript
// When USE_MOCK is false, all requests go through fetch with auth headers
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const tokens = await authService.getTokens();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens ? { 'Authorization': `Bearer ${tokens.accessToken}` } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    // Try refresh
    const newTokens = await authService.refreshToken();
    // Retry original request with new token
    ...
  }

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

## Task 4: API Contracts Per Domain

**File**: `services/api-contracts.ts` (update existing)

Document every endpoint the backend needs to provide. Grouped by domain. Each entry includes: method, path, request body, response body, auth requirement.

This is the contract between frontend and backend. See the full contracts in `API_README.md`.

## Task 5: Mock Toggle

**File**: `services/api-client.ts`

Single environment variable controls mock vs real:

```typescript
// In .env or config
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// In api-client.ts
export const apiClient = {
  async get<T>(key: string, fallback: T): Promise<T> {
    if (USE_MOCK) {
      // AsyncStorage path
      return mockGet(key, fallback);
    }
    // Real API path
    return apiFetch<T>(`/api/${key}`);
  },
  // ... same pattern for set, update, remove
};
```

## Task 6: Error Types

**File**: `constants/error-types.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

// Common errors
export class NotFoundError extends ApiError { ... }
export class ValidationError extends ApiError { ... }
export class UnauthorizedError extends ApiError { ... }
export class ForbiddenError extends ApiError { ... }
export class NetworkError extends ApiError { ... }
```

All services throw typed errors. All screens catch and display them via `ErrorState` (from Sprint 5).

## Acceptance Criteria

- [ ] Auth service supports login, register, logout, forgot password, token refresh
- [ ] Demo mode still works perfectly with all existing test accounts
- [ ] `USE_MOCK` toggle switches between local data and API calls
- [ ] Access token injected into all API requests automatically
- [ ] Token refresh happens transparently on 401
- [ ] All API contracts documented per domain in `API_README.md`
- [ ] Typed error classes used across all services
- [ ] Login state persists across app restarts

## Files Changed

| File | Action |
|------|--------|
| `services/auth-service.ts` | REWRITE |
| `hooks/use-auth.tsx` | REWRITE |
| `services/api-client.ts` | MODIFY — add auth headers, mock toggle |
| `services/api-contracts.ts` | MODIFY — full endpoint documentation |
| `constants/error-types.ts` | CREATE |
| `.env.example` | CREATE — document EXPO_PUBLIC_USE_MOCK |
