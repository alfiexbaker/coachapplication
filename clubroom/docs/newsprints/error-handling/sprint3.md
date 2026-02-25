# Error Handling Sprint 3: Missing Feedback (User Confusion)

**Goal**: Add feedback for actions that currently give users no indication of success or failure.

**Items**: 9, 16, 26, 30, 33, 41, 43, 47, 49, 60, 86, 114, 115, 129, 132, 155, 157, 167, 201, 218, 277, 367

**Key patterns across all items**:
- Result API: `result.success` / `result.data` (NOT `.isOk` / `.value`)
- ServiceErrorCode: ONLY valid codes from `types/result.ts`
- err() shape: `{ code, message, details? }` — NOT `originalError`
- Logger: `import { createLogger } from '@/utils/logger'` — NOT `@/services/logger`
- No dead try/catch around Result-returning services
- All handlers wrapped in `useCallback`, skeleton components wrapped in `memo()`
- Dynamic colors from `useTheme()` — never in `StyleSheet.create`
- Toast: `const { showToast } = useToast()` — call `showToast(message, 'success'|'error')` (NOT `toast.success()`)
- Timeout cleanup via `useRef` on unmount

---

## Item 9: Badge cooldown no countdown

**Problem**: `components/badges/quick-recognition-modal.tsx` ~120 shows "Cannot award yet" but no time remaining. User doesn't know when they can award again.

**Files**:
- `components/badges/quick-recognition-modal.tsx`

```
Show countdown timer for badge cooldown.

FILE: `components/badges/quick-recognition-modal.tsx`

FIND cooldown check (~120):
```typescript
const canAward = !lastAwarded || Date.now() - lastAwarded > COOLDOWN_MS;

if (!canAward) {
  return <ThemedText>Cannot award yet</ThemedText>;
}
```

REPLACE with countdown:
```typescript
import { useState, useEffect, useCallback } from 'react';

const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

useEffect(() => {
  if (!lastAwarded) return;

  const updateTimer = () => {
    const elapsed = Date.now() - lastAwarded;
    const remaining = Math.max(0, COOLDOWN_MS - elapsed);
    setTimeRemaining(remaining > 0 ? remaining : null);
  };

  updateTimer();
  const interval = setInterval(updateTimer, 1000);

  return () => clearInterval(interval);
}, [lastAwarded]);

const canAward = timeRemaining === null;
```

NOTE: When `remaining` hits 0, set `timeRemaining` to `null` directly.
Do NOT set it to 0 first and then check `=== 0` in a separate branch —
that creates an unreachable intermediate state. Transition directly:
`remaining > 0 ? remaining : null`.

```typescript
// In render:
{timeRemaining !== null && (
  <SurfaceCard style={{ backgroundColor: colors.surfaceSecondary, marginBottom: Spacing.md }}>
    <Row gap={Spacing.xs} style={{ alignItems: 'center' }}>
      <Ionicons name="time-outline" size={20} color={colors.muted} />
      <Column style={{ flex: 1 }}>
        <ThemedText type="bodySmall" color={colors.muted}>
          Cooldown active
        </ThemedText>
        <ThemedText type="caption" color={colors.muted}>
          Can award again in {formatTimeRemaining(timeRemaining)}
        </ThemedText>
      </Column>
    </Row>
  </SurfaceCard>
)}
```

ADD helper function:
```typescript
function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
```

ACCEPTANCE:
✅ Cooldown shows time remaining (e.g., "3m 45s")
✅ Updates every second
✅ Transitions directly to null when expired (no intermediate === 0 state)
✅ Badge award button disabled during cooldown
✅ Interval cleared on unmount
```

---

## Item 16: Event Send Reminder no loading/confirm

**Problem**: `app/events/[id].tsx` sends reminder with no loading state or success feedback.

**Files**:
- `app/events/[id].tsx`

```
Add loading and success feedback to event reminder.

FILE: `app/events/[id].tsx`

FIND sendReminder function:
```typescript
const handleSendReminder = async () => {
  await eventService.sendReminder(eventId);
};
```

REPLACE with:
```typescript
const [isSendingReminder, setIsSendingReminder] = useState(false);

const handleSendReminder = useCallback(async () => {
  const rsvpCount = event.rsvps?.filter(r => r.status === 'going').length || 0;

  if (rsvpCount === 0) {
    Alert.alert('No RSVPs', 'No one has RSVP\'d yet. Send reminder anyway?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => sendReminder() },
    ]);
    return;
  }

  await sendReminder();
}, [event]);

const sendReminder = useCallback(async () => {
  setIsSendingReminder(true);

  const result = await eventService.sendReminder(eventId);

  if (!result.success) {
    showToast(result.error.message || 'Failed to send reminder', 'error');
    setIsSendingReminder(false);
    return;
  }

  const rsvpCount = event.rsvps?.filter(r => r.status === 'going').length || 0;
  showToast(`Reminder sent to ${rsvpCount} participant${rsvpCount !== 1 ? 's' : ''}`, 'success');
  setIsSendingReminder(false);
}, [eventId, event]);
```

UPDATE button:
```typescript
<Button
  variant="secondary"
  onPress={handleSendReminder}
  disabled={isSendingReminder}
  loading={isSendingReminder}
>
  {isSendingReminder ? 'Sending...' : 'Send Reminder'}
</Button>
```

ACCEPTANCE:
✅ Button shows loading spinner
✅ Success toast shows recipient count
✅ Warns if no RSVPs yet
✅ Error toast on failure
✅ No dead try/catch — service returns Result
✅ Handlers wrapped in useCallback
```

---

## Item 26: Video share no feedback

**Problem**: `app/videos/[id].tsx` shares video with no success/error indication.

**Files**:
- `app/videos/[id].tsx`

```
Add feedback to video share.

FILE: `app/videos/[id].tsx`

FIND handleShare:
```typescript
const handleShare = async () => {
  await Share.share({
    message: `Check out this training video: ${video.title}`,
    url: video.url,
  });
};
```

REPLACE with:
```typescript
const [isSharing, setIsSharing] = useState(false);

