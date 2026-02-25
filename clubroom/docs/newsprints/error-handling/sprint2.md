# Error Handling Sprint 2: Missing Confirmations (Destructive Actions)

**Goal**: Add confirmation dialogs to all destructive actions to prevent accidental data loss.

**Items**: 18, 39, 40, 51, 53, 59, 238, 313, 314

**Key patterns across all items**:
- Result API: `result.success` / `result.data` (NOT `.isOk` / `.value`)
- err() shape: `{ code, message, details? }` — NOT `originalError`
- ServiceErrorCode: ONLY valid codes from `types/result.ts`
- No dead try/catch around Result-returning services
- All handlers wrapped in `useCallback`
- Dynamic colors from `useTheme()` — never in `StyleSheet.create`
- Toast: `const { showToast } = useToast()` — call `showToast(message, 'success'|'error')` (NOT `toast.success()`)
- Logger: `import { createLogger } from '@/utils/logger'`

---

## Item 18: Club Delete no safety step

**Problem**: `app/club/settings.tsx` single tap deletes club permanently. No "type club name to confirm" or multi-step verification.

**Files**:
- `app/club/settings.tsx`

```
Add two-step confirmation for club deletion.

FILE: `app/club/settings.tsx`

1. FIND delete button (~120-150):
```typescript
const handleDeleteClub = async () => {
  await clubService.deleteClub(clubId);
  router.replace('/clubs');
};

// In render:
<Button
  variant="danger"
  onPress={handleDeleteClub}
>
  Delete Club
</Button>
```

REPLACE with two-step flow:
```typescript
import { useState, useCallback, useMemo } from 'react';
import { Alert, TextInput, Modal } from 'react-native';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState('');
const [isDeleting, setIsDeleting] = useState(false);

