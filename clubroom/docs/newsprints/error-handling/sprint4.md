# Error Handling Sprint 4: Polish & Debugging

**Goal**: Improve error debugging, polish error displays, and add missing error boundaries.

**Items**: 135, 142, 149, 202, 211, 361, 362, 363, 364

---

## Item 135: Cancel reason error shows before user acts

**Problem**: `components/booking/cancel-reason-picker.tsx` ~77-84 shows validation error immediately. Should only validate on submit.

**Files**:
- `components/booking/cancel-reason-picker.tsx`

```
Only show validation error after user attempts submit.

FILE: `components/booking/cancel-reason-picker.tsx`

FIND error display (~77-84):
```typescript
const [selectedReason, setSelectedReason] = useState<string | null>(null);
const [customReason, setCustomReason] = useState('');

const error = !selectedReason && !customReason ? 'Please select or enter a reason' : null;

return (
  <Column gap={Spacing.md}>
    {error && <ThemedText color={colors.error}>{error}</ThemedText>}

    {/* reason picker */}
  </Column>
);
```

REPLACE with touched state:
```typescript
const [selectedReason, setSelectedReason] = useState<string | null>(null);
const [customReason, setCustomReason] = useState('');
const [touched, setTouched] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);

const hasError = !selectedReason && !customReason.trim();
const showError = touched && hasError;

const handleSubmit = useCallback(async () => {
  setTouched(true);

  if (hasError) {
    return; // Error will now show via showError
  }

  setIsSubmitting(true);

  const result = await cancelService.cancel({
    bookingId,
    reason: selectedReason || customReason,
  });

  setIsSubmitting(false);

  if (!result.success) {
    showToast(result.error.message || 'Failed to cancel booking', 'error');
    return;
  }

  showToast('Booking cancelled', 'success');
  onCancel?.();
}, [hasError, selectedReason, customReason, bookingId, onCancel, showToast]);