const handleShare = useCallback(async () => {
  setIsSharing(true);

  try {
    const result = await Share.share({
      message: `Check out this training video: ${video.title}`,
      url: video.url,
    });

    if (result.action === Share.sharedAction) {
      showToast('Video shared', 'success');
    }
    // Share.dismissedAction = user cancelled, no feedback needed
  } catch (error) {
    logger.error('Failed to share video', error);
    showToast('Failed to share video', 'error');
  } finally {
    setIsSharing(false);
  }
}, [video]);
```

NOTE: Share.share() is a React Native API, not a service — it throws on failure.
try/catch IS correct here (unlike our services which return Result).

UPDATE share button:
```typescript
<Button
  variant="secondary"
  onPress={handleShare}
  disabled={isSharing}
  loading={isSharing}
>
  <Ionicons name="share-outline" size={20} color={colors.foreground} />
  Share
</Button>
```

ACCEPTANCE:
✅ Success toast on share complete
✅ No feedback if user cancels
✅ Error toast on failure
✅ Button shows loading state
✅ Handler wrapped in useCallback
```

---

## Item 30: Review success no explanation

**Problem**: `components/review/review-screen-sections.tsx` shows "Review submitted" but doesn't explain what happens next.

**Files**:
- `components/review/review-screen-sections.tsx`

```
Add explanatory success message to review submission.

FILE: `components/review/review-screen-sections.tsx`

FIND handleSubmit success:
```typescript
const handleSubmit = async () => {
  // ... submission logic

  if (result.success) {
    showToast('Review submitted', 'success');
    router.back();
  }
};
```

REPLACE with detailed feedback:
```typescript
const handleSubmit = useCallback(async () => {
  // ... submission logic

  if (result.success) {
    Alert.alert(
      'Review Submitted',
      `Your ${rating}-star review for ${coachName} has been submitted.\n\n• It will appear on their profile within 24 hours\n• You can edit or delete it from your bookings list\n• The coach has been notified`,
      [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]
    );
  }
}, [rating, coachName]);
```

ACCEPTANCE:
✅ Alert explains review visibility timeline (24h)
✅ Mentions ability to edit/delete
✅ Confirms coach notification
✅ "Done" button returns to previous screen
✅ Handler wrapped in useCallback
```

---

## Item 33: Package deactivate no consequences explanation

**Problem**: `app/packages/manage.tsx` deactivates package but doesn't explain impact on existing bookings.

**Files**:
- `app/packages/manage.tsx`

```
Explain consequences before package deactivation.

FILE: `app/packages/manage.tsx`

FIND handleDeactivate:
```typescript
const handleDeactivate = async (packageId: string) => {
  await packageService.deactivatePackage(packageId);
  refetch();
};
```

REPLACE with:
```typescript
const [isDeactivating, setIsDeactivating] = useState<string | null>(null);

const handleDeactivate = useCallback(async (packageId: string) => {
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) return;

  const activeBookingsResult = await packageService.getActiveBookings(packageId);
  const activeCount = activeBookingsResult.success ? activeBookingsResult.data.length : 0;

  Alert.alert(
    'Deactivate Package',
    `Deactivate "${pkg.name}"?\n\n` +
    (activeCount > 0
      ? `• ${activeCount} active booking${activeCount !== 1 ? 's' : ''} will continue until expiry\n• No new bookings can use this package\n• Package will be hidden from new clients`
      : `• Package will be hidden from new clients\n• No active bookings will be affected\n• You can reactivate it later`),
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          setIsDeactivating(packageId);

          const result = await packageService.deactivatePackage(packageId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to deactivate package', 'error');
            setIsDeactivating(null);
            return;
          }

          showToast(
            activeCount > 0
              ? `Package deactivated. ${activeCount} active booking${activeCount !== 1 ? 's' : ''} unaffected.`
              : 'Package deactivated',
            'success'
          );

          setIsDeactivating(null);
          refetch();
        },
      },
    ]
  );
}, [packages, refetch]);
```

ACCEPTANCE:
✅ Alert shows active booking count
✅ Explains existing bookings continue
✅ Explains new bookings blocked
✅ Mentions reactivation possible
✅ Success toast includes active booking count
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 41: Scheduling rules save no confirmation

**Problem**: `components/coach/scheduling-rules-modal.tsx` ~138-189 saves rules silently. User doesn't know if changes applied.

**Files**:
- `components/coach/scheduling-rules-modal.tsx`

```
Add success feedback to scheduling rules save.

FILE: `components/coach/scheduling-rules-modal.tsx`

FIND handleSave (~138-189):
```typescript
const handleSave = async () => {
  await schedulingRulesService.saveRules(rules);
  onClose();
};
```

REPLACE with:
```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSave = useCallback(async () => {
  setIsSaving(true);

  const result = await schedulingRulesService.saveRules(rules);

  if (!result.success) {
    showToast(result.error.message || 'Failed to save rules', 'error');
    setIsSaving(false);
    return;
  }

  const changesCount = countChanges(initialRules, rules);

  showToast(
    changesCount > 0
      ? `${changesCount} rule${changesCount !== 1 ? 's' : ''} updated`
      : 'No changes made',
    'success'
  );

  setIsSaving(false);
  onClose();
}, [rules, initialRules, onClose]);

function countChanges(before: SchedulingRules, after: SchedulingRules): number {
  let changes = 0;

  if (before.minNotice !== after.minNotice) changes++;
  if (before.maxAdvance !== after.maxAdvance) changes++;
  if (before.allowSameDayBooking !== after.allowSameDayBooking) changes++;
  if (before.requireApproval !== after.requireApproval) changes++;

  return changes;
}
```

UPDATE save button:
```typescript
<Button
  variant="primary"
  onPress={handleSave}
  disabled={isSaving}
  loading={isSaving}
>
  {isSaving ? 'Saving...' : 'Save Rules'}
</Button>
```

ACCEPTANCE:
✅ Loading state during save
✅ Success toast shows count of changes
✅ "No changes made" if nothing changed
✅ Error toast on failure
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 43: Trial session toggle goes live immediately