const handleDeletePress = useCallback(() => {
  Alert.alert(
    'Delete Club',
    `This will permanently delete "${club.name}" and all associated data:\n\n• All members will be removed\n• Training schedules deleted\n• Posts and events removed\n• This cannot be undone\n\nAre you sure?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => setShowDeleteConfirm(true),
      },
    ]
  );
}, [club.name]);

const handleConfirmDelete = useCallback(async () => {
  if (deleteConfirmText !== club.name) {
    showToast(`Please type "${club.name}" to confirm`, 'error');
    return;
  }

  setIsDeleting(true);

  const result = await clubService.deleteClub(clubId);

  if (!result.success) {
    showToast(result.error.message || 'Failed to delete club', 'error');
    setIsDeleting(false);
    return;
  }

  showToast('Club deleted', 'success');
  setIsDeleting(false);
  router.replace(Routes.CLUB_HUB);
}, [deleteConfirmText, club.name, clubId]);

// In render:
<Button
  variant="danger"
  onPress={handleDeletePress}
>
  Delete Club
</Button>

{/* Confirmation Modal */}
<Modal
  visible={showDeleteConfirm}
  transparent
  animationType="fade"
  onRequestClose={() => setShowDeleteConfirm(false)}
>
  <View style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.foreground, 0.5) }]}>
    <SurfaceCard style={styles.modalContent}>
      <ThemedText type="heading" style={{ marginBottom: Spacing.sm }}>
        Confirm Deletion
      </ThemedText>

      <ThemedText type="body" style={{ marginBottom: Spacing.md }} color={colors.muted}>
        Type <ThemedText type="bodyBold">{club.name}</ThemedText> to confirm deletion.
      </ThemedText>

      <TextInput
        value={deleteConfirmText}
        onChangeText={setDeleteConfirmText}
        placeholder={`Type "${club.name}"`}
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Row gap={Spacing.sm} style={{ marginTop: Spacing.md }}>
        <Button
          variant="secondary"
          onPress={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmText('');
          }}
          style={{ flex: 1 }}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onPress={handleConfirmDelete}
          style={{ flex: 1 }}
          disabled={deleteConfirmText !== club.name || isDeleting}
          loading={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Row>
    </SurfaceCard>
  </View>
</Modal>
```

2. ADD styles — dynamic colors must use useMemo, NOT StyleSheet.create:
```typescript
// Static styles (no dynamic colors):
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  input: {
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
});
```

NOTE: `backgroundColor` on modalOverlay uses `withAlpha(colors.foreground, 0.5)` —
this is applied inline via style array, NOT in StyleSheet.create.
`colors.*` values come from `useTheme()` which is a hook — cannot be used at module scope.
Similarly, `borderColor` and `color` on the TextInput are applied inline.

ACCEPTANCE:
✅ First Alert explains consequences
✅ Second Modal requires typing club name
✅ Delete button disabled until text matches
✅ Loading state during deletion
✅ Success → toast + redirect
✅ Error → toast with message
✅ No dead try/catch — service returns Result
✅ Dynamic colors applied inline, not in StyleSheet.create
✅ Uses colors.foreground (NOT Colors.light.black) for overlay
✅ Handlers wrapped in useCallback
```

---

## Item 39: Cancel session instance single tap

**Problem**: `components/sessions/session-instance-manager.tsx` ~79-84 cancels session with single tap. Should confirm impact on registrations.

**Files**:
- `components/sessions/session-instance-manager.tsx`

```
Add confirmation dialog for session instance cancellation.

FILE: `components/sessions/session-instance-manager.tsx`

FIND handleCancelInstance (~79-84):
```typescript
const handleCancelInstance = async (instanceId: string) => {
  await sessionService.cancelInstance(instanceId);
  refetch();
};
```

REPLACE with:
```typescript
const [isCancelling, setIsCancelling] = useState<string | null>(null);

const handleCancelInstance = useCallback(async (instanceId: string) => {
  const instance = instances.find(i => i.id === instanceId);
  if (!instance) return;

  const registrationCount = instance.registrations?.length || 0;

  Alert.alert(
    'Cancel Session',
    registrationCount > 0
      ? `This session has ${registrationCount} registered participant${registrationCount > 1 ? 's' : ''}. They will be notified of the cancellation.`
      : 'Cancel this session instance?',
    [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(instanceId);

          const result = await sessionService.cancelInstance(instanceId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to cancel session', 'error');
            setIsCancelling(null);
            return;
          }

          showToast(
            registrationCount > 0
              ? `Session cancelled. ${registrationCount} participant${registrationCount > 1 ? 's' : ''} notified.`
              : 'Session cancelled',
            'success'
          );

          setIsCancelling(null);
          refetch();
        },
      },
    ]
  );
}, [instances, refetch]);
```

UPDATE cancel button in render:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={() => handleCancelInstance(instance.id)}
  disabled={isCancelling === instance.id}
  loading={isCancelling === instance.id}
>
  Cancel
</Button>
```

ACCEPTANCE:
✅ Alert shows registration count if > 0
✅ Confirmation required before cancel
✅ Loading state during cancellation
✅ Success → toast with participant count
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 40: Block date no confirmation

**Problem**: `components/coach/block-date-modal.tsx` ~117-137 blocks date immediately. Should confirm existing bookings impacted.

**Files**:
- `components/coach/block-date-modal.tsx`

```
Add conflict check and confirmation for block date.

FILE: `components/coach/block-date-modal.tsx`

FIND handleSave (~117-137):
```typescript
const handleSave = async () => {
  await availabilityService.blockDate({
    date: selectedDate,
    reason: reason,
  });
  onClose();
};
```

REPLACE with conflict check:
```typescript
const [conflicts, setConflicts] = useState<Booking[]>([]);
const [showConflictWarning, setShowConflictWarning] = useState(false);
const [saving, setSaving] = useState(false);

const checkConflicts = useCallback(async () => {
  setSaving(true);

  // Check for existing bookings on this date
  const bookingsResult = await bookingService.getBookingsByDate(
    coachId,
    selectedDate
  );

  if (bookingsResult.success && bookingsResult.data.length > 0) {
    setConflicts(bookingsResult.data);
    setShowConflictWarning(true);
    setSaving(false);
    return;
  }

  // No conflicts, proceed
  await saveBlock();
}, [coachId, selectedDate]);

const saveBlock = useCallback(async () => {
  setSaving(true);

  const result = await availabilityService.blockDate({
    coachId,
    date: selectedDate,
    reason: reason,
    cancelConflictingBookings: conflicts.length > 0,
  });

  if (!result.success) {
    showToast(result.error.message || 'Failed to block date', 'error');
    setSaving(false);
    return;
  }

  if (conflicts.length > 0) {
    showToast(`Date blocked. ${conflicts.length} booking${conflicts.length > 1 ? 's' : ''} cancelled.`, 'success');
  } else {
    showToast('Date blocked', 'success');
  }

  setSaving(false);
  onClose();
}, [coachId, selectedDate, reason, conflicts, onClose]);

// Update button:
<Button
  variant="primary"
  onPress={checkConflicts}
  disabled={!selectedDate || saving}
  loading={saving}
>
  {saving ? 'Blocking...' : 'Block Date'}
</Button>

{/* Conflict Warning Modal */}
<Modal
  visible={showConflictWarning}
  transparent
  animationType="fade"
  onRequestClose={() => setShowConflictWarning(false)}
>
  <View style={[styles.modalOverlay, { backgroundColor: withAlpha(colors.foreground, 0.5) }]}>
    <SurfaceCard style={styles.modalContent}>
      <ThemedText type="heading" style={{ marginBottom: Spacing.sm }}>
        Existing Bookings
      </ThemedText>

      <ThemedText type="body" style={{ marginBottom: Spacing.md }} color={colors.muted}>
        {conflicts.length} booking{conflicts.length > 1 ? 's' : ''} exist on this date. They will be cancelled and participants refunded.
      </ThemedText>

      <ScrollView style={{ maxHeight: 200, marginBottom: Spacing.md }}>
        {conflicts.map(booking => (
          <View
            key={booking.id}
            style={{
              paddingVertical: Spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <ThemedText type="body">{booking.athleteName}</ThemedText>
            <ThemedText type="caption" color={colors.muted}>
              {new Date(booking.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      <Row gap={Spacing.sm}>
        <Button
          variant="secondary"
          onPress={() => {
            setShowConflictWarning(false);
            setConflicts([]);
            setSaving(false);
          }}
          style={{ flex: 1 }}
        >
          Back
        </Button>
        <Button
          variant="danger"
          onPress={async () => {
            setShowConflictWarning(false);
            await saveBlock();
          }}
          style={{ flex: 1 }}
        >
          Cancel {conflicts.length} Booking{conflicts.length > 1 ? 's' : ''}
        </Button>
      </Row>
    </SurfaceCard>
  </View>
</Modal>
```

NOTE: Dynamic colors (colors.foreground, colors.border, colors.muted) applied
inline — NOT in StyleSheet.create. Use `withAlpha(colors.foreground, 0.5)` for
overlay (NOT `Colors.light.black`).

ACCEPTANCE:
✅ checkConflicts runs before save
✅ If bookings exist → show conflict modal
✅ Modal lists affected bookings with times
✅ User can back out or proceed
✅ Proceed → cancels bookings + blocks date
✅ Success toast mentions cancelled count
✅ No dead try/catch — service returns Result
✅ Dynamic colors inline, not in StyleSheet.create
✅ Handlers wrapped in useCallback
```

---

## Item 51: Squad remove member no confirmation

**Problem**: `components/squad/squad-members-card.tsx` ~94-100 removes member with single tap. Should confirm if member has upcoming sessions.

**Files**:
- `components/squad/squad-members-card.tsx`

```
Add confirmation for squad member removal.

FILE: `components/squad/squad-members-card.tsx`

FIND handleRemoveMember (~94-100):
```typescript
const handleRemoveMember = async (userId: string) => {
  await squadService.removeMember(squadId, userId);
  refetch();
};
```

REPLACE with:
```typescript
const [isRemoving, setIsRemoving] = useState<string | null>(null);

const handleRemoveMember = useCallback(async (userId: string) => {
  const member = members.find(m => m.id === userId);
  if (!member) return;

  // Check upcoming sessions
  const sessionsResult = await sessionService.getUpcomingSessions({
    squadId,
    userId,
  });

  const upcomingCount = sessionsResult.success ? sessionsResult.data.length : 0;

  Alert.alert(
    'Remove Squad Member',
    upcomingCount > 0
      ? `${member.name} has ${upcomingCount} upcoming session${upcomingCount > 1 ? 's' : ''} with this squad. Remove anyway?`
      : `Remove ${member.name} from ${squadName}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setIsRemoving(userId);

          const result = await squadService.removeMember(squadId, userId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to remove member', 'error');
            setIsRemoving(null);
            return;
          }

          showToast(
            upcomingCount > 0
              ? `${member.name} removed. ${upcomingCount} session${upcomingCount > 1 ? 's' : ''} cancelled.`
              : `${member.name} removed`,
            'success'
          );

          setIsRemoving(null);
          refetch();
        },
      },
    ]
  );
}, [members, squadId, squadName, refetch]);
```

UPDATE remove button:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={() => handleRemoveMember(member.id)}
  disabled={isRemoving === member.id}
  loading={isRemoving === member.id}
>
  Remove
</Button>
```