return (
  <Column gap={Spacing.md}>
    {showError && (
      <SurfaceCard style={{ backgroundColor: withAlpha(colors.error, 0.08) }}>
        <Row gap={Spacing.xs} align="center">
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <ThemedText style={{ color: colors.error }}>
            Please select or enter a cancellation reason
          </ThemedText>
        </Row>
      </SurfaceCard>
    )}

    {/* reason picker */}

    <Button
      variant="danger"
      onPress={handleSubmit}
      disabled={isSubmitting}
      loading={isSubmitting}
    >
      {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
    </Button>
  </Column>
);
```

NOTE: No try/catch — `cancelService.cancel()` returns `Result<T, ServiceError>`, not a thrown
exception. Check `result.success` directly. Use `useCallback` on the handler. Use `showToast`
from `useToast()` hook, not a bare `toast.*` call. Error card background uses `withAlpha(colors.error, 0.08)`
since `withAlpha(colors.error, 0.08)` does not exist in the theme.

ACCEPTANCE:
✅ Error hidden until user clicks submit
✅ Error shown in styled card with icon
✅ Submit button disabled during cancellation
✅ Success toast on complete
✅ No dead try/catch — Result checked via `result.success`
✅ Handler wrapped in useCallback
```

---

## Item 142: Invoice preview broken Typography import

**Problem**: `components/invoices/InvoicePreview.tsx` ~42-47 imports Typography incorrectly, causing crash on web.

**Files**:
- `components/invoices/InvoicePreview.tsx`

```
Fix Typography import and add error boundary.

FILE: `components/invoices/InvoicePreview.tsx`

FIND imports (~1-10):
```typescript
import { Typography } from '@/constants/theme';
import { ThemedText } from '@/components/primitives';
```

VERIFY Typography usage (~42-47):
```typescript
<Text style={{ fontSize: Typography.heading.size }}>
  Invoice #{invoice.number}
</Text>
```

ISSUE: Mixing raw Text with Typography constants. Should use ThemedText.

REPLACE with ThemedText:
```typescript
// Remove Typography import if only used for raw Text
import { ThemedText } from '@/components/themed-text';

// Replace all raw Text + Typography with ThemedText:
<ThemedText type="heading">
  Invoice #{invoice.number}
</ThemedText>

<ThemedText type="body">
  Date: {new Date(invoice.date).toLocaleDateString()}
</ThemedText>

<ThemedText type="bodyBold">
  Amount: £{invoice.amount.toFixed(2)}
</ThemedText>
```

ADD error boundary wrapper:
```typescript
// In parent component that renders InvoicePreview:
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary fallback={(error, errorInfo, reset) => (
  <SurfaceCard>
    <ThemedText style={{ color: colors.error }}>
      Failed to load invoice preview
    </ThemedText>
    <Button
      variant="secondary"
      size="compact"
      onPress={reset}
      style={{ marginTop: Spacing.sm }}
    >
      Try Again
    </Button>
  </SurfaceCard>
)}>
  <InvoicePreview invoice={invoice} />
</ErrorBoundary>
```

NOTE: The actual `ErrorBoundary.fallback` signature is `(error: Error, errorInfo: ErrorInfo, reset: () => void)`.
The `reset` parameter is the third argument — use it directly, not a separate `resetError` variable.
`ThemedText` does not accept a `color` prop — use inline `style={{ color: colors.error }}` instead.

ACCEPTANCE:
✅ All Text components replaced with ThemedText
✅ No direct Typography constant usage for text rendering
✅ InvoicePreview wrapped in ErrorBoundary
✅ Error fallback uses correct 3-arg signature `(error, errorInfo, reset)`
```

---

## Item 149: Club header Delete calls leave handler

**Problem**: `components/club/ClubHeader.tsx` ~159 delete button onPress calls handleLeave instead of handleDelete.

**Files**:
- `components/club/ClubHeader.tsx`

```
Fix delete button to call correct handler.

FILE: `components/club/ClubHeader.tsx`

FIND delete button (~159):
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={handleLeave}
>
  Delete Club
</Button>
```

VERIFY handleLeave exists and is for leaving, not deleting.

REPLACE with correct handler:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={handleDelete}
>
  Delete Club
</Button>
```

ADD handleDelete if missing:
```typescript
const handleDelete = useCallback(() => {
  Alert.alert(
    'Delete Club',
    `This will permanently delete "${club.name}" and all associated data. This cannot be undone.\n\nType the club name to confirm.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          router.push(`/club/${clubId}/delete-confirm`);
        },
      },
    ]
  );
}, [club.name, clubId]);
```

VERIFY handleLeave is used for Leave button (not Delete):
```typescript
{!isOwner && (
  <Button
    variant="secondary"
    size="compact"
    onPress={handleLeave}
  >
    Leave Club
  </Button>
)}

{isOwner && (
  <Button
    variant="danger"
    size="compact"
    onPress={handleDelete}
  >
    Delete Club
  </Button>
)}
```

NOTE: Wrap `handleDelete` in `useCallback` with correct deps.

ACCEPTANCE:
✅ Delete button calls handleDelete
✅ Leave button calls handleLeave
✅ handleDelete navigates to confirmation screen
✅ Buttons shown based on ownership
✅ Handler wrapped in useCallback
```

---

## Item 202: Error boundary shows stack trace

**Problem**: `components/error-boundary.tsx` ~88-129 shows full stack trace in production. Should hide in prod.

**Files**:
- `components/error-boundary.tsx`

```
Hide stack traces in production, show in dev.

CRITICAL NOTE: `ErrorBoundary` is a CLASS COMPONENT (React class lifecycle requirement).
Hooks (`useTheme`, `useRouter`, etc.) CANNOT be used inside class components.
The actual component already uses `Appearance.getColorScheme()` to get theme colors
and `__DEV__` to gate dev-only content. The stack trace is ALREADY gated behind `__DEV__`
at line 88. The actual fix needed is minimal.

FILE: `components/error-boundary.tsx`

VERIFY the existing render method (~68-148):
The actual code already does:
```typescript
// Line 76 — gets colors without hooks (class component):
const scheme = Appearance.getColorScheme() ?? 'light';
const palette = Colors[scheme];

// Line 88 — already gates stack traces behind __DEV__:
{__DEV__ && this.state.error && (
  // ... error details, stack trace, component stack
)}
```

This is ALREADY CORRECT for hiding stack traces in production/beta. The `__DEV__`
check is false in all non-development builds (TestFlight, production, Expo Go release).

ADDITIVE CHANGES ONLY — improve the production error message:

FIND (~83-86):
```typescript
<Text style={[styles.message, { color: palette.muted }]}>
  The app encountered an unexpected error. This has been logged for debugging.
</Text>
```

REPLACE with environment-aware message:
```typescript
<Text style={[styles.message, { color: palette.muted }]}>
  {__DEV__
    ? 'The app encountered an unexpected error. See details below.'
    : "We're sorry for the inconvenience. Please try again."}
</Text>
```

OPTIONALLY add a "Go Home" button alongside "Try Again":
```typescript
// Note: Cannot use router hook in class component. Use Linking or pass via props.
// If adding navigation, use a HOC wrapper or pass a callback prop:

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onGoHome?: () => void;  // NEW — optional callback for "Go Home" action
}

// In render, after the Try Again Clickable:
{this.props.onGoHome && (
  <Clickable
    style={({ pressed }) => [
      styles.secondaryButton,
      { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
    ]}
    onPress={this.props.onGoHome}
    accessibilityRole="button"
    accessibilityLabel="Go to home screen"
  >
    <Text style={[styles.buttonText, { color: palette.foreground }]}>Go Home</Text>
  </Clickable>
)}
```

DO NOT:
- Import `useTheme()` or `useRouter()` or any hooks — class component
- Import `Config` from `@/constants/config` — it imports `expo-constants` which is
  unnecessary when `__DEV__` already works
- Replace `Appearance.getColorScheme()` with `useTheme()` — hooks forbidden in class
- Use `ThemedText` — it likely uses hooks internally, use raw `Text` with palette colors
- Use `Collapsible` — it likely uses hooks, the existing `ScrollView` approach is correct
- Use `Row`/`Column` — they may use hooks, raw `View` is safer in class components

ACCEPTANCE:
✅ Production: User-friendly message, no stack trace (already works via `__DEV__`)
✅ Development: Full stack trace visible (already works)
✅ No hooks used in class component
✅ Optional "Go Home" via callback prop, not router hook
✅ Existing logger usage preserved (already uses `logger` from `@/utils/logger`)
```

---

## Item 211: useSessionCompletion 1130 lines monolith

**Problem**: `hooks/use-session-completion.ts` is 1130 lines. Impossible to maintain or test.

**Note**: This is a refactoring item. Split into smaller hooks.

```
Split useSessionCompletion into composable hooks.

STEP 1: Analyze current structure (lines ~1-1130):
- Feedback form state (~100 lines)
- Badge awarding (~200 lines)
- Media upload (~150 lines)
- Session notes (~80 lines)
- Attendance tracking (~120 lines)
- Payment calculation (~90 lines)
- Draft persistence (~140 lines)
- Completion submission (~250 lines)

STEP 2: Create new hook files:

FILE: `hooks/session-completion/use-completion-form.ts` (NEW)
```typescript
// Manages form state (feedback, ratings, notes)
export function useCompletionForm(sessionId: string) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  return { feedback, setFeedback, rating, setRating, notes, setNotes };
}
```

FILE: `hooks/session-completion/use-badge-awards.ts` (NEW)
```typescript
// Manages badge selection and awarding
export function useBadgeAwards(sessionId: string, athleteIds: string[]) {
  const [selectedBadges, setSelectedBadges] = useState<Record<string, string[]>>({});

  const awardBadge = useCallback(async (athleteId: string, badgeId: string) => {
    // ... awarding logic
  }, [sessionId]);

  return { selectedBadges, awardBadge };
}
```

FILE: `hooks/session-completion/use-media-upload.ts` (NEW)
```typescript
// Manages media upload and preview
export function useMediaUpload(sessionId: string) {
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMedia = useCallback(async (uri: string, type: 'photo' | 'video') => {
    // ... upload logic
  }, [sessionId]);

  return { uploads, isUploading, uploadMedia };
}
```

FILE: `hooks/session-completion/use-attendance.ts` (NEW)
```typescript
// Manages attendance tracking
export function useAttendance(sessionId: string, athleteIds: string[]) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  const markAttendance = useCallback((athleteId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [athleteId]: status }));
  }, []);

  return { attendance, markAttendance };
}
```

FILE: `hooks/session-completion/use-completion-draft.ts` (NEW)
```typescript
// Manages draft persistence
export function useCompletionDraft(sessionId: string) {
  const draftKey = `completion_draft_${sessionId}`;

  const saveDraft = useCallback(async (data: CompletionData) => {
    await apiClient.set(draftKey, { ...data, timestamp: Date.now() });
  }, [draftKey]);

  const loadDraft = useCallback(async (): Promise<CompletionData | null> => {
    return await apiClient.get(draftKey, null);
  }, [draftKey]);

  const clearDraft = useCallback(async () => {
    await apiClient.remove(draftKey);
  }, [draftKey]);

  return { saveDraft, loadDraft, clearDraft };
}
```

FILE: `hooks/session-completion/use-completion-submit.ts` (NEW)
```typescript
// Manages final submission — no try/catch, services return Result
export function useCompletionSubmit(sessionId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (data: CompletionData) => {
    setIsSubmitting(true);
    const result = await sessionService.completeSession(sessionId, data);
    setIsSubmitting(false);
    return result;
  }, [sessionId]);

  return { isSubmitting, submit };
}
```

FILE: `hooks/session-completion/index.ts` (NEW — facade)
```typescript
export { useCompletionForm } from './use-completion-form';
export { useBadgeAwards } from './use-badge-awards';
export { useMediaUpload } from './use-media-upload';
export { useAttendance } from './use-attendance';
export { useCompletionDraft } from './use-completion-draft';
export { useCompletionSubmit } from './use-completion-submit';
```

FILE: `hooks/use-session-completion.ts` (REFACTORED)
```typescript
// Main hook that composes all sub-hooks
import { useCompletionForm } from './session-completion/use-completion-form';
import { useBadgeAwards } from './session-completion/use-badge-awards';
import { useMediaUpload } from './session-completion/use-media-upload';
import { useAttendance } from './session-completion/use-attendance';
import { useCompletionDraft } from './session-completion/use-completion-draft';
import { useCompletionSubmit } from './session-completion/use-completion-submit';

export function useSessionCompletion(sessionId: string) {
  const form = useCompletionForm(sessionId);
  const badges = useBadgeAwards(sessionId, athleteIds);
  const media = useMediaUpload(sessionId);
  const attendance = useAttendance(sessionId, athleteIds);
  const draft = useCompletionDraft(sessionId);
  const submit = useCompletionSubmit(sessionId);

  // Auto-save draft — use PRIMITIVE values in deps, not object refs
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      await draft.saveDraft({
        feedback: form.feedback,
        rating: form.rating,
        notes: form.notes,
        selectedBadges: badges.selectedBadges,
        attendance: attendance.attendance,
        uploads: media.uploads,
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [
    form.feedback,
    form.rating,
    form.notes,
    badges.selectedBadges,
    attendance.attendance,
    media.uploads,
    draft.saveDraft,
  ]);

  // Load draft on mount
  useEffect(() => {
    const load = async () => {
      const saved = await draft.loadDraft();
      if (saved) {
        // Hydrate form state from saved draft
        if (saved.feedback) form.setFeedback(saved.feedback);
        if (saved.rating) form.setRating(saved.rating);
        if (saved.notes) form.setNotes(saved.notes);
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  const handleSubmit = useCallback(async () => {
    const result = await submit.submit({
      feedback: form.feedback,
      rating: form.rating,
      notes: form.notes,
      selectedBadges: badges.selectedBadges,
      attendance: attendance.attendance,
      uploads: media.uploads,
    });

    if (result.success) {
      await draft.clearDraft();
    }

    return result;
  }, [
    submit,
    form.feedback,
    form.rating,
    form.notes,
    badges.selectedBadges,
    attendance.attendance,
    media.uploads,
    draft,
  ]);

  return {
    form,
    badges,
    media,
    attendance,
    isSubmitting: submit.isSubmitting,
    handleSubmit,
  };
}
```

STEP 3: Update component usage:
```typescript
// Before:
const {
  feedback,
  setFeedback,
  rating,
  setRating,
  selectedBadges,
  awardBadge,
  uploads,
  uploadMedia,
  attendance,
  markAttendance,
  isSubmitting,
  handleSubmit,
} = useSessionCompletion(sessionId);

// After:
const {
  form,
  badges,
  media,
  attendance,
  isSubmitting,
  handleSubmit,
} = useSessionCompletion(sessionId);

// Usage:
form.feedback
form.setFeedback()
badges.selectedBadges
badges.awardBadge()
media.uploads
media.uploadMedia()
attendance.attendance
attendance.markAttendance()
```

STEP 4: Add tests for each sub-hook, register in `tsconfig.test.json`:
```typescript
// __tests__/hooks/session-completion/use-completion-form.test.ts
// __tests__/hooks/session-completion/use-badge-awards.test.ts
// etc.
```

NOTE:
- `result.success` not `result.isOk` — matches `types/result.ts`
- useEffect deps use primitive values (`form.feedback`, `form.rating`) not object refs (`form`)
  to prevent infinite re-render loops
- All async handlers wrapped in `useCallback`
- Sub-hooks use `useCallback` on returned functions
- No try/catch around Result-returning services
- New hook directory needs `index.ts` facade per architecture rules

ACCEPTANCE:
✅ useSessionCompletion.ts < 200 lines
✅ 6 new focused hooks created with index.ts facade
✅ Each hook has single responsibility
✅ Main hook composes sub-hooks
✅ Auto-save draft uses primitive deps (not object refs)
✅ `result.success` checked (not `result.isOk`)
✅ All handlers wrapped in useCallback
✅ Component usage minimally changed
✅ Each sub-hook has unit tests
```

---

## Item 361: Error boundary stack traces in beta

**Problem**: `components/error-boundary.tsx` ~88-128 shows stack traces in TestFlight/beta builds. Should hide.

**Note**: Partially covered by Item 202. This adds beta detection.

**Files**:
- `constants/config.ts`

```
Add beta build detection to hide stack traces.

VERIFY FIRST: The actual `error-boundary.tsx` already uses `__DEV__` at line 88 to gate
the stack trace section. `__DEV__` is `false` in ALL non-dev builds — including TestFlight,
Expo Go release builds, and production. This means stack traces are ALREADY hidden in beta.

If additional granularity is needed beyond `__DEV__`, add to config.ts:

FILE: `constants/config.ts`

ADD near existing exports (~52-55):
```typescript
// Already exported: isDevelopment, isStaging, isProduction, isDebug

// Add fine-grained error display control:
export const showErrorDetails = __DEV__;
```

This is a simple re-export of `__DEV__` with a semantic name. It does NOT need
`expo-constants` since `__DEV__` is a global provided by the bundler.

FILE: `components/error-boundary.tsx`

The existing code at line 88:
```typescript
{__DEV__ && this.state.error && (
```

Can optionally be updated to:
```typescript
import { showErrorDetails } from '@/constants/config';

{showErrorDetails && this.state.error && (
```

However, this is cosmetic — `showErrorDetails === __DEV__`. The real value is if
`showErrorDetails` later needs to account for debug flags or admin overrides.

IMPORTANT: Do NOT introduce a `Config` object — the actual config.ts exports bare
named values (`isDevelopment`, `isProduction`, `isDebug`, etc.) and a `config` object
(lowercase). There is no `Config` (uppercase) export.

ACCEPTANCE:
✅ `showErrorDetails` = `__DEV__` (true only in dev builds)
✅ Beta builds (Expo Go release, TestFlight) hide stack traces (already worked)
✅ Production builds hide stack traces (already worked)
✅ Dev builds show full error details
✅ No unnecessary `expo-constants` import for this feature
```

---

## Item 362: ErrorState no error code

**Problem**: `components/ui/screen-states.tsx` ~62-83 ErrorState doesn't show error code. Hard to debug specific failures.

**Files**:
- `components/ui/screen-states.tsx`

```
Add optional error code display to ErrorState.

FILE: `components/ui/screen-states.tsx`

FIND ErrorState (~38-83):
```typescript
export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ message, onRetry, title }: ErrorStateProps) {
  const { colors } = useTheme();
  const ButtonStyles = createButtonStyles(colors);

  return (
    <View style={errorStyles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <ThemedText style={[errorStyles.title, { color: colors.text }]}>
        {title ?? 'Something went wrong'}
      </ThemedText>
      <ThemedText style={[errorStyles.message, { color: colors.muted }]}>{message}</ThemedText>
      <Clickable
        onPress={onRetry}
        style={[ButtonStyles.primary, { marginTop: Spacing.xs }]}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <ThemedText style={ButtonStyles.primaryText}>Try again</ThemedText>
      </Clickable>
    </View>
  );
}
```

REPLACE with error code support:
```typescript
import type { ServiceError } from '@/types/result';

export interface ErrorStateProps {
  message: string;
  error?: ServiceError; // NEW: optional full error object
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ message, error, onRetry, title }: ErrorStateProps) {
  const { colors } = useTheme();
  const ButtonStyles = createButtonStyles(colors);

  return (
    <View style={errorStyles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <ThemedText style={[errorStyles.title, { color: colors.text }]}>
        {title ?? 'Something went wrong'}
      </ThemedText>
      <ThemedText style={[errorStyles.message, { color: colors.muted }]}>{message}</ThemedText>

      {/* Show error code in dev or if code is user-actionable */}
      {error?.code && (__DEV__ || isUserFacingCode(error.code)) && (
        <ThemedText style={[errorStyles.code, { color: colors.muted }]}>
          Error: {error.code}
        </ThemedText>
      )}

      <Clickable
        onPress={onRetry}
        style={[ButtonStyles.primary, { marginTop: Spacing.xs }]}
        accessibilityLabel="Try again"
        accessibilityRole="button"
      >
        <ThemedText style={ButtonStyles.primaryText}>Try again</ThemedText>
      </Clickable>

      {__DEV__ && error?.details && (
        <View style={{ marginTop: Spacing.md, width: '90%' }}>
          <ThemedText style={[errorStyles.title, { color: colors.muted }]}>
            Debug Info (Dev Only)
          </ThemedText>
          <ThemedText style={[errorStyles.message, { color: colors.muted, fontFamily: 'monospace' }]}>
            {typeof error.details === 'string'
              ? error.details
              : JSON.stringify(error.details, null, 2)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function isUserFacingCode(code: string): boolean {
  // Codes that are useful for users to report or act on
  const userFacingCodes: string[] = [
    'NETWORK',
    'UNAUTHORIZED',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
  ];
  return userFacingCodes.includes(code);
}
```

ADD to errorStyles StyleSheet:
```typescript
const errorStyles = StyleSheet.create({
  // ... existing styles ...
  code: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
```

UPDATE usage in screens:
```typescript
// Before:
if (status === 'error') {
  return <ErrorState message={error} onRetry={retry} />;
}

// After:
if (status === 'error') {
  return (
    <ErrorState
      message={error?.message || 'Something went wrong'}
      error={error}
      onRetry={retry}
    />
  );
}
```

NOTE:
- Uses `error.details` NOT `error.originalError` — `ServiceError` has `details?: unknown`
- Uses valid `ServiceErrorCode` values: `'NETWORK'`, `'UNAUTHORIZED'`, `'NOT_FOUND'`,
  `'CONFLICT'`, `'RATE_LIMITED'` — NOT `'NETWORK_ERROR'`, `'PERMISSION_DENIED'`,
  `'VERSION_CONFLICT'`, `'QUOTA_EXCEEDED'`
- Uses `__DEV__` directly — no `Config.showErrorDetails` needed
- Uses `colors.muted` for secondary text (valid theme token)
- Backward compatible — `error` prop is optional

ACCEPTANCE:
✅ ErrorState accepts optional `error` prop of type `ServiceError`
✅ User-facing error codes shown in prod (NETWORK, NOT_FOUND, etc.)
✅ All error codes shown in dev
✅ Debug info (`error.details`) shown in dev only
✅ Backward compatible (error prop optional)
✅ Uses correct ServiceErrorCode values
```

---

## Item 363: Toast replaces previous immediately

**Problem**: `components/ui/toast.tsx` ~51-68 shows new toast immediately, hiding previous. User misses important messages.

**Files**:
- `components/ui/toast.tsx`

```
Queue toasts instead of replacing immediately.

VERIFY FIRST: The actual toast.tsx uses a Context + Provider pattern:
- `ToastProvider` wraps the app
- `useToast()` hook returns `{ showToast, showUndoToast, hideToast }`
- `showToast(message, options)` where options can be string tone or ToastOptions object
- Already has `timeoutRef` for cleanup
- Already has `action` support with undo
- Uses Reanimated for enter/exit animations

The fix must preserve this existing API. Do NOT replace with an incompatible export pattern.

FILE: `components/ui/toast.tsx`

FIND toast state in ToastProvider (~36-65):
```typescript
const [toast, setToast] = useState<{
  message: string;
  tone: 'default' | 'success' | 'error' | 'warning';
  action?: { label: string; onPress: () => void };
} | null>(null);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

REPLACE with queue:
```typescript
interface QueuedToast {
  id: string;
  message: string;
  tone: 'default' | 'success' | 'error' | 'warning';
  action?: { label: string; onPress: () => void };
  duration: number;
}

const [queue, setQueue] = useState<QueuedToast[]>([]);
const [current, setCurrent] = useState<QueuedToast | null>(null);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const idCounter = useRef(0);
```

ADD queue processing effect:
```typescript
// Process queue — show next toast when current dismisses
useEffect(() => {
  if (current || queue.length === 0) return;

  const [next, ...rest] = queue;
  setCurrent(next);
  setQueue(rest);

  timeoutRef.current = setTimeout(() => {
    setCurrent(null);
  }, next.duration);

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
}, [current, queue]);
```

UPDATE showToast to enqueue:
```typescript
const showToast = useCallback(
  (message: string, options?: ToastOptions | 'default' | 'success' | 'error' | 'warning') => {
    const resolvedOptions: ToastOptions =
      typeof options === 'string' ? { tone: options } : options || {};

    const { tone = 'default', action, duration } = resolvedOptions;

    // Error toasts get longer duration by default
    const effectiveDuration = duration ?? (tone === 'error' ? 5000 : 2500);

    idCounter.current += 1;
    const newToast: QueuedToast = {
      id: String(idCounter.current),
      message,
      tone,
      action,
      duration: effectiveDuration,
    };

    setQueue(prev => [...prev, newToast]);
  },
  [],
);
```

UPDATE hideToast to clear current and advance queue:
```typescript
const hideToast = useCallback(() => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  setCurrent(null); // Will trigger queue processing via useEffect
}, []);
```

UPDATE showUndoToast — no changes needed, it delegates to showToast.

UPDATE Toast component render — pass `current` instead of `toast`:
```typescript
<Toast
  message={current?.message}
  tone={current?.tone}
  action={current?.action}
  onActionPress={() => {
    current?.action?.onPress();
    hideToast(); // Dismiss and advance queue
  }}
/>
```

NOTE:
- Preserves existing `ToastProvider` / `useToast()` / `showToast()` / `showUndoToast()` API
- No breaking changes to consumer code
- Uses simple incrementing counter for IDs (no need for `generateId()` for ephemeral toasts)
- `useCallback` on all exposed functions (already the case for existing code)
- Queue max length is implicitly unbounded — in practice toasts are rare enough
- Does NOT use `colors.white` or `colors.primary` — uses existing palette tokens
- Does NOT replace Reanimated animations — keeps existing `FadeInDown`/`FadeOutUp`

ACCEPTANCE:
✅ Toasts queued, not replaced
✅ Each toast shows for full duration
✅ Queue processes sequentially
✅ Error toasts get 5s, others 2.5s by default
✅ Existing API fully preserved (showToast, showUndoToast, hideToast)
✅ Action/undo support preserved
✅ Reanimated animations preserved
✅ Cleanup on unmount via timeoutRef
```

---

## Item 364: ~31 Image components no onError fallback

**Problem**: Images throughout app have no onError handler. Broken images show as blank rectangles.

**Note**: This is an audit item. Add onError to all Image/expo-image usage.

```
Add onError fallback to all images.

STEP 1: Audit Image usage
```bash
rg "from 'expo-image'" --type tsx
rg "<Image " --type tsx | grep -v "onError"
```

STEP 2: Create reusable SafeImage component:

FILE: `components/primitives/safe-image.tsx` (NEW — kebab-case per convention)
```typescript
import { useState, useCallback } from 'react';
import { Image as ExpoImage, ImageProps, ImageErrorEventData } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

const logger = createLogger('SafeImage');

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  source: ImageProps['source'];
  fallbackSource?: ImageProps['source'];
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconSize?: number;
}

export function SafeImage({
  source,
  fallbackSource,
  fallbackIcon = 'person-circle-outline',
  fallbackIconSize = 32,
  style,
  ...props
}: SafeImageProps) {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((event: ImageErrorEventData) => {
    logger.warn('Image failed to load', {
      source: typeof source === 'object' && source !== null && 'uri' in source
        ? (source as { uri: string }).uri
        : 'non-uri source',
      error: String(event.error),
    });
    setHasError(true);
  }, [source]);

  // If error and no fallback source, show icon placeholder
  if (hasError && !fallbackSource) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Ionicons
          name={fallbackIcon}
          size={fallbackIconSize}
          color={colors.muted}
        />
      </View>
    );
  }

  return (
    <ExpoImage
      source={hasError ? fallbackSource : source}
      onError={handleError}
      style={style}
      {...props}
    />
  );
}
```

STEP 3: Replace Image usage patterns:

PATTERN 1: Simple image
```typescript
// Before:
import { Image } from 'expo-image';
<Image source={{ uri: coach.photoUrl }} style={styles.image} />