**Problem**: `components/coach/trial-session-editor.tsx` ~160-177 toggles trial session visibility with no confirmation or explanation.

**Files**:
- `components/coach/trial-session-editor.tsx`

```
Add confirmation and explanation to trial session toggle.

FILE: `components/coach/trial-session-editor.tsx`

FIND handleToggleActive (~160-177):
```typescript
const handleToggleActive = async () => {
  await trialSessionService.setActive(!isActive);
  setIsActive(!isActive);
};
```

REPLACE with:
```typescript
const [isToggling, setIsToggling] = useState(false);

const handleToggleActive = useCallback(() => {
  if (isActive) {
    Alert.alert(
      'Hide Trial Session',
      'Your trial session will be hidden from:\n\n• Discovery search\n• Your public profile\n• New client booking flows\n\nExisting trial bookings will continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hide', onPress: () => toggleActive(false) },
      ]
    );
  } else {
    if (!trialSession.price || !trialSession.duration) {
      showToast('Complete trial session details before activating', 'error');
      return;
    }

    Alert.alert(
      'Publish Trial Session',
      'Your trial session will be visible to:\n\n• New clients in discovery\n• On your public profile\n• In booking flows\n\nMake sure pricing and details are correct.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => toggleActive(true) },
      ]
    );
  }
}, [isActive, trialSession]);

const toggleActive = useCallback(async (active: boolean) => {
  setIsToggling(true);

  const result = await trialSessionService.setActive(active);

  if (!result.success) {
    showToast(result.error.message || 'Failed to update trial session', 'error');
    setIsToggling(false);
    return;
  }

  setIsActive(active);
  showToast(active ? 'Trial session published' : 'Trial session hidden', 'success');
  setIsToggling(false);
}, []);
```

UPDATE toggle switch:
```typescript
<Switch
  value={isActive}
  onValueChange={handleToggleActive}
  disabled={isToggling}
/>
```

ACCEPTANCE:
✅ Activate → alert explains visibility + requires confirmation
✅ Deactivate → alert explains impact on existing bookings
✅ Validation before activation (price + duration required)
✅ Success toast on toggle
✅ Loading state during API call
✅ No dead try/catch — service returns Result
✅ Handlers wrapped in useCallback
```

---

## Item 47: Share profile slug no feedback

**Problem**: `components/coach/share-profile-sections.tsx` ~136-203 copies slug to clipboard silently.

**Files**:
- `components/coach/share-profile-sections.tsx`

```
Add feedback to profile slug copy.

FILE: `components/coach/share-profile-sections.tsx`

FIND handleCopySlug (~136-203):
```typescript
const handleCopySlug = async () => {
  await Clipboard.setStringAsync(`clubroom.app/@${slug}`);
};
```

REPLACE with:
```typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const handleCopySlug = useCallback(async () => {
  try {
    await Clipboard.setStringAsync(`clubroom.app/@${slug}`);

    // Haptic feedback (mobile only)
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    showToast('Profile link copied', 'success');
  } catch (error) {
    logger.error('Failed to copy slug', error);
    showToast('Failed to copy link', 'error');
  }
}, [slug]);
```

NOTE: Clipboard is a browser/native API, not a service — try/catch IS correct here.

ACCEPTANCE:
✅ Success toast on copy
✅ Haptic feedback on mobile
✅ Error toast on failure
✅ Full URL copied (clubroom.app/@slug)
✅ Handler wrapped in useCallback
```

---

## Item 49: Invite result failed hidden by default

**Problem**: `components/squad/invite-result-feedback-sections.tsx` ~20-61 shows successful invites but hides failures. User doesn't know who wasn't invited.

**Files**:
- `components/squad/invite-result-feedback-sections.tsx`

```
Show failed invites prominently with reasons.

FILE: `components/squad/invite-result-feedback-sections.tsx`

FIND render logic (~20-61):
```typescript
<Column gap={Spacing.sm}>
  {successfulInvites.map(invite => (
    <InviteResultCard key={invite.id} invite={invite} />
  ))}

  {failedInvites.length > 0 && (
    <Collapsible
      title={`${failedInvites.length} failed`}
      defaultExpanded={false}
    >
      {failedInvites.map(invite => (
        <InviteResultCard key={invite.id} invite={invite} />
      ))}
    </Collapsible>
  )}