ACCEPTANCE:
✅ Alert mentions upcoming session count
✅ Confirmation required before removal
✅ Loading state per member
✅ Success toast includes cancelled session count
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 53: Emergency contact delete no confirmation

**Problem**: `components/child/emergency-contact-card.tsx` ~82-85 deletes emergency contact with single tap. Critical safety data.

**Files**:
- `components/child/emergency-contact-card.tsx`

```
Add confirmation for emergency contact deletion.

FILE: `components/child/emergency-contact-card.tsx`

FIND handleDelete (~82-85):
```typescript
const handleDelete = async () => {
  await familyService.deleteEmergencyContact(childId, contactId);
  refetch();
};
```

REPLACE with:
```typescript
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = useCallback(() => {
  Alert.alert(
    'Delete Emergency Contact',
    `Remove ${contact.name} (${contact.relationship}) as emergency contact?\n\nThis is critical safety information and should only be deleted if no longer accurate.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);

          const result = await familyService.deleteEmergencyContact(
            childId,
            contactId
          );

          if (!result.success) {
            showToast(result.error.message || 'Failed to delete contact', 'error');
            setIsDeleting(false);
            return;
          }

          showToast('Emergency contact deleted', 'success');
          setIsDeleting(false);
          refetch();
        },
      },
    ]
  );
}, [contact, childId, contactId, refetch]);
```

UPDATE delete button:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={handleDelete}
  disabled={isDeleting}
  loading={isDeleting}
>
  Delete
</Button>
```

ACCEPTANCE:
✅ Alert emphasizes critical safety data
✅ Shows contact name and relationship
✅ Confirmation required
✅ Loading state during deletion
✅ Success → toast + refetch
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 59: Pending family invite cancel no confirmation

**Problem**: `components/family/sharing-pending-invites.tsx` ~46-55 cancels invite with single tap. Should confirm if recipient already responded.

**Files**:
- `components/family/sharing-pending-invites.tsx`

```
Add confirmation for invite cancellation.

FILE: `components/family/sharing-pending-invites.tsx`

FIND handleCancelInvite (~46-55):
```typescript
const handleCancelInvite = async (inviteId: string) => {
  await inviteService.cancelInvite(inviteId);
  refetch();
};
```

REPLACE with:
```typescript
const [isCancelling, setIsCancelling] = useState<string | null>(null);

const handleCancelInvite = useCallback(async (inviteId: string) => {
  const invite = invites.find(i => i.id === inviteId);
  if (!invite) return;

  Alert.alert(
    'Cancel Invite',
    `Cancel invite to ${invite.recipientEmail}?\n\nThey will no longer be able to access ${invite.childName}'s information.`,
    [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel Invite',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(inviteId);

          const result = await inviteService.cancelInvite(inviteId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to cancel invite', 'error');
            setIsCancelling(null);
            return;
          }

          showToast('Invite cancelled', 'success');
          setIsCancelling(null);
          refetch();
        },
      },
    ]
  );
}, [invites, refetch]);
```

UPDATE cancel button:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={() => handleCancelInvite(invite.id)}
  disabled={isCancelling === invite.id}
  loading={isCancelling === invite.id}
>
  Cancel
</Button>
```