// After:
import { SafeImage } from '@/components/primitives/safe-image';
<SafeImage
  source={{ uri: coach.photoUrl }}
  fallbackIcon="person-circle-outline"
  style={styles.image}
/>
```

PATTERN 2: Avatar (update Avatar component internally)
```typescript
// In components/ui/primitives/Avatar.tsx — update to handle errors:
import { SafeImage } from '@/components/primitives/safe-image';

export function Avatar({ source, size, ...props }: AvatarProps) {
  return (
    <SafeImage
      source={source}
      fallbackIcon="person-circle-outline"
      fallbackIconSize={size * 0.5}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      {...props}
    />
  );
}
```

PATTERN 3: Cover images
```typescript
// Before:
<Image source={{ uri: club.coverUrl }} style={styles.cover} />

// After:
<SafeImage
  source={{ uri: club.coverUrl }}
  fallbackIcon="image-outline"
  fallbackIconSize={48}
  style={styles.cover}
  contentFit="cover"
/>
```

STEP 4: Update high-priority files:
- components/coach/coach-card-header.tsx
- components/coach/coach-detail-hero.tsx
- components/family/FamilyMemberCard.tsx
- components/club/ClubHeader.tsx
- components/group/participant-card.tsx
- components/squad/squad-members-card.tsx
- components/progress/player-card.tsx

NOTE:
- Logger import is `@/utils/logger` NOT `@/services/logger`
- `handleError` typed as `ImageErrorEventData` (expo-image callback type), NOT `any`
- No `ActivityIndicator` — use icon placeholder on error instead
- No `PlaceholderImages` constant — doesn't exist in the theme. Use `fallbackIcon` prop instead
- `useTheme()` for colors, not bare `colors` variable
- `useCallback` on error handler
- File name is `safe-image.tsx` (kebab-case per project convention), NOT `SafeImage.tsx`

ACCEPTANCE:
✅ SafeImage component created at `components/primitives/safe-image.tsx`
✅ Logger import from `@/utils/logger`
✅ Zero `any` types — error typed as `ImageErrorEventData`
✅ `useTheme()` for dynamic colors
✅ `useCallback` on error handler
✅ Icon placeholder fallback (no missing `PlaceholderImages` dependency)
✅ Image load errors logged with source info
✅ Broken images show icon placeholder, not blank rectangle
✅ Avatar component updated to use SafeImage internally
```