</Column>
```

REPLACE with failures first:
```typescript
<Column gap={Spacing.md}>
  {/* Failed invites - show prominently */}
  {failedInvites.length > 0 && (
    <SurfaceCard style={{ backgroundColor: withAlpha(colors.error, 0.08) }}>
      <Row gap={Spacing.xs} style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
        <Ionicons name="alert-circle" size={20} color={colors.error} />
        <ThemedText type="subheading" color={colors.error}>
          {failedInvites.length} Invite{failedInvites.length !== 1 ? 's' : ''} Failed
        </ThemedText>
      </Row>

      <Column gap={Spacing.xs}>
        {failedInvites.map(invite => (
          <View
            key={invite.id}
            style={{
              paddingVertical: Spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <ThemedText type="body">{invite.recipientEmail}</ThemedText>
            <ThemedText type="caption" color={colors.error}>
              {invite.error || 'Unknown error'}
            </ThemedText>
          </View>
        ))}
      </Column>

      <Button
        variant="secondary"
        size="compact"
        onPress={() => onRetryFailed?.(failedInvites)}
        style={{ marginTop: Spacing.sm }}
      >
        Retry Failed Invites
      </Button>
    </SurfaceCard>
  )}

  {/* Successful invites */}
  {successfulInvites.length > 0 && (
    <SurfaceCard>
      <Row gap={Spacing.xs} style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <ThemedText type="subheading" color={colors.success}>
          {successfulInvites.length} Sent Successfully
        </ThemedText>
      </Row>

      <Collapsible
        title={`View ${successfulInvites.length} invite${successfulInvites.length !== 1 ? 's' : ''}`}
        defaultExpanded={false}
      >
        <Column gap={Spacing.xs}>
          {successfulInvites.map(invite => (
            <View key={invite.id} style={{ paddingVertical: Spacing.xs }}>
              <ThemedText type="body">{invite.recipientEmail}</ThemedText>
            </View>
          ))}
        </Column>
      </Collapsible>
    </SurfaceCard>
  )}
</Column>
```

ADD retry handler prop:
```typescript
interface InviteResultFeedbackProps {
  results: InviteResult[];
  onRetryFailed?: (failed: InviteResult[]) => void;
}
```

ACCEPTANCE:
✅ Failed invites shown first in error card
✅ Each failure shows email and error reason
✅ "Retry Failed Invites" button
✅ Successful invites collapsible below
✅ Clear visual distinction (error vs success colors)
```

---

## Item 60: Disability form save no feedback

**Problem**: `components/family/medical-special-needs-form-sections.tsx` ~134-159 saves form silently.

**Files**:
- `components/family/medical-special-needs-form-sections.tsx`

```
Add success feedback to disability form save.

FILE: `components/family/medical-special-needs-form-sections.tsx`

FIND handleSave (~134-159):
```typescript
const handleSave = async () => {
  await familyService.saveSpecialNeeds(childId, formData);
  onSaved?.();
};
```

REPLACE with:
```typescript
const [isSaving, setIsSaving] = useState(false);

const handleSave = useCallback(async () => {
  setIsSaving(true);

  const result = await familyService.saveSpecialNeeds(childId, formData);

  if (!result.success) {
    showToast(result.error.message || 'Failed to save information', 'error');
    setIsSaving(false);
    return;
  }

  showToast('Special needs information saved', 'success');

  // Emit event for coach notification if relevant changes
  if (formData.requiresSupport || formData.conditions.length > 0) {
    emitTyped(ServiceEvents.CHILD_SEN_UPDATED, {
      childId,
      parentId: currentUser.id,
      section: 'specialNeeds',
    });
  }

  setIsSaving(false);
  onSaved?.();
}, [childId, formData, onSaved]);
```

NOTE: Use `ServiceEvents.CHILD_SEN_UPDATED` — an actual event in event-bus.ts
with payload: `{ childId: string; parentId: string; section: 'disabilities' | 'specialNeeds' | 'communicationNotes' | 'behavioralNotes' }`.
Do NOT invent events like `SPECIAL_NEEDS_UPDATED`.

UPDATE save button:
```typescript
<Button
  variant="primary"
  onPress={handleSave}
  disabled={isSaving}
  loading={isSaving}
>
  {isSaving ? 'Saving...' : 'Save Information'}
</Button>
```

ACCEPTANCE:
✅ Loading state during save
✅ Success toast on save
✅ Error toast on failure
✅ CHILD_SEN_UPDATED event emitted (real event from event-bus.ts)
✅ Coaches can listen for event to update roster
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 86: Discover coaches no loading indicator

**Problem**: `components/parent/discover-screen.tsx` ~167-194 fetches coaches with no loading state. Shows empty list while loading.

**Files**:
- `components/parent/discover-screen.tsx`

```
Add loading skeleton to discover screen.

FILE: `components/parent/discover-screen.tsx`

FIND render logic (~167-194):
```typescript
return (
  <FlatList
    data={coaches}
    renderItem={({ item }) => <CoachCard coach={item} />}
    ListEmptyComponent={<EmptyState message="No coaches found" />}
  />
);
```

REPLACE with loading state:
```typescript
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchCoaches = async () => {
    setIsLoading(true);

    const result = await coachService.searchCoaches(filters);

    if (result.success) {
      setCoaches(result.data);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  };

  fetchCoaches();
}, [filters]);

// In render:
if (isLoading) {
  return (
    <Column gap={Spacing.md} style={{ padding: Spacing.md }}>
      <CoachCardSkeleton />
      <CoachCardSkeleton />
      <CoachCardSkeleton />
    </Column>
  );
}

if (error) {
  return <ErrorState message={error} onRetry={refetch} />;
}

return (
  <FlatList
    data={coaches}
    renderItem={renderCoachCard}
    ListEmptyComponent={<EmptyState title="No coaches found" message="Try adjusting your filters" icon="search" />}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    }
  />
);
```

NOTE: Wrap renderItem in useCallback for FlatList performance:
```typescript
const renderCoachCard = useCallback(({ item }: { item: Coach }) => (
  <CoachCard coach={item} />
), []);
```

CREATE `components/coach/CoachCardSkeleton.tsx`:
```typescript
import React, { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SurfaceCard, Row, Column } from '@/components/primitives';
import { Spacing } from '@/constants/theme';

export const CoachCardSkeleton = memo(function CoachCardSkeleton() {
  return (
    <SurfaceCard>
      <Row gap={Spacing.sm}>
        <Skeleton width={64} height={64} borderRadius={999} />
        <Column style={{ flex: 1 }} gap={Spacing.xs}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="80%" height={16} />
        </Column>
      </Row>
    </SurfaceCard>
  );
});
```

NOTE: Skeleton component wrapped in `memo()` since it's used inside FlatList.

ACCEPTANCE:
✅ Shows 3 skeleton cards while loading
✅ Smooth transition to actual content
✅ Pull-to-refresh supported
✅ Error state shows retry button
✅ Empty state only when no results (not while loading)
✅ CoachCardSkeleton wrapped in memo()
✅ renderItem wrapped in useCallback
```

---

## Item 114: Toasts barely used, most feedback is Alert.alert

**Problem**: Only ~3 screens use toast component. Rest use Alert.alert which blocks UI.

**Note**: This is a refactoring item. Convert high-frequency alerts to toasts.

```
Audit and convert non-critical alerts to toasts.

STEP 1: Audit Alert.alert usage
```bash
rg "Alert\.alert" --type tsx -A 2
```

STEP 2: Identify non-critical alerts (candidates for toast):
- Success confirmations (e.g., "Booking confirmed")
- Non-destructive notifications (e.g., "Message sent")
- Info messages (e.g., "Profile updated")

KEEP Alert.alert for:
- Destructive actions (delete, cancel)
- Multi-choice decisions
- Critical errors requiring user acknowledgment

STEP 3: Convert pattern:
BEFORE:
```typescript
Alert.alert('Success', 'Profile updated');
```

AFTER:
```typescript
showToast('Profile updated', 'success');
```

BEFORE:
```typescript
Alert.alert('Error', 'Failed to save changes');
```

AFTER:
```typescript
showToast('Failed to save changes', 'error');
```

STEP 4: Update common success patterns in priority files.

ACCEPTANCE:
✅ Success confirmations use toast, not Alert
✅ Non-blocking errors use showToast(message, 'error')
✅ Destructive actions still use Alert
✅ Toast imports added to converted files
```

---

## Item 115: Create post redirect no timeout

**Problem**: `app/(modal)/create-post.tsx` redirects immediately after submit. User doesn't see confirmation.

**Files**:
- `app/(modal)/create-post.tsx`

```
Add brief success feedback before redirect.

FILE: `app/(modal)/create-post.tsx`

FIND handleSubmit:
```typescript
const handleSubmit = async () => {
  await postService.createPost(postData);
  router.back();
};
```

REPLACE with delayed redirect:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleSubmit = useCallback(async () => {
  setIsSubmitting(true);

  const result = await postService.createPost(postData);

  if (!result.success) {
    showToast(result.error.message || 'Failed to create post', 'error');
    setIsSubmitting(false);
    return;
  }

  // Show success, then redirect
  showToast('Post published', 'success');

  // Brief delay so user sees toast
  redirectTimerRef.current = setTimeout(() => {
    router.back();
  }, 800);
}, [postData]);

// Cleanup timeout on unmount
useEffect(() => {
  return () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
  };
}, []);
```

NOTE: Store timeout in `useRef` and clear on unmount to prevent
calling `router.back()` after the component unmounts.

UPDATE submit button:
```typescript
<Button
  variant="primary"
  onPress={handleSubmit}
  disabled={isSubmitting || !postData.content}
  loading={isSubmitting}
>
  {isSubmitting ? 'Publishing...' : 'Publish Post'}
</Button>
```

ACCEPTANCE:
✅ Success toast shown for 800ms before redirect
✅ Loading state during submission
✅ Error toast if submission fails
✅ Button disabled while submitting
✅ Timeout stored in useRef, cleaned up on unmount
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 129: Optimistic review dismissal no rollback

**Problem**: `components/parent/discover-screen.tsx` ~127-132 dismisses invite optimistically but doesn't restore on error.

**Files**:
- `components/parent/discover-screen.tsx`

```
Add rollback on invite dismissal failure.

FILE: `components/parent/discover-screen.tsx`

FIND handleDismissInvite (~127-132):
```typescript
const handleDismissInvite = async (inviteId: string) => {
  // Optimistically remove
  setPendingInvites(prev => prev.filter(i => i.id !== inviteId));

  await inviteService.dismissInvite(inviteId);
};
```

REPLACE with rollback:
```typescript
const handleDismissInvite = useCallback(async (inviteId: string) => {
  const invite = pendingInvites.find(i => i.id === inviteId);
  if (!invite) return;

  // Save original index for correct rollback position
  const originalIndex = pendingInvites.findIndex(i => i.id === inviteId);

  // Optimistically remove
  setPendingInvites(prev => prev.filter(i => i.id !== inviteId));

  const result = await inviteService.dismissInvite(inviteId);

  if (!result.success) {
    // Rollback at correct position
    setPendingInvites(prev => {
      const restored = [...prev];
      const insertAt = Math.min(originalIndex, restored.length);
      restored.splice(insertAt, 0, invite);
      return restored;
    });
    showToast(result.error.message || 'Failed to dismiss invite', 'error');
    return;
  }

  showToast('Invite dismissed', 'success');
}, [pendingInvites]);
```

NOTE: Save `originalIndex` before removal and use `splice(insertAt, 0, invite)`
to restore at the correct position, not just appended to the end.

ACCEPTANCE:
✅ Invite removed immediately (optimistic)
✅ Invite restored at correct position if API fails
✅ Error toast on failure
✅ Success toast on success
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 132: Invoice download "An error occurred"

**Problem**: `components/invoices/download-button-sections.tsx` ~69-85 shows generic error message.

**Files**:
- `components/invoices/download-button-sections.tsx`

```
Show specific error messages for invoice download failures.

FILE: `components/invoices/download-button-sections.tsx`

FIND handleDownload (~69-85):
```typescript
const handleDownload = async () => {
  try {
    await invoiceService.downloadInvoice(invoiceId);
    showToast('Invoice downloaded', 'success');
  } catch (error) {
    Alert.alert('Error', 'An error occurred');
  }
};
```

REPLACE with specific errors:
```typescript
const [isDownloading, setIsDownloading] = useState(false);

const handleDownload = useCallback(async () => {
  setIsDownloading(true);

  const result = await invoiceService.downloadInvoice(invoiceId);

  if (!result.success) {
    const errorMessage = getDownloadErrorMessage(result.error);
    showToast(errorMessage, 'error');
    setIsDownloading(false);
    return;
  }

  showToast('Invoice downloaded', 'success');
  setIsDownloading(false);
}, [invoiceId]);

function getDownloadErrorMessage(error: ServiceError): string {
  switch (error.code) {
    case 'NOT_FOUND':
      return 'Invoice not found';
    case 'UNAUTHORIZED':
      return 'You don\'t have permission to download this invoice';
    case 'STORAGE':
      return 'Not enough storage space';
    case 'NETWORK':
      return 'Check your internet connection';
    default:
      return error.message || 'Failed to download invoice';
  }
}
```

NOTE: Use valid ServiceErrorCode values: `'UNAUTHORIZED'` (NOT `'PERMISSION_DENIED'`),
`'STORAGE'` (NOT `'STORAGE_ERROR'`), `'NETWORK'` (NOT `'NETWORK_ERROR'`).

UPDATE download button:
```typescript
<Button
  variant="secondary"
  size="compact"
  onPress={handleDownload}
  disabled={isDownloading}
  loading={isDownloading}
>
  {isDownloading ? 'Downloading...' : 'Download PDF'}
</Button>
```

ACCEPTANCE:
✅ Specific error messages by valid ServiceErrorCode
✅ Loading state during download
✅ Success toast on complete
✅ Error messages actionable (e.g., "Check internet")
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 155: Event athlete selector Select All no count

**Problem**: `components/event/event-athlete-selector.tsx` ~99-105 "Select All" doesn't show how many athletes will be selected.

**Files**:
- `components/event/event-athlete-selector.tsx`

```
Show count in Select All button.

FILE: `components/event/event-athlete-selector.tsx`

FIND Select All button (~99-105) and ADD count + Deselect All:
```typescript
const unselectedCount = athletes.filter(a => !selectedIds.includes(a.id)).length;

const handleDeselectAll = useCallback(() => {
  setSelectedIds([]);
}, []);

// In render:
<Row gap={Spacing.xs}>
  <Button
    variant="secondary"
    size="compact"
    onPress={handleSelectAll}
    disabled={unselectedCount === 0}
    style={{ flex: 1 }}
  >
    Select All ({unselectedCount})
  </Button>
  <Button
    variant="secondary"
    size="compact"
    onPress={handleDeselectAll}
    disabled={selectedIds.length === 0}
    style={{ flex: 1 }}
  >
    Deselect All ({selectedIds.length})
  </Button>
</Row>
```

ACCEPTANCE:
✅ Select All shows count of unselected
✅ Deselect All shows count of selected
✅ Both buttons disabled when count = 0
✅ Clear visual feedback of selection state
✅ Handlers wrapped in useCallback
```

---

## Item 157: Club photo upload no loading

**Problem**: `components/club/ClubHeader.tsx` ~64-86 uploads photo with no loading indicator. User doesn't know if it's processing.

**Files**:
- `components/club/ClubHeader.tsx`

```
Add loading indicator to club photo upload.

FILE: `components/club/ClubHeader.tsx`

FIND handlePhotoUpload (~64-86):
```typescript
const handlePhotoUpload = async (uri: string) => {
  await clubService.updatePhoto(clubId, uri);
  refetch();
};
```

REPLACE with:
```typescript
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

const handlePhotoUpload = useCallback(async (uri: string) => {
  setIsUploadingPhoto(true);

  const result = await clubService.updatePhoto(clubId, uri);

  if (!result.success) {
    showToast(result.error.message || 'Failed to upload photo', 'error');
    setIsUploadingPhoto(false);
    return;
  }

  showToast('Club photo updated', 'success');
  setIsUploadingPhoto(false);
  refetch();
}, [clubId, refetch]);
```

ADD loading overlay on avatar:
```typescript
<View>
  <Avatar
    source={{ uri: club.photoUrl || PlaceholderImages.club }}
    size={80}
  />

  {isUploadingPhoto && (
    <Center style={[StyleSheet.absoluteFill, {
      backgroundColor: withAlpha(colors.foreground, 0.7),
      borderRadius: Components.avatar.large / 2,
    }]}>
      <LoadingState variant="inline" />
      <ThemedText type="caption" color={colors.onPrimary} style={{ marginTop: Spacing.xxs }}>
        Uploading...
      </ThemedText>
    </Center>
  )}
</View>
```

NOTE: Use `Center` from primitives (NOT raw View+justifyContent+alignItems).
Use `LoadingState` (NOT raw ActivityIndicator).
Use `colors.foreground` (NOT `Colors.light.black`) for overlay.
Dynamic backgroundColor applied inline.

ACCEPTANCE:
✅ Loading overlay on avatar during upload
✅ "Uploading..." text shown
✅ Success toast on complete
✅ Error toast on failure
✅ Uses Center, LoadingState (not raw View/ActivityIndicator)
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 167: Join community group single tap

**Problem**: `components/community/community-tab-content.tsx` ~115 joins group immediately. Should confirm and explain access granted.

**Files**:
- `components/community/community-tab-content.tsx`

```
Add confirmation and explanation to group join.

FILE: `components/community/community-tab-content.tsx`

FIND handleJoinGroup (~115) and REPLACE with:
```typescript
const [isJoining, setIsJoining] = useState<string | null>(null);

const handleJoinGroup = useCallback(async (groupId: string) => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  Alert.alert(
    'Join Group',
    `Join "${group.name}"?\n\n` +
    (group.isPrivate
      ? 'Your request will be sent to group admins for approval.'
      : 'You will have immediate access to:\n• Group posts and discussions\n• Member list\n• Event notifications'),
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        onPress: async () => {
          setIsJoining(groupId);

          const result = await communityService.joinGroup(groupId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to join group', 'error');
            setIsJoining(null);
            return;
          }

          showToast(
            group.isPrivate
              ? 'Join request sent'
              : `You joined ${group.name}`,
            'success'
          );

          setIsJoining(null);
          refetch();
        },
      },
    ]
  );
}, [groups, refetch]);
```

UPDATE join button:
```typescript
<Button
  variant="primary"
  size="compact"
  onPress={() => handleJoinGroup(group.id)}
  disabled={isJoining === group.id}
  loading={isJoining === group.id}
