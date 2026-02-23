# Sprint 6: Build the API

**Duration**: Ongoing (after Sprints 1-5 complete)
**Goal**: Wire up real backend — the codebase is now ready

---

## Prerequisites (must be complete)

- [x] Sprint 1: All bugs fixed, safety guards in place
- [x] Sprint 2: All hardcoded values replaced with tokens
- [x] Sprint 3: Data layer shaped for REST (IDs, endpoints, pagination, denorm cleanup)
- [x] Sprint 4: Tests cover error paths and API swap contract
- [x] Sprint 5: Accessibility and UX polish complete

---

## 6.1 Backend API (choose your stack)

- [ ] Define REST API schema (OpenAPI 3.1)
- [ ] Map all 120 storage keys to REST endpoints (using `constants/api-endpoints.ts` from Sprint 3)
- [ ] Implement auth endpoints (login, register, refresh, revoke)
- [ ] Implement CRUD endpoints for each service module
- [ ] Add pagination (cursor-based) on all list endpoints
- [ ] Add validation middleware (field-level error responses)
- [ ] Add rate limiting (match existing client-side 429 handling)

---

## 6.2 Client Integration

- [ ] Flip `USE_MOCK` to `false` in `services/api-client.ts`
- [ ] Wire `apiFetch()` to use `Endpoints` map from `constants/api-endpoints.ts`
- [ ] Replace storage-key-based routing with endpoint-based routing
- [ ] Implement request/response transformers (if API DTOs differ from client types)
- [ ] Wire offline queue into apiClient for automatic offline mutation queuing
- [ ] Add network state listener (`@react-native-community/netinfo`)

---

## 6.3 Auth Flow

- [ ] Implement PKCE OAuth flow for mobile
- [ ] Store refresh token in `expo-secure-store` (not AsyncStorage)
- [ ] Validate JWT expiry before each request
- [ ] Handle token rotation (new refresh token on each refresh)
- [ ] Server-side session revocation on logout

---

## 6.4 Data Migration

- [ ] Create migration script: AsyncStorage seed data → API database
- [ ] Handle ID format change (old `Date.now_random` → new UUID)
- [ ] Remove seed data dependency — real users create real data
- [ ] Onboarding flow for empty-state users (no seed data)

---

## 6.5 Monitoring & Error Handling

- [ ] Wire ServiceError codes to Sentry/error tracking
- [ ] Add request logging middleware
- [ ] Add performance monitoring (response times, cache hit rates)
- [ ] Add health check endpoint

---

## What you DON'T need to change

The following are already API-ready and should NOT be modified:
- Service layer (141 files) — Result pattern, error handling, event emission
- Type system — discriminated unions, typed events
- Component layer — uses services via hooks, doesn't touch data directly
- Event bus — decoupled communication, works the same with real API
- Screen states — loading/error/empty/success pattern handles async naturally

**The architecture was built for this moment.**
