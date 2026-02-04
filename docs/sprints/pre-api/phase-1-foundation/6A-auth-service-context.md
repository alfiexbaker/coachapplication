# 6A: Auth Service + Context

**Phase**: 1 — Foundation
**Origin**: Sprint 6, Tasks 1, 2, 3
**Estimated scope**: 3 tasks, JWT auth plumbing

## Goal

Auth flow is ready for a real backend. JWT-based login/register/refresh. Demo mode still works perfectly. Access token injected into all API requests.

## Tasks

### Task 1: Auth Service Rewrite

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

**Key requirement**: Demo mode must still work perfectly. The `USE_MOCK` toggle controls whether we hit real APIs or use local data.

### Task 2: Auth Context Update

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

### Task 3: API Client — Auth Headers

**File**: `services/api-client.ts` (from 1A)

Add auth token injection for API mode:

```typescript
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

## Acceptance Criteria

- [ ] Auth service supports login, register, logout, forgot password, token refresh
- [ ] Demo mode still works perfectly with all existing test accounts
- [ ] Access token injected into all API requests automatically
- [ ] Token refresh happens transparently on 401
- [ ] Login state persists across app restarts

## Files Changed

| File | Action |
|------|--------|
| `services/auth-service.ts` | REWRITE |
| `hooks/use-auth.tsx` | REWRITE |
| `services/api-client.ts` | MODIFY — add auth headers |

## Dependencies

- **Blocks**: 6B (contracts reference auth endpoints)
- **Blocked by**: 1A (needs api-client)