>
  {group.isPrivate ? 'Request to Join' : 'Join'}
</Button>
```

ACCEPTANCE:
✅ Alert explains access granted (public) or approval needed (private)
✅ Different messages for public vs private groups
✅ Success toast adapts to group type
✅ Loading state per group
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 201: Referral share fails silently on web

**Problem**: `components/referrals/ShareButton.tsx` ~54-84 Share API fails on web, no fallback.

**Files**:
- `components/referrals/ShareButton.tsx`

```
Add web fallback and error handling to referral share.

FILE: `components/referrals/ShareButton.tsx`

REPLACE handleShare with platform detection:
```typescript
import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const handleShare = useCallback(async () => {
  if (Platform.OS === 'web') {
    await handleCopyLink();
    return;
  }

  try {
    const result = await Share.share({
      message: referralMessage,
      url: referralUrl,
    });

    if (result.action === Share.sharedAction) {
      showToast('Referral link shared', 'success');
    }
  } catch (error) {
    logger.error('Failed to share referral', error);

    Alert.alert(
      'Share Failed',
      'Would you like to copy the link instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy Link', onPress: handleCopyLink },
      ]
    );
  }
}, [referralMessage, referralUrl]);

const handleCopyLink = useCallback(async () => {
  try {
    await Clipboard.setStringAsync(referralUrl);
    showToast('Referral link copied', 'success');
  } catch (error) {
    logger.error('Failed to copy link', error);
    showToast('Failed to copy link', 'error');
  }
}, [referralUrl]);
```

