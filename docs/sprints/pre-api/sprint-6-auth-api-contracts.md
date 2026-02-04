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

## Task 7: Push Notification Infrastructure

**File**: `services/push-notification-service.ts` + `hooks/usePushNotifications.ts`

Set up the notification pipeline (mock for now, ready for real push later):

```typescript
import * as Notifications from 'expo-notifications';

// Register for push notifications
async function registerForPushNotifications(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Store token — will send to server when API exists
  await apiClient.set('push_token', token);
  return token;
}

// Schedule local notification (works without server)
async function scheduleLocalNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: Notifications.NotificationTriggerInput;
}): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body, data: params.data },
    trigger: params.trigger,
  });
}
```

**Notification types** (all work locally for MVP, server-push ready):

| Type | Trigger | Example |
|------|---------|---------|
| `booking_confirmed` | Booking created | "Booking confirmed: Tue 4pm with Coach Marcus" |
| `booking_cancelled` | Booking cancelled | "Coach Marcus cancelled your session" |
| `invite_received` | Invite created | "Coach Marcus invited Jake to a session" |
| `rsvp_request` | Group session created | "U12 Training Tue 6pm — is Jake coming?" |
| `session_reminder_24h` | 24h before session | "Tomorrow: Jake's session at 4pm" |
| `session_reminder_1h` | 1h before session | "In 1 hour: session at Hackney Downs" |
| `review_prompt` | Session completed | "How was Jake's session?" |
| `new_review` | Review submitted | "New 5-star review from Sarah M." |
| `new_message` | Message received | "Sarah M.: Can we reschedule?" |
| `badge_earned` | Badge awarded | "Jake earned First Touch Master!" |
| `milestone` | Milestone reached | "You've completed 50 sessions!" |
| `video_shared` | Coach shares video/annotation | "Coach Marcus shared a video from Jake's session" |
| `drill_completed` | Athlete completes drill | "Jake completed Cone Weave Dribbling ✓" (→ coach) |
| `roster_added` | Coach adds athlete to roster | "Jake has been added to Coach Marcus's roster" |
| `no_show_marked` | Coach marks no-show | "Jake was marked as no-show" (→ parent) |
| `booking_request` | Parent books (manual confirm mode) | "New booking request from Sarah M." (→ coach) |
| `reschedule_request` | Coach proposes reschedule | "Coach Marcus wants to move your session" (→ parent) |
| `price_change` | Coach updates rate | "Rate updated. Your existing bookings unaffected." (→ parent) |
| `slot_freed` | Booking cancelled, waitlist exists | "A spot opened up for Tue 4pm" (→ waitlisted parent) |
| `review_reply` | Coach replies to review | "Coach Marcus replied to your review" (→ parent) |
| `coach_on_way` | Coach taps "I'm on my way" | "Coach Marcus is on the way!" (→ parent) |
| `goal_completed` | Goal marked complete | "Jake completed: Master keepy-ups!" (→ parent + athlete) |
| `announcement_critical` | Admin posts critical announcement | "Training CANCELLED this Saturday" (→ all members) |
| `group_session_created` | Coach creates group session | "New: U12 Training Tue 6pm" (→ squad parents) |
| `group_session_cancelled` | Coach cancels group session | "U12 Training cancelled" (→ registered parents) |
| `registration_received` | Parent registers for group session | "[Athlete] registered" (→ coach) |
| `registration_cancelled` | Parent drops out of session | "[Athlete] dropped out" (→ coach) |
| `event_created` | Coach creates club event | "New event: [name]" (→ club members) |
| `event_cancelled` | Coach cancels event | "[Event] cancelled" (→ RSVPed members) |
| `event_rsvp` | Parent RSVPs to event | "[Name] is going" (→ organiser) |
| `event_checkin` | Coach checks in athlete | "Jake checked in" (→ parent) |
| `member_removed` | Admin removes member | "You've been removed from [club]" (→ member) |
| `member_promoted` | Admin promotes member | "You're now admin of [group]" (→ member) |
| `carpool_accepted` | Driver accepts request | "Ride confirmed!" (→ passenger) |
| `carpool_cancelled` | Driver cancels offer | "Ride cancelled" (→ all passengers) |
| `guardian_invited` | Parent invites guardian | "Family invite from [name]" (→ guardian) |
| `guardian_removed` | Parent removes guardian | "Removed from family" (→ guardian) |
| `goal_created` | Coach creates goal | "New goal: [name]" (→ athlete + parent) |
| `goal_progress` | Coach updates progress | "Goal [name] now at [x]%" (→ athlete + parent) |
| `milestone_completed` | Coach/athlete completes | "Milestone done: [name]" (→ other side) |

**Permission flow**:
```
┌─────────────────────────────────────┐
│                                     │
│         🔔                          │
│                                     │
│   Stay in the loop                  │
│                                     │
│   Get notified about:               │
│   • Session reminders               │
│   • Booking updates                 │
│   • Messages from coaches           │
│   • Your child's achievements       │
│                                     │
│   [Enable Notifications]            │
│                                     │
│   [Not Now]                         │
│                                     │
└─────────────────────────────────────┘
```

Ask during onboarding (Sprint 10), not on first app open.

## Task 8: In-App Notification Centre

**File**: `app/notifications.tsx` + `components/ui/notification-bell.tsx`

Bell icon in header with badge count:

```
┌─────────────────────────────────────┐
│ Notifications                       │
│                                     │
│ Today                               │
│ ┌──────────────────────────────┐   │
│ │ 🟢 Booking confirmed         │   │
│ │ Tue 4pm with Coach Marcus    │   │
│ │ 2 hours ago                  │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ 🏅 Badge earned!             │   │
│ │ Jake earned "Passing Pro"    │   │
│ │ 3 hours ago                  │   │
│ └──────────────────────────────┘   │
│                                     │
│ Yesterday                           │
│ ┌──────────────────────────────┐   │
│ │ ⭐ New review                │   │
│ │ Sarah M. gave you 5 stars   │   │
│ │ 1 day ago                    │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Grouped by day
- Tap notification → navigate to relevant screen (deep link)
- Mark as read on tap
- "Mark all as read" action
- Badge count on bell icon (unread count)
- Stored locally for MVP (api-client), server-synced later

## Task 9: Deep Linking

**File**: `app/_layout.tsx` + `app.json` (linking config)

Set up Expo Router deep links for all shareable/notifiable content:

| Link | Screen |
|------|--------|
| `clubroom://booking/:id` | Booking detail |
| `clubroom://coach/:id` | Coach profile |
| `clubroom://coach/:slug/public` | Public coach profile |
| `clubroom://invite/:id` | Invite acceptance |
| `clubroom://club/join/:code` | Club join flow |
| `clubroom://session/:id/rsvp` | Session RSVP |
| `clubroom://notifications` | Notification centre |
| `clubroom://challenge/:id` | Video challenge |

- Used by push notifications (tap → open correct screen)
- Used by share links (coach profile, progress reports)
- Universal links for web sharing (future)
- Expo Router handles matching automatically via file-based routing

```typescript
// In notification handler
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  if (data.deepLink) {
    router.push(data.deepLink);
  }
});
```

## Task 10: Type Fixes for Two-Sided Interactions

**File**: `constants/app-types.ts` + `constants/types.ts`

These types are missing fields needed for proper Action→Reaction:

```typescript
// BookingStatus — add manual confirmation state
type BookingStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';

// Booking — add confirmation tracking
interface Booking {
  // ... existing fields ...
  confirmationMode: 'auto' | 'manual';  // NEW — coach preference
  confirmedAt?: string;                   // NEW — when coach confirmed (manual mode)
  declinedReason?: string;                // NEW — if coach declines booking request
}

// SessionInvite — add decline reason
interface SessionInvite {
  // ... existing fields ...
  declineReason?: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  declineNote?: string;
}

// Goal — add verification from both sides
interface Goal {
  // ... existing fields ...
  coachVerified?: boolean;       // NEW — coach confirms progress
  coachVerifiedAt?: string;
  parentAcknowledged?: boolean;  // NEW — parent saw the goal
  parentAcknowledgedAt?: string;
}

// WaitlistEntry — add user response when notified
interface WaitlistEntry {
  // ... existing fields ...
  notifiedAt?: string;
  userResponse?: 'accepted' | 'declined' | 'expired';
  userRespondedAt?: string;
  expiresAt?: string;  // 24h to respond before spot goes to next person
}

// ChatMessage — per-recipient read tracking
interface MessageReadReceipt {
  recipientId: string;
  readAt: string;
}

interface ChatMessage {
  // ... existing fields ...
  readReceipts?: MessageReadReceipt[];  // NEW — replaces simple 'read' boolean
}
```

## Acceptance Criteria

- [ ] Auth service supports login, register, logout, forgot password, token refresh
- [ ] Demo mode still works perfectly with all existing test accounts
- [ ] `USE_MOCK` toggle switches between local data and API calls
- [ ] Access token injected into all API requests automatically
- [ ] Token refresh happens transparently on 401
- [ ] All API contracts documented per domain in `API_README.md`
- [ ] Typed error classes used across all services
- [ ] Login state persists across app restarts
- [ ] Push notification permission request flow
- [ ] Local notifications work for all 26 notification types
- [ ] In-app notification centre with bell icon + badge count
- [ ] Tap notification → navigate to relevant screen
- [ ] Notification preferences saved (per-type toggles from Sprint 5)
- [ ] Deep links work for all shareable/notifiable content
- [ ] Notification tap opens correct screen via deep link
- [ ] BookingStatus includes AWAITING_CONFIRMATION for manual confirm
- [ ] SessionInvite has declineReason + declineNote fields
- [ ] Goal has coachVerified + parentAcknowledged fields
- [ ] WaitlistEntry has user response tracking with 24h expiry
- [ ] ChatMessage uses per-recipient read receipts

## Files Changed

| File | Action |
|------|--------|
| `services/auth-service.ts` | REWRITE |
| `hooks/use-auth.tsx` | REWRITE |
| `services/api-client.ts` | MODIFY — add auth headers, mock toggle |
| `services/api-contracts.ts` | MODIFY — full endpoint documentation |
| `services/push-notification-service.ts` | CREATE — register, schedule, handle |
| `hooks/usePushNotifications.ts` | CREATE — permission + listener setup |
| `app/(tabs)/notifications.tsx` | ENHANCE (378 lines exist) — add deep link tap, grouped by day, mark all read |
| `components/ui/notification-bell.tsx` | CREATE — bell icon + badge |
| `constants/error-types.ts` | CREATE |
| `constants/notification-types.ts` | CREATE — all notification type definitions |
| `app/_layout.tsx` | MODIFY — add deep link handling + notification listener |
| `.env.example` | CREATE — document EXPO_PUBLIC_USE_MOCK |