ACCEPTANCE:
✅ Alert shows recipient email and child name
✅ Confirmation required
✅ Loading state per invite
✅ Success → toast + refetch
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 238: Invite list card Remove no confirmation

**Problem**: `components/invite/invite-list-card.tsx` ~248-262 removes invite with single tap. Should confirm intent.

**Files**:
- `components/invite/invite-list-card.tsx`

```
Add confirmation for invite removal.

FILE: `components/invite/invite-list-card.tsx`

FIND handleRemove (~248-262):
```typescript
const handleRemove = async () => {
  await inviteService.deleteInvite(inviteId);
  onRemoved?.();
};
```

REPLACE with:
```typescript
const [isRemoving, setIsRemoving] = useState(false);

const handleRemove = useCallback(() => {
  Alert.alert(
    'Remove Invite',
    invite.status === 'pending'
      ? `Cancel invite to ${invite.recipientName || invite.recipientEmail}?`
      : `Delete ${invite.status} invite to ${invite.recipientName || invite.recipientEmail}?`,
    [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setIsRemoving(true);

          const result = await inviteService.deleteInvite(inviteId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to remove invite', 'error');
            setIsRemoving(false);
            return;
          }

          showToast('Invite removed', 'success');
          setIsRemoving(false);
          onRemoved?.();
        },
      },
    ]
  );
}, [invite, inviteId, onRemoved]);
```

UPDATE remove button:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={handleRemove}
  disabled={isRemoving}
  loading={isRemoving}
>
  Remove
</Button>
```