NOTE: Share.share() is a React Native API — try/catch IS correct here.

UPDATE button to show platform-appropriate text:
```typescript
<Button variant="primary" onPress={handleShare}>
  {Platform.OS === 'web' ? 'Copy Referral Link' : 'Share Referral Link'}
</Button>
```

ACCEPTANCE:
✅ Web → copies link with toast
✅ Native → uses Share API
✅ Share failure → offers copy fallback
✅ Success toast on share/copy
✅ Handlers wrapped in useCallback
```

---

## Item 218: Login error clears instantly

**Problem**: `components/auth/login-screen.tsx` ~223-228 shows error for 1 frame then clears. User doesn't see what went wrong.

**Files**:
- `components/auth/login-screen.tsx`

**NOTE**: The actual `useAuth()` hook (from `hooks/use-auth.tsx`) provides:
- `login(username, password)` returns `boolean` (NOT a Result)
- `error: string | null` state
- `isLoading: boolean`

The hook already handles login and sets error state. The fix is in the UI component.

```
Persist login error until next attempt.

FILE: `components/auth/login-screen.tsx`

REPLACE error handling with persistent error:
```typescript
const { login, error: authError, isLoading } = useAuth();
const [localError, setLocalError] = useState<string | null>(null);

const error = authError || localError;

const handleLogin = useCallback(() => {
  setLocalError(null);

  if (!email.trim() || !password.trim()) {
    setLocalError('Please enter email and password');
    return;
  }

  const success = login(email.trim(), password.trim());

  if (success) {
    router.replace(Routes.HOME);
  }
  // Error is set by useAuth internally
}, [email, password, login]);

// Clear error when user edits fields
const handleEmailChange = useCallback((text: string) => {
  setEmail(text);
  if (error) setLocalError(null);
}, [error]);

const handlePasswordChange = useCallback((text: string) => {
  setPassword(text);
  if (error) setLocalError(null);
}, [error]);
```

