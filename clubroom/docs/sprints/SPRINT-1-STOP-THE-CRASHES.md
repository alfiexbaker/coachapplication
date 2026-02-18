# Sprint 1: Stop the Crashes

**Goal**: Zero crash paths. Every button leads somewhere. New users can sign up and land on home screen.
**Size**: S (6 files)
**Priority**: P0 — do first, blocks everything

---

## Tasks

### 1.1 Create 5 missing screen files
**Files to create**:
- `app/settings/cancellation-policy.tsx`
- `app/settings/blocked-dates.tsx`
- `app/settings/smart-slots.tsx`
- `app/settings/travel-radius.tsx`
- `app/verification/insurance.tsx`

**What**: Each needs a basic screen with ScreenHeader + placeholder content explaining the feature. Use `useScreen()`, `LoadingState`, `EmptyState` pattern. Not full implementations — just stop the crash.

**Broken links**:
- `app/settings/coaching.tsx:145` → cancellation-policy
- `app/settings/coaching.tsx:162` → blocked-dates
- `app/settings/coaching.tsx:168` → smart-slots
- `app/settings/coaching.tsx:156` → travel-radius
- `app/verification/index.tsx:233` → insurance

### 1.2 Auto-login after signup
**File**: `components/auth/login-screen.tsx` (lines 91-95)
**Bug**: `onComplete={() => {}}` — empty callback after onboarding finishes
**Fix**: Set auth state from onboarding data and navigate to home. The onboarding already calls `registerFromOnboarding()` which creates the user — just need to set `currentUser` and dismiss the login screen.

### 1.3 Coach invite signup → auto-login
**File**: `components/auth/coach-signup-screen.tsx` (lines 100-104)
**Bug**: `setScreenMode('login')` after successful signup — dumps user back to login
**Fix**: After `onSignupComplete()`, call login with the credentials just created, navigate to home.

---

## Acceptance Criteria
- [ ] Tapping every button in Settings → Coaching leads to a real screen
- [ ] Tapping "Verify Insurance" leads to a real screen
- [ ] New coach signup → lands on coach home screen (not login)
- [ ] New athlete signup → lands on athlete home screen (not login)
- [ ] Coach invite code signup → lands on coach home screen (not login)