ACCEPTANCE:
✅ Alert text adapts to invite status (pending/accepted/declined)
✅ Shows recipient name or email
✅ Confirmation required
✅ Loading state during removal
✅ Success → toast + onRemoved callback
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Item 313: NotificationCard swipe-to-delete no undo

**Problem**: `components/notification/notification-card.tsx` ~276-285 deletes notification on swipe with no undo. Should allow recovery.

**Files**:
- `components/notification/notification-card.tsx`

```
Add undo toast for swipe-to-delete notifications.

FILE: `components/notification/notification-card.tsx`

FIND onSwipeDelete (~276-285):
```typescript
const onSwipeDelete = async () => {
  await notificationService.deleteNotification(notificationId);
  onDeleted?.();
};
```

REPLACE with undo logic:
```typescript
import { useState, useRef, useEffect, useCallback } from 'react';

const [isDeleted, setIsDeleted] = useState(false);
const isDeletedRef = useRef(false);
const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const onSwipeDelete = useCallback(() => {
  // Optimistically hide
  setIsDeleted(true);
  isDeletedRef.current = true;

  // Show undo toast
  showToast('Notification deleted', {
    tone: 'default',
    action: {
      label: 'Undo',
      onPress: handleUndo,
    },
    duration: 5000,
  });

  // Fallback: actually delete after 5s
  undoTimeoutRef.current = setTimeout(() => {
    if (isDeletedRef.current) {
      void performDelete();
    }
  }, 5000);
}, [notificationId]);

const handleUndo = useCallback(() => {
  setIsDeleted(false);
  isDeletedRef.current = false;
  if (undoTimeoutRef.current) {
    clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = null;
  }
  showToast('Notification restored', 'success');
}, []);

const performDelete = useCallback(async () => {
  const result = await notificationService.deleteNotification(notificationId);

  if (!result.success) {
    // Revert optimistic update
    setIsDeleted(false);
    isDeletedRef.current = false;
    showToast('Failed to delete notification', 'error');
    return;
  }

  onDeleted?.();
}, [notificationId, onDeleted]);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };
}, []);
```

NOTE: Use `useRef` for `isDeletedRef` to avoid stale closure in the timeout callback.
The `isDeleted` state drives the render, but the ref is what the timeout reads.
This prevents the timeout from reading a stale `isDeleted` value.

UPDATE render to hide when deleted:
```typescript
if (isDeleted) {
  return null;
}