UPDATE error display:
```typescript
{error && (
  <SurfaceCard
    style={{
      backgroundColor: withAlpha(colors.error, 0.08),
      marginVertical: Spacing.sm,
    }}
  >
    <Row gap={Spacing.xs} style={{ alignItems: 'center' }}>
      <Ionicons name="alert-circle" size={20} color={colors.error} />
      <ThemedText style={{ color: colors.error, flex: 1 }}>
        {error}
      </ThemedText>
    </Row>
  </SurfaceCard>
)}
```

ACCEPTANCE:
✅ Error shown until user edits email/password
✅ Error visible in error card with icon
✅ Error clears when user starts typing
✅ Loading state from useAuth().isLoading
✅ Handlers wrapped in useCallback
```

---

## Item 277: Coach observation accepts non-existent athlete

**Problem**: `services/coach-observation-service.ts` ~109-149 creates observation without validating athlete exists.

**Files**:
- `services/coach-observation-service.ts`

**NOTE**: Read the actual `services/coach-observation-service.ts` first.
The service imports: `apiClient`, `createLogger` from `@/utils/logger`,
`ok`, `err`, `notFound`, `storageError`, `validationError` from `@/types/result`,
and `emitTyped`, `ServiceEvents` from `./event-bus`.

It already uses the Result pattern. The fix is to add athlete validation
before creating the observation.

The service does NOT use dependency injection — it imports services directly.
Verify whether it has a reference to a roster or user service.

```
Validate athlete exists before creating observation.

FILE: `services/coach-observation-service.ts`

FIND createObservation and ADD validation:
```typescript
async createObservation(
  input: CreateObservationInput
): Promise<Result<CoachObservation, ServiceError>> {
  // Validate required fields
  if (!input.athleteId || !input.text.trim()) {
    return err(validationError('Athlete ID and observation text are required'));
  }

  // Validate athlete exists by checking users store
  const users = await apiClient.get<{ id: string; name: string }[]>(
    STORAGE_KEYS.USERS,
    []
  );
  const athlete = users.find(u => u.id === input.athleteId);

  if (!athlete) {
    return err(notFound('Athlete', input.athleteId));
  }

  const now = new Date().toISOString();
  const observation: CoachObservation = {
    id: generateId('obs'),
    athleteId: input.athleteId,
    coachId: input.coachId,
    coachName: input.coachName,
    category: input.category,
    text: input.text,
    isPrivate: input.isPrivate ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const allObservations = await apiClient.get<CoachObservation[]>(
    STORAGE_KEYS.OBSERVATIONS,
    []
  );

  allObservations.push(observation);

  try {
    await apiClient.set(STORAGE_KEYS.OBSERVATIONS, allObservations);
  } catch (error) {
    logger.error('Failed to save observation', error);
    return err(storageError('Failed to save observation'));
  }

  emitTyped(ServiceEvents.COACH_OBSERVATION_CREATED, {
    observationId: observation.id,
    athleteId: input.athleteId,
    coachId: input.coachId,
    category: input.category,
  });

  return ok(observation);
}
```

NOTE: Use `ServiceEvents.COACH_OBSERVATION_CREATED` — an actual event in event-bus.ts
with payload: `{ observationId: string; athleteId: string; coachId: string; category: string }`.
Use `notFound()` and `validationError()` helpers from `types/result.ts`.
Use `'UNAUTHORIZED'` (NOT `'PERMISSION_DENIED'`) — the latter is not a valid ServiceErrorCode.