---

## Sprint 4 Summary

**Effort**: 4-5 days (1 dev)

**Priority**: P2 — These are polish items that improve debugging and prevent rare edge cases.

**Dependencies**:
- Item 135: Needs touched state pattern, `useCallback`, Result check via `result.success`
- Item 142: Needs ThemedText conversion, correct ErrorBoundary fallback signature
- Item 149: Needs button handler fix, `useCallback`
- Item 202: Class component — `__DEV__` already gates stack traces, minimal changes needed
- Item 211: Needs major refactoring (6 new hooks + facade), primitive useEffect deps
- Item 361: Needs `showErrorDetails` export (semantic alias for `__DEV__`)
- Item 362: Needs `ServiceError` prop, correct error codes, `error.details` not `originalError`
- Item 363: Needs queue implementation preserving existing ToastProvider/useToast API
- Item 364: Needs SafeImage component with `@/utils/logger`, zero `any`, `useTheme()`

**Testing**:
- Item 135: Open cancel reason picker -> error hidden until submit
- Item 142: View invoice preview -> no crash
- Item 149: Click "Delete Club" -> calls delete not leave
- Item 202: TestFlight build -> no stack traces shown (already works via `__DEV__`)
- Item 211: Session completion -> all features work, file is <200 lines
- Item 361: Dev build -> stack traces shown, beta build -> hidden
- Item 362: Error state in dev -> shows error code and details
- Item 363: Show 3 toasts rapidly -> all display sequentially
- Item 364: Load profile with broken image URL -> shows icon placeholder

**Success criteria**:
- Stack traces hidden in production/beta (already works, now documented)
- Error codes shown when useful for debugging
- Toast queue prevents message loss while preserving existing API
- All images have fallbacks via SafeImage
- useSessionCompletion split into 6 focused hooks with facade
- Validation errors only after user interaction
- Error states provide actionable information
- Zero `any` types in all new code
- All handlers wrapped in `useCallback`
- All Result checks use `result.success` / `result.data`