return (
  <Swipeable
    renderRightActions={renderRightActions}
    onSwipeableOpen={onSwipeDelete}
  >
    {/* notification content */}
  </Swipeable>
);
```

ACCEPTANCE:
✅ Swipe → notification hidden immediately
✅ Toast shows "Undo" button for 5s
✅ Undo → notification restored
✅ Toast dismiss or 5s timeout → actual deletion
✅ Delete failure → notification restored with error toast
✅ Timeout cleared on unmount
✅ useRef for isDeleted prevents stale closure in timeout
✅ No dead try/catch — service returns Result
✅ Handlers wrapped in useCallback
```

---

## Item 314: AthleteNotes delete no confirmation

**Problem**: `components/roster/athlete-notes.tsx` ~106-112 deletes note with single tap. Coach may lose important observations.

**Files**:
- `components/roster/athlete-notes.tsx`

```
Add confirmation for athlete note deletion.

FILE: `components/roster/athlete-notes.tsx`

FIND handleDeleteNote (~106-112):
```typescript
const handleDeleteNote = async (noteId: string) => {
  await rosterService.deleteNote(athleteId, noteId);
  refetch();
};
```

REPLACE with:
```typescript
const [isDeleting, setIsDeleting] = useState<string | null>(null);

const handleDeleteNote = useCallback((noteId: string) => {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  const preview = note.content.length > 50
    ? note.content.substring(0, 50) + '...'
    : note.content;

  Alert.alert(
    'Delete Note',
    `Delete this note?\n\n"${preview}"\n\nThis cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(noteId);

          const result = await rosterService.deleteNote(athleteId, noteId);

          if (!result.success) {
            showToast(result.error.message || 'Failed to delete note', 'error');
            setIsDeleting(null);
            return;
          }

          showToast('Note deleted', 'success');
          setIsDeleting(null);
          refetch();
        },
      },
    ]
  );
}, [notes, athleteId, refetch]);
```

UPDATE delete button:
```typescript
<Button
  variant="danger"
  size="compact"
  onPress={() => handleDeleteNote(note.id)}
  disabled={isDeleting === note.id}
  loading={isDeleting === note.id}
>
  Delete
</Button>
```

ACCEPTANCE:
✅ Alert shows note preview (first 50 chars)
✅ Mentions "cannot be undone"
✅ Confirmation required
✅ Loading state per note
✅ Success → toast + refetch
✅ No dead try/catch — service returns Result
✅ Handler wrapped in useCallback
```

---

## Sprint 2 Summary

**Effort**: 3-4 days (1 dev)

**Priority**: P0 — These are destructive actions that can't be undone. Users accidentally delete critical data.

**Key patterns across all items**:
- `result.success` / `result.data` (NOT `.isOk` / `.value`)
- No dead try/catch around Result-returning services
- Dynamic colors from `useTheme()` applied inline (NOT in `StyleSheet.create`)
- `withAlpha(colors.foreground, 0.5)` for overlays (NOT `Colors.light.black`)
- All handlers wrapped in `useCallback`
- `useRef` for values read inside timeout callbacks (prevents stale closures)

**Dependencies**:
- All items need Alert from react-native
- Items need toast.tsx for success/error feedback
- Items need Button loading prop
- Item 313 needs toast with action support (undo) + useRef for stale closure fix

**Testing**:
- Item 18: Delete club → see Alert → see modal with name input → type wrong name → button disabled
- Item 39: Cancel session with 5 registrations → Alert mentions 5 participants
- Item 40: Block date with 3 bookings → see conflict modal listing bookings
- Item 51: Remove squad member with 2 upcoming sessions → Alert mentions 2 sessions
- Item 53: Delete emergency contact → Alert emphasizes "critical safety information"
- Item 59: Cancel pending invite → Alert shows recipient email and child name
- Item 238: Remove accepted invite → Alert says "Delete accepted invite"
- Item 313: Swipe notification → toast with Undo button → tap Undo → notification restored
- Item 314: Delete note → Alert shows note preview

**Success criteria**:
- Zero single-tap destructive actions remain
- All confirmations show impact (counts, names, consequences)
- All destructive operations have loading states
- All show success/error toasts
- Item 313 allows undo within 5 seconds (with useRef for stale closure)
- Item 18 requires typing club name to confirm
- Dynamic colors never in StyleSheet.create