ACCEPTANCE:
✅ Validates athlete exists before creating observation
✅ Returns NOT_FOUND if athlete missing (using notFound() helper)
✅ Validates required fields (using validationError() helper)
✅ Uses actual ServiceEvents.COACH_OBSERVATION_CREATED event
✅ Emits event with correct payload type
✅ Uses storageError() for save failures
```

---

## Item 367: Analytics blank when all metrics zero

**Problem**: `app/analytics/dashboard.tsx` ~198-210 shows empty chart when all values are zero. Should show "No data yet" message.

**Files**:
- `app/analytics/dashboard.tsx`

```
Show empty state when analytics metrics are all zero.

FILE: `app/analytics/dashboard.tsx`

REPLACE render logic with zero-data check:
```typescript
const hasData = useMemo(() => {
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.value, 0);
  const totalBookings = bookingData.reduce((sum, d) => sum + d.value, 0);
  const hasRetention = retentionData.some(d => d.value > 0);

  return totalRevenue > 0 || totalBookings > 0 || hasRetention;
}, [revenueData, bookingData, retentionData]);

if (status === 'loading') return <LoadingState />;
if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;

if (!hasData) {
  return (
    <EmptyState
      icon="bar-chart-outline"
      title="No Analytics Yet"
      message="Complete some sessions to see your performance metrics here."
      actionLabel="View Sessions"
      onPressAction={() => router.push(Routes.BOOKINGS)}
    />
  );
}

return (
  <ScrollView>
    <SurfaceCard style={{ marginHorizontal: Spacing.md, marginTop: Spacing.md }}>
      <ThemedText type="caption" color={colors.muted}>
        Showing data from {dateRange.label}
      </ThemedText>
    </SurfaceCard>

    {revenueData.some(d => d.value > 0) && <RevenueChart data={revenueData} />}
    {bookingData.some(d => d.value > 0) && <BookingChart data={bookingData} />}
    {retentionData.some(d => d.value > 0) && <RetentionChart data={retentionData} />}

    {/* Show message for empty charts */}
    {!revenueData.some(d => d.value > 0) && (
      <SurfaceCard style={{ marginHorizontal: Spacing.md }}>
        <ThemedText type="caption" color={colors.muted} style={{ textAlign: 'center' }}>
          No revenue data for this period
        </ThemedText>
      </SurfaceCard>
    )}
  </ScrollView>
);
```

NOTE: EmptyState accepts `actionLabel` and `onPressAction` props
(verified from `components/ui/empty-state.tsx`).
Use `colors.muted` for secondary text (valid theme token).

ACCEPTANCE:
✅ EmptyState shown when all metrics zero
✅ EmptyState has "View Sessions" action (actionLabel + onPressAction)
✅ Individual charts hidden when data is zero
✅ "No data for this period" message per chart
✅ Date range label shown when data exists
```

---

## Sprint 3 Summary

**Effort**: 5-6 days (1 dev)

**Priority**: P1 — These issues cause user confusion and poor perceived quality.

**Key patterns across all items**:
- `result.success` / `result.data` (NOT `.isOk` / `.value`)
- ServiceErrorCode: ONLY valid codes (`'UNAUTHORIZED'` NOT `'PERMISSION_DENIED'`, `'NETWORK'` NOT `'NETWORK_ERROR'`)
- err() shape: `{ code, message, details? }` — NOT `originalError`
- Use real `ServiceEvents.*` constants for events (NOT invented event names)
- Logger: `@/utils/logger` (NOT `@/services/logger`)
- No dead try/catch around Result-returning services
- try/catch IS correct for RN APIs (Share, Clipboard) that throw
- All handlers wrapped in `useCallback`
- Skeleton/list-item components wrapped in `memo()`
- Timeout cleanup via `useRef` on unmount (Item 115)
- Optimistic rollback inserts at correct position (Item 129)

**Dependencies**:
- All items need toast.tsx
- Item 9: Needs useEffect timer (direct null transition, no === 0 check)
- Item 86: Needs CoachCardSkeleton component (wrapped in memo())
- Item 115: Needs useRef for timeout cleanup on unmount
- Item 129: Needs original index tracking for correct rollback position
- Item 277: Uses real ServiceEvents.COACH_OBSERVATION_CREATED event

**Testing**:
- Item 9: Award badge → wait 30s → see countdown → timer vanishes at 0
- Item 16: Send reminder with 0 RSVPs → see warning
- Item 26: Share video → see success toast
- Item 30: Submit review → see detailed alert
- Item 33: Deactivate package with 3 bookings → alert mentions 3
- Item 41: Change scheduling rules → toast shows "2 rules updated"
- Item 43: Toggle trial session → see confirmation alert
- Item 47: Copy profile slug → see toast + feel haptic
- Item 49: Send 10 invites, 3 fail → failures shown first
- Item 60: Save disability form → see success toast
- Item 86: Open discover → see skeleton cards, not empty
- Item 114: Create booking → toast not Alert
- Item 115: Create post → see toast, redirect after 800ms, timer cleaned up
- Item 129: Dismiss invite, API fails → invite restored at original position
- Item 132: Download invoice with no storage → see "Not enough storage space"
- Item 155: Click Select All → see count e.g., "Select All (12)"
- Item 157: Upload club photo → see loading overlay
- Item 167: Join private group → alert says "request sent"
- Item 201: Share referral on web → copies link
- Item 218: Wrong password → error visible, clears on typing
- Item 277: Create observation for deleted athlete → see NOT_FOUND error
- Item 367: New coach with no sessions → see "No Analytics Yet" empty state

**Success criteria**:
- Zero silent actions (all have success/error feedback)
- Loading states on all async buttons
- Countdowns for time-based restrictions (direct transition, no intermediate state)
- Specific error messages using valid ServiceErrorCode values
- Empty states distinguish "no data" from "loading"
- Toasts replace Alerts for non-critical feedback
- Optimistic updates have rollback at correct position on failure
- Timeout cleanup on unmount for all setTimeout calls
