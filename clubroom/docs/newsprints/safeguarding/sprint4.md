# Safeguarding Sprint 4 — P3 Ongoing

**Priority**: P3 (Low — ongoing improvements, non-blocking)
**Goal**: Polish UX, add advanced privacy features, improve audit trails, and fix remaining edge cases.

---

## S-11: Session Notes No Access Control

```
TASK: Add coachId verification to session notes form

CONTEXT:
Session notes form doesn't verify that the person submitting notes is the coach for that session.

FILE: components/session/session-notes-form.tsx

REQUIRED CHANGES:

1. Add access verification:
```typescript
import { groupSessionService } from '@/services/group-session';

const SessionNotesForm = ({ sessionId, onSubmit }) => {
  const { currentUser } = useAuth();
  // currentUser is DemoUser | null with .id, .role, etc.
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyAccess();
  }, [sessionId, currentUser?.id]);

  const verifyAccess = async () => {
    if (!currentUser || currentUser.role !== 'coach') {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Verify session belongs to current coach
    const session = await groupSessionService.getSession(sessionId);

    if (!session) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const isCoach = session.coachId === currentUser?.id;
    setHasAccess(isCoach);
    setLoading(false);

    if (!isCoach) {
      logger.warn('Unauthorized session notes access attempt', {
        sessionId,
        attemptedBy: currentUser?.id,
        actualCoach: session.coachId,
      });
    }
  };

  if (loading) {
    return <LoadingState message="Verifying access..." />;
  }

  if (!hasAccess) {
    return (
      <Center style={{ padding: Spacing.xl }}>
        <Ionicons name="lock-closed" size={48} color={colors.error} />
        <Spacer height={Spacing.md} />
        <ThemedText style={Typography.heading}>Access Denied</ThemedText>
        <ThemedText style={Typography.body} color="secondary">
          You don't have permission to edit notes for this session.
        </ThemedText>
      </Center>
    );
  }

  // Render form...
};
```

2. Add verification in service layer:
```typescript
// In services/session-service.ts or progress-feedback-service.ts
async saveSessionNotes(
  sessionId: string,
  coachId: string,
  notes: { public?: string; private?: string }
): Promise<Result<SessionNotes, ServiceError>> {

  // Verify coach owns session
  const sessionResult = await this.getSession(sessionId);

  if (!sessionResult.success) {
    return err(sessionResult.error);
  }

  if (sessionResult.data.coachId !== coachId) {
    logger.error('Unauthorized session notes save attempt', {
      sessionId,
      attemptedBy: coachId,
      actualCoach: sessionResult.data.coachId,
    });

    return err({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to edit notes for this session',
    });
  }

  // Save notes...
}
```

ACCEPTANCE CRITERIA:
✅ Form verifies coachId matches session owner
✅ Non-coaches cannot access form
✅ Other coaches cannot access another coach's session notes
✅ Unauthorized access logged with details
✅ Clear "Access Denied" UI shown
✅ Service layer validates ownership
✅ Unit test: notes rejected when coach mismatch
```

---

## S-15: Account Deletion No Undo

```
TASK: Add 30-day soft-delete grace period

CONTEXT:
Account deletion is immediate and irreversible, risking accidental data loss.

FILE: app/settings/account.tsx
LINE: ~32

REQUIRED CHANGES:

1. Implement soft delete with grace period:
```typescript
// In services/user-service.ts or auth-service.ts
async requestAccountDeletion(userId: string): Promise<Result<AccountDeletionRequest, ServiceError>> {
  const user = await this.getUser(userId);

  if (!user.success) {
    return err({ code: 'NOT_FOUND', message: 'User not found' });
  }

  // Calculate deletion date (30 days from now)
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);

  const deletionRequest: AccountDeletionRequest = {
    id: generateId(),
    userId,
    requestedAt: new Date().toISOString(),
    scheduledDeletionAt: deletionDate.toISOString(),
    status: 'pending',
    canCancel: true,
  };

  const key = `${STORAGE_KEYS.ACCOUNT_DELETION_PREFIX}${userId}`;
  await apiClient.set(key, deletionRequest);

  // Mark user account as pending deletion
  user.data.accountStatus = 'pending_deletion';
  user.data.deletionScheduledAt = deletionDate.toISOString();
  await this.updateUser(userId, user.data);

  logger.info('Account deletion requested', {
    userId,
    scheduledDeletionAt: deletionDate.toISOString(),
  });

  emitTyped('ACCOUNT_DELETION_REQUESTED', {
    userId,
    requestedAt: deletionRequest.requestedAt,
    scheduledDeletionAt: deletionRequest.scheduledDeletionAt,
  });

  return ok(deletionRequest);
}

async cancelAccountDeletion(userId: string): Promise<Result<User, ServiceError>> {
  const key = `${STORAGE_KEYS.ACCOUNT_DELETION_PREFIX}${userId}`;
  const deletionRequest = await apiClient.get<AccountDeletionRequest>(key);

  if (!deletionRequest) {
    return err({
      code: 'NOT_FOUND',
      message: 'No pending deletion request found',
    });
  }

  // Check if still within grace period
  const now = new Date();
  const scheduledDate = new Date(deletionRequest.scheduledDeletionAt);

  if (now >= scheduledDate) {
    return err({
      code: 'CONFLICT',
      message: 'Account deletion grace period has expired',
    });
  }

  // Cancel deletion
  deletionRequest.status = 'cancelled';
  deletionRequest.cancelledAt = now.toISOString();
  await apiClient.set(key, deletionRequest);

  // Restore user account
  const user = await this.getUser(userId);
  if (user.success) {
    user.data.accountStatus = 'active';
    user.data.deletionScheduledAt = undefined;
    await this.updateUser(userId, user.data);
  }

  logger.info('Account deletion cancelled', { userId });

  emitTyped('ACCOUNT_DELETION_CANCELLED', {
    userId,
    cancelledAt: deletionRequest.cancelledAt,
  });

  return user;
}
```

2. Update UI to show grace period:
```typescript
// In app/settings/account.tsx
const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);

useEffect(() => {
  checkDeletionStatus();
}, []);

const checkDeletionStatus = async () => {
  const result = await authService.getAccountDeletionRequest(currentUserId);
  if (result.success) {
    setDeletionRequest(result.data);
  }
};

const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Account',
    'Are you sure you want to delete your account?\n\n• Your account will be scheduled for deletion in 30 days\n• You can cancel anytime during this period\n• After 30 days, all data will be permanently deleted',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          const result = await authService.requestAccountDeletion(currentUserId);
          if (result.success) {
            setDeletionRequest(result.data);
          }
        },
      },
    ]
  );
};

{deletionRequest && deletionRequest.status === 'pending' && (
  <Column style={{
    padding: Spacing.lg,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.card,
    borderWidth: 2,
    borderColor: colors.error,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
      <Ionicons name="warning" size={24} color={colors.error} />
      <Spacer width={Spacing.sm} />
      <ThemedText style={Typography.heading} color="error">
        Account Deletion Scheduled
      </ThemedText>
    </Row>

    <ThemedText style={Typography.body}>
      Your account is scheduled for deletion on {formatDate(deletionRequest.scheduledDeletionAt)}.
    </ThemedText>

    <Spacer height={Spacing.xs} />

    <ThemedText style={Typography.small} color="secondary">
      {getDaysRemaining(deletionRequest.scheduledDeletionAt)} days remaining to cancel
    </ThemedText>

    <Spacer height={Spacing.md} />

    <Button
      title="Cancel Deletion"
      onPress={handleCancelDeletion}
      variant="primary"
    />
  </Column>
)}
```

3. Add background job to process scheduled deletions:
```typescript
async processScheduledDeletions(): Promise<void> {
  logger.info('Processing scheduled account deletions');

  const allKeys = await apiClient.getAllKeys();
  const deletionKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.ACCOUNT_DELETION_PREFIX));

  const now = new Date();
  let processedCount = 0;

  for (const key of deletionKeys) {
    const request = await apiClient.get<AccountDeletionRequest>(key);

    if (!request || request.status !== 'pending') continue;

    const scheduledDate = new Date(request.scheduledDeletionAt);

    if (now >= scheduledDate) {
      // Grace period expired, proceed with deletion
      await this.permanentlyDeleteAccount(request.userId);
      request.status = 'completed';
      request.deletedAt = now.toISOString();
      await apiClient.set(key, request);
      processedCount++;

      logger.warn('Account permanently deleted', {
        userId: request.userId,
        requestedAt: request.requestedAt,
        deletedAt: request.deletedAt,
      });
    }
  }

  logger.info('Scheduled deletions processed', { processedCount });
}
```

ACCEPTANCE CRITERIA:
✅ Delete request creates 30-day grace period
✅ User account marked as pending_deletion
✅ Cancellation available during grace period
✅ UI shows days remaining to cancel
✅ Background job processes expired grace periods
✅ Permanent deletion only after 30 days
✅ ACCOUNT_DELETION_REQUESTED event emitted
✅ ACCOUNT_DELETION_CANCELLED event emitted
```

---

## S-22: Media Share No Consent Parameter

```
TASK: Add athleteId and consent check to media share

CONTEXT:
shareMedia() doesn't check SOCIAL_MEDIA consent before allowing media to be shared externally.

FILE: services/media-service.ts
LINES: ~204-231

REQUIRED CHANGES:

1. Add consent check to shareMedia:
```typescript
async shareMedia(
  mediaId: string,
  athleteId: string,
  platform: 'facebook' | 'instagram' | 'twitter' | 'whatsapp',
  sharedBy: string
): Promise<Result<MediaShare, ServiceError>> {

  // Check SOCIAL_MEDIA consent
  const consentResult = await consentService.hasConsent(
    athleteId,
    'SOCIAL_MEDIA',
    sharedBy
  );

  if (!consentResult.success) {
    return err({
      code: 'UNKNOWN',
      message: 'Unable to verify social media consent',
    });
  }

  if (!consentResult.data) {
    logger.warn('Media share blocked - no social media consent', {
      mediaId,
      athleteId,
      platform,
      sharedBy,
    });

    return err({
      code: 'UNAUTHORIZED',
      message: 'Social media sharing consent required from athlete\'s parent',
    });
  }

  // Get media item
  const mediaResult = await this.getMedia(mediaId);
  if (!mediaResult.success) {
    return err(mediaResult.error);
  }

  // Create share record
  const share: MediaShare = {
    id: generateId(),
    mediaId,
    athleteId,
    platform,
    sharedBy,
    sharedAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.MEDIA_SHARE_PREFIX}${share.id}`;
  await apiClient.set(key, share);

  logger.info('Media shared with consent', {
    mediaId,
    athleteId,
    platform,
  });

  emitTyped('MEDIA_SHARED', {
    mediaId,
    athleteId,
    platform,
    sharedBy,
    timestamp: share.sharedAt,
  });

  return ok(share);
}
```

2. Update share UI to show consent status:
```typescript
// In media detail screen or share modal
const [canShare, setCanShare] = useState<boolean | null>(null);
const [checkingConsent, setCheckingConsent] = useState(true);

useEffect(() => {
  checkSocialMediaConsent();
}, [athleteId]);

const checkSocialMediaConsent = async () => {
  const result = await consentService.hasConsent(
    athleteId,
    'SOCIAL_MEDIA',
    currentUserId
  );

  setCanShare(result.success && result.data);
  setCheckingConsent(false);
};

const handleShare = async (platform: string) => {
  if (!canShare) {
    Alert.alert(
      'Consent Required',
      'Social media sharing consent has not been granted for this athlete. Please request consent from their parent before sharing.',
      [{ text: 'OK' }]
    );
    return;
  }

  const result = await mediaService.shareMedia(mediaId, athleteId, platform, currentUserId);

  if (result.success) {
    // Proceed with native share
    await Share.share({
      message: 'Check out this training moment!',
      url: mediaUrl,
    });
  } else {
    Alert.alert('Error', result.error.message);
  }
};

// Show consent status
{checkingConsent ? (
  <Skeleton width={200} height={20} />
) : canShare ? (
  <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
    <Spacer width={Spacing.xs} />
    <ThemedText style={Typography.small} color="success">
      Social media sharing allowed
    </ThemedText>
  </Row>
) : (
  <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
    <Ionicons name="alert-circle" size={16} color={colors.error} />
    <Spacer width={Spacing.xs} />
    <ThemedText style={Typography.small} color="error">
      Social media consent not granted
    </ThemedText>
  </Row>
)}
```

3. Add storage key:
```typescript
// In constants/storage-keys.ts
MEDIA_SHARE_PREFIX: 'media_share_',
```

4. Add event type:
```typescript
// In services/event-bus.ts
MEDIA_SHARED: {
  mediaId: string;
  athleteId: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'whatsapp';
  sharedBy: string;
  timestamp: string;
};
```

ACCEPTANCE CRITERIA:
✅ shareMedia requires athleteId parameter
✅ SOCIAL_MEDIA consent checked before share
✅ Share blocked when consent not granted
✅ UI shows consent status before share
✅ Clear error message when blocked
✅ MEDIA_SHARED event emitted on success
✅ Share record saved with platform details
```

---

## S-27: Emergency Card Tap Calls Without Warning

```
TASK: Change tap behavior to show details, long-press to call

CONTEXT:
Tapping phone number immediately initiates call, which could be accidental outside emergencies.

FILE: components/safety/emergency-contact-card-sections.tsx
LINES: ~28-52

REQUIRED CHANGES:

1. Implement tap for details, long-press for call:
```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const EmergencyContactCard = ({ contact, isActiveSession }) => {
  const { colors } = useTheme();

  const handleTap = () => {
    // Show contact details modal
    router.push(`/safety/contact/${contact.id}`);
  };

  const handleLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Call Emergency Contact',
      `Call ${contact.name} at ${contact.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => initiateCall(contact),
        },
      ]
    );
  };

  const tapGesture = Gesture.Tap().onEnd(handleTap);
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(handleLongPress);

  const composed = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <GestureDetector gesture={composed}>
      <SurfaceCard style={{ marginBottom: Spacing.sm }}>
        <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>
              {contact.name}
            </ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              {contact.relationship}
            </ThemedText>
            <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
              <Ionicons name="call" size={14} color={colors.primary} />
              <Spacer width={Spacing.xxs} />
              <ThemedText style={Typography.small} color="primary">
                {contact.phone}
              </ThemedText>
            </Row>
          </Column>

          <Column style={{ alignItems: 'flex-end' }}>
            <ThemedText style={Typography.caption} color="secondary">
              Tap for details
            </ThemedText>
            <ThemedText style={Typography.caption} color="secondary">
              Hold to call
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>
    </GestureDetector>
  );
};
```

2. Exception for active session emergency banner:
```typescript
// In components/safety/emergency-banner.tsx
// During active session, direct call is appropriate
{isActiveSession && (
  <Button
    title={`Call ${primaryContact.name}`}
    onPress={() => initiateCall(primaryContact)} // No confirmation
    variant="destructive"
    leftIcon="call"
    style={{ minHeight: Components.button.height + Spacing.xs }}
  />
)}
```

3. Add visual indicator for long-press:
```typescript
const [isPressing, setIsPressing] = useState(false);

const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onBegin(() => {
    setIsPressing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  })
  .onStart(() => {
    setIsPressing(false);
    handleLongPress();
  })
  .onFinalize(() => {
    setIsPressing(false);
  });

<SurfaceCard
  style={{
    marginBottom: Spacing.sm,
    transform: isPressing ? [{ scale: 0.98 }] : [{ scale: 1 }],
    opacity: isPressing ? 0.8 : 1,
  }}
>
  {/* ... */}
</SurfaceCard>
```

ACCEPTANCE CRITERIA:
✅ Tap opens contact details screen
✅ Long-press (500ms) triggers call confirmation
✅ Haptic feedback on long-press start
✅ Visual feedback (scale + opacity) while pressing
✅ Active session emergency banner still has direct call
✅ Gesture handler uses react-native-gesture-handler
✅ Web fallback uses onPress/onLongPress
```

---

## S-28: Emergency Phone Clickable Outside Session

```
TASK: Disable call links outside active sessions

CONTEXT:
Emergency contact call buttons are enabled at all times, when they should only be urgent during active sessions.

FILE: components/safety/emergency-banner.tsx
LINES: ~76-88

REQUIRED CHANGES:

1. Add session status check:
```typescript
const [isActiveSession, setIsActiveSession] = useState(false);

useEffect(() => {
  checkActiveSession();
}, [sessionId]);

const checkActiveSession = async () => {
  if (!sessionId) {
    setIsActiveSession(false);
    return;
  }

  const session = await groupSessionService.getSession(sessionId);

  if (session) {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);

    // Session is active if current time is between start and end
    setIsActiveSession(now >= startTime && now <= endTime && session.status === 'in_progress');
  } else {
    setIsActiveSession(false);
  }
};
```

2. Conditional rendering based on session status:
```typescript
{isActiveSession ? (
  // Active session: direct call enabled
  <Column style={{
    padding: Spacing.lg,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.card,
    borderWidth: 2,
    borderColor: colors.error,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.md }}>
      <Ionicons name="alert-circle" size={32} color={colors.error} />
      <Spacer width={Spacing.sm} />
      <ThemedText style={Typography.heading} color="error">
        Emergency Contact
      </ThemedText>
    </Row>

    <Button
      title={`Call ${primaryContact.name}`}
      onPress={() => initiateCall(primaryContact)}
      variant="destructive"
      leftIcon="call"
      style={{ minHeight: Components.button.height + Spacing.xs }}
    />
  </Column>
) : (
  // Outside session: view-only mode
  <Column style={{
    padding: Spacing.lg,
    backgroundColor: colors.surfaceVariant,
    borderRadius: Radii.card,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.md }}>
      <Ionicons name="information-circle" size={24} color={colors.textSecondary} />
      <Spacer width={Spacing.sm} />
      <ThemedText style={Typography.heading}>
        Emergency Contact
      </ThemedText>
    </Row>

    <ThemedText style={Typography.body} color="secondary">
      {primaryContact.name}
    </ThemedText>
    <ThemedText style={Typography.small} color="secondary">
      {primaryContact.phone}
    </ThemedText>

    <Spacer height={Spacing.md} />

    <Column style={{
      padding: Spacing.sm,
      backgroundColor: colors.infoBackground,
      borderRadius: Radii.sm,
    }}>
      <ThemedText style={Typography.small} color="secondary">
        Quick call available during active sessions
      </ThemedText>
    </Column>
  </Column>
)}
```

3. Add override for genuine emergencies:
```typescript
{!isActiveSession && (
  <Button
    title="Emergency Override"
    onPress={() => {
      Alert.alert(
        'Emergency Call',
        'This session is not currently active. Are you experiencing a genuine emergency?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes - Call Now',
            style: 'destructive',
            onPress: () => {
              logger.warn('Emergency override used outside active session', {
                sessionId,
                contactId: primaryContact.id,
              });
              initiateCall(primaryContact);
            },
          },
        ]
      );
    }}
    variant="secondary"
  />
)}
```

ACCEPTANCE CRITERIA:
✅ isActiveSession checks session time window
✅ Direct call only enabled during active sessions
✅ Outside sessions shows view-only contact info
✅ Emergency override available with confirmation
✅ Override usage logged as warning
✅ UI clearly indicates when quick call available
```

---

## S-32: SEN Tags No Maximum

```
TASK: Add 10-tag limit, priority ordering, and critical flag to SEN tags

CONTEXT:
Special Educational Needs form allows unlimited tags, making it hard for coaches to identify critical information quickly.

FILE: components/family/medical-special-needs-form-sections.tsx
LINES: ~18-80

REQUIRED CHANGES:

1. Add tag limit and priority:
```typescript
const MAX_SEN_TAGS = 10;

interface SENTag {
  id: string;
  label: string;
  isCritical: boolean;
  priority: number; // 1-10, 1 being highest priority
  notes?: string;
}

const [senTags, setSenTags] = useState<SENTag[]>([]);

const handleAddTag = (label: string) => {
  if (senTags.length >= MAX_SEN_TAGS) {
    Alert.alert(
      'Maximum Tags Reached',
      `You can add up to ${MAX_SEN_TAGS} SEN tags. Please remove a tag before adding another, or combine related items.`,
      [{ text: 'OK' }]
    );
    return;
  }

  const newTag: SENTag = {
    id: generateId(),
    label,
    isCritical: false,
    priority: senTags.length + 1,
    notes: '',
  };

  setSenTags([...senTags, newTag]);
};
```

2. Add reordering UI:

**NOTE**: `react-native-draggable-flatlist` is a NEW dependency. Install via:
`npx expo install react-native-draggable-flatlist`

```typescript
import DraggableFlatList from 'react-native-draggable-flatlist';

<DraggableFlatList
  data={senTags}
  onDragEnd={({ data }) => {
    // Update priority based on new order
    const reordered = data.map((tag, index) => ({
      ...tag,
      priority: index + 1,
    }));
    setSenTags(reordered);
  }}
  keyExtractor={(item) => item.id}
  renderItem={({ item, drag, isActive }) => (
    <SENTagCard
      tag={item}
      onDrag={drag}
      isActive={isActive}
      onToggleCritical={() => handleToggleCritical(item.id)}
      onRemove={() => handleRemoveTag(item.id)}
      onUpdateNotes={(notes) => handleUpdateNotes(item.id, notes)}
    />
  )}
/>
```

3. Create SENTagCard component:
```typescript
const SENTagCard = ({ tag, onDrag, isActive, onToggleCritical, onRemove, onUpdateNotes }) => {
  const { colors } = useTheme();
  const [showNotes, setShowNotes] = useState(false);

  return (
    <Column style={{
      padding: Spacing.md,
      backgroundColor: tag.isCritical ? colors.errorBackground : colors.surface,
      borderRadius: Radii.sm,
      borderLeftWidth: 4,
      borderLeftColor: tag.isCritical ? colors.error : colors.primary,
      marginBottom: Spacing.sm,
      opacity: isActive ? 0.8 : 1,
    }}>
      <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Drag handle */}
        <Clickable onLongPress={onDrag}>
          <Ionicons name="menu" size={24} color={colors.textSecondary} />
        </Clickable>

        <Spacer width={Spacing.sm} />

        {/* Tag content */}
        <Column style={{ flex: 1 }}>
          <Row style={{ alignItems: 'center' }}>
            <ThemedText style={Typography.subheading}>
              {tag.priority}. {tag.label}
            </ThemedText>
            {tag.isCritical && (
              <>
                <Spacer width={Spacing.xs} />
                <Badge text="Critical" variant="error" />
              </>
            )}
          </Row>

          {tag.notes && (
            <ThemedText
              style={[Typography.small, { marginTop: Spacing.xxs }]}
              color="secondary"
              numberOfLines={showNotes ? undefined : 2}
            >
              {tag.notes}
            </ThemedText>
          )}
        </Column>

        <Spacer width={Spacing.sm} />

        {/* Actions */}
        <Row style={{ gap: Spacing.xs }}>
          <Clickable onPress={onToggleCritical}>
            <Ionicons
              name={tag.isCritical ? "star" : "star-outline"}
              size={24}
              color={tag.isCritical ? colors.error : colors.textSecondary}
            />
          </Clickable>

          <Clickable onPress={() => setShowNotes(!showNotes)}>
            <Ionicons name="create-outline" size={24} color={colors.textSecondary} />
          </Clickable>

          <Clickable onPress={onRemove}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
          </Clickable>
        </Row>
      </Row>

      {/* Notes input */}
      {showNotes && (
        <Column style={{ marginTop: Spacing.sm }}>
          <TextInput
            value={tag.notes}
            onChangeText={onUpdateNotes}
            placeholder="Add notes for coaches (e.g., specific accommodations needed)"
            multiline
            numberOfLines={3}
            style={{ minHeight: 80 }}
          />
        </Column>
      )}
    </Column>
  );
};
```

4. Add critical tags summary for coaches:
```typescript
// In athlete profile or roster view
const criticalTags = athlete.senTags?.filter(t => t.isCritical) || [];

{criticalTags.length > 0 && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
      <Ionicons name="alert-circle" size={20} color={colors.error} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.subheading} color="error">
        Critical SEN Information
      </ThemedText>
    </Row>

    {criticalTags
      .sort((a, b) => a.priority - b.priority)
      .map(tag => (
        <Column key={tag.id} style={{ marginBottom: Spacing.xs }}>
          <ThemedText style={Typography.body}>
            • {tag.label}
          </ThemedText>
          {tag.notes && (
            <ThemedText style={[Typography.small, { marginLeft: Spacing.md }]} color="secondary">
              {tag.notes}
            </ThemedText>
          )}
        </Column>
      ))}
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ Maximum 10 SEN tags enforced
✅ Tags reorderable via drag-and-drop
✅ Critical flag toggleable per tag
✅ Priority auto-assigned based on order
✅ Notes field per tag (optional)
✅ Critical tags shown prominently to coaches
✅ Alert shown when max tags reached
```

---

## S-34: No Co-Guardian Message Visibility

```
TASK: Allow co-guardians to see messages about shared children

CONTEXT:
When parents share custody, only the guardian who initiated messaging sees the thread with the coach.

FILE: services/messaging-service.ts
LINES: ~121-176

REQUIRED CHANGES:

1. Add co-guardian resolution to thread participants:
```typescript
async createThread(params: CreateThreadParams): Promise<Result<Thread, ServiceError>> {
  const { participantIds, childId, context } = params;

  // If thread involves a child, include all guardians
  let allParticipants = [...participantIds];

  if (childId) {
    const guardiansResult = await familyService.getGuardiansForChild(childId);

    if (guardiansResult.success) {
      const guardianIds = guardiansResult.data.map(g => g.id);
      // Add guardians who aren't already participants
      guardianIds.forEach(id => {
        if (!allParticipants.includes(id)) {
          allParticipants.push(id);
        }
      });

      logger.info('Co-guardians added to thread', {
        childId,
        originalParticipants: participantIds.length,
        totalParticipants: allParticipants.length,
      });
    }
  }

  const thread: Thread = {
    id: generateId(),
    participantIds: allParticipants,
    childId,
    context,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.THREAD_PREFIX}${thread.id}`;
  await apiClient.set(key, thread);

  return ok(thread);
}
```

2. Add helper method in family service:
```typescript
// In services/family/family-service.ts
async getGuardiansForChild(childId: string): Promise<Result<Guardian[], ServiceError>> {
  const key = `${STORAGE_KEYS.CHILD_PREFIX}${childId}`;
  const child = await apiClient.get<ChildProfile>(key);

  if (!child) {
    return err({
      code: 'NOT_FOUND',
      message: 'Child not found',
    });
  }

  const guardians: Guardian[] = [];

  // Primary guardian
  if (child.primaryGuardianId) {
    const guardianResult = await userService.getUser(child.primaryGuardianId);
    if (guardianResult.success) {
      guardians.push({
        id: guardianResult.data.id,
        name: guardianResult.data.name,
        relationship: 'primary_guardian',
      });
    }
  }

  // Co-guardians
  if (child.coGuardianIds && child.coGuardianIds.length > 0) {
    for (const coGuardianId of child.coGuardianIds) {
      const guardianResult = await userService.getUser(coGuardianId);
      if (guardianResult.success) {
        guardians.push({
          id: guardianResult.data.id,
          name: guardianResult.data.name,
          relationship: 'co_guardian',
        });
      }
    }
  }

  return ok(guardians);
}
```

3. Update ChildProfile type:
```typescript
// In types or constants
interface ChildProfile {
  id: string;
  name: string;
  primaryGuardianId: string;
  coGuardianIds?: string[]; // New field
  // ... other fields
}
```

4. Add UI to show co-guardian access:
```typescript
// In thread header or message screen
{thread.childId && (
  <Column style={{
    padding: Spacing.sm,
    backgroundColor: colors.infoBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons name="people" size={16} color={colors.info} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.small} color="info">
        Visible to all guardians of {childName}
      </ThemedText>
    </Row>
  </Column>
)}
```

5. Add to sharing settings:
```typescript
// In app/settings or child profile
<Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
  <Column style={{ flex: 1 }}>
    <ThemedText style={Typography.body}>Share messages with co-guardians</ThemedText>
    <ThemedText style={Typography.small} color="secondary">
      All guardians can see coach communication
    </ThemedText>
  </Column>
  <Switch
    value={shareMessagesWithCoGuardians}
    onValueChange={setShareMessagesWithCoGuardians}
  />
</Row>
```

ACCEPTANCE CRITERIA:
✅ createThread adds all guardians as participants when childId present
✅ getGuardiansForChild returns primary + co-guardians
✅ Co-guardians see all messages about shared children
✅ UI indicates message visibility to co-guardians
✅ Setting to control co-guardian visibility
✅ Message count includes co-guardian threads
```

---

## S-36: Coaches Join Parent Groups

```
TASK: Add approval workflow for coaches joining parent groups

CONTEXT:
Coaches can join any community group including parent-only support groups, creating inappropriate dynamics.

FILE: services/community/community-group-service.ts
LINES: ~321-382

REQUIRED CHANGES:

1. Add group type and coach approval requirement:
```typescript
interface CommunityGroup {
  id: string;
  name: string;
  type: 'open' | 'parent_only' | 'coach_only' | 'mixed';
  requiresApproval: boolean;
  adminIds: string[];
  memberIds: string[];
  pendingMemberIds?: string[];
  // ... other fields
}

async joinGroup(groupId: string, userId: string, userRole: 'coach' | 'parent' | 'athlete'): Promise<Result<CommunityGroup, ServiceError>> {
  const groupResult = await this.getGroup(groupId);

  if (!groupResult.success) {
    return err(groupResult.error);
  }

  const group = groupResult.data;

  // Check if coach trying to join parent-only group
  if (group.type === 'parent_only' && userRole === 'coach') {
    logger.warn('Coach attempted to join parent-only group', {
      groupId,
      userId,
    });

    // Add to pending instead
    group.pendingMemberIds = group.pendingMemberIds || [];
    if (!group.pendingMemberIds.includes(userId)) {
      group.pendingMemberIds.push(userId);
    }

    await this.updateGroup(groupId, group);

    // Notify admins
    group.adminIds.forEach(adminId => {
      emitTyped('GROUP_JOIN_REQUEST', {
        groupId,
        requesterId: userId,
        requesterRole: userRole,
        adminId,
      });
    });

    return err({
      code: 'CONFLICT',
      message: 'Your request to join this group has been sent to the administrators for approval',
    });
  }

  // Check if parent trying to join coach-only group
  if (group.type === 'coach_only' && userRole !== 'coach') {
    return err({
      code: 'UNAUTHORIZED',
      message: 'This group is for coaches only',
    });
  }

  // For open or mixed groups, or matching type
  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
    await this.updateGroup(groupId, group);

    emitTyped('GROUP_MEMBER_JOINED', {
      groupId,
      userId,
      userRole,
    });
  }

  return ok(group);
}
```

2. Add approval functions:
```typescript
async approveGroupMember(groupId: string, userId: string, approverId: string): Promise<Result<CommunityGroup, ServiceError>> {
  const groupResult = await this.getGroup(groupId);

  if (!groupResult.success) {
    return err(groupResult.error);
  }

  const group = groupResult.data;

  // Verify approver is admin
  if (!group.adminIds.includes(approverId)) {
    return err({
      code: 'UNAUTHORIZED',
      message: 'Only group administrators can approve members',
    });
  }

  // Move from pending to members
  group.pendingMemberIds = group.pendingMemberIds?.filter(id => id !== userId) || [];
  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
  }

  await this.updateGroup(groupId, group);

  logger.info('Group member approved', { groupId, userId, approverId });

  emitTyped('GROUP_MEMBER_APPROVED', {
    groupId,
    userId,
    approverId,
  });

  return ok(group);
}

async rejectGroupMember(groupId: string, userId: string, rejectorId: string, reason?: string): Promise<Result<void, ServiceError>> {
  const groupResult = await this.getGroup(groupId);

  if (!groupResult.success) {
    return err(groupResult.error);
  }

  const group = groupResult.data;

  // Verify rejector is admin
  if (!group.adminIds.includes(rejectorId)) {
    return err({
      code: 'UNAUTHORIZED',
      message: 'Only group administrators can reject members',
    });
  }

  // Remove from pending
  group.pendingMemberIds = group.pendingMemberIds?.filter(id => id !== userId) || [];
  await this.updateGroup(groupId, group);

  logger.info('Group member rejected', { groupId, userId, rejectorId, reason });

  emitTyped('GROUP_MEMBER_REJECTED', {
    groupId,
    userId,
    rejectorId,
    reason,
  });

  return ok(undefined);
}
```

3. Add UI for pending approvals:
```typescript
// In group admin screen
const [pendingMembers, setPendingMembers] = useState<User[]>([]);

useEffect(() => {
  loadPendingMembers();
}, [group.pendingMemberIds]);

const loadPendingMembers = async () => {
  if (!group.pendingMemberIds || group.pendingMemberIds.length === 0) {
    setPendingMembers([]);
    return;
  }

  const users = await Promise.all(
    group.pendingMemberIds.map(id => userService.getUser(id))
  );

  setPendingMembers(users.filter(r => r.success).map(r => r.data));
};

{pendingMembers.length > 0 && (
  <Column style={{ marginBottom: Spacing.lg }}>
    <SectionHeader
      title="Pending Approvals"
      subtitle={`${pendingMembers.length} request${pendingMembers.length === 1 ? '' : 's'}`}
      icon="hourglass"
    />

    {pendingMembers.map(user => (
      <SurfaceCard key={user.id} style={{ marginBottom: Spacing.sm }}>
        <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Row style={{ alignItems: 'center', flex: 1 }}>
            <Avatar uri={user.profileImage} size={40} />
            <Spacer width={Spacing.sm} />
            <Column>
              <ThemedText style={Typography.body}>{user.name}</ThemedText>
              <Badge
                text={user.roles?.includes('coach') ? 'Coach' : 'Parent'}
                variant={user.roles?.includes('coach') ? 'warning' : 'default'}
              />
            </Column>
          </Row>

          <Row style={{ gap: Spacing.xs }}>
            <Button
              title="Approve"
              onPress={() => handleApprove(user.id)}
              variant="primary"
              size="compact"
            />
            <Button
              title="Reject"
              onPress={() => handleReject(user.id)}
              variant="secondary"
              size="compact"
            />
          </Row>
        </Row>
      </SurfaceCard>
    ))}
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ Groups have type field (open/parent_only/coach_only/mixed)
✅ Coaches joining parent_only groups moved to pending
✅ Admins notified of join requests
✅ approveGroupMember and rejectGroupMember functions
✅ UI shows pending members to admins
✅ Approve/Reject buttons functional
✅ Events emitted for all approval actions
```

---

## S-37: Group Messaging No Age Verification

```
TASK: Flag groups with minors and require parental approval

CONTEXT:
Community groups allow messaging between coaches and minors without parental oversight.

FILE: services/community/community-messaging-service.ts
LINES: ~82-134

REQUIRED CHANGES:

1. Add minor detection and flagging:
```typescript
async createGroupMessage(
  groupId: string,
  senderId: string,
  content: string
): Promise<Result<GroupMessage, ServiceError>> {

  // Get group members
  const groupResult = await communityGroupService.getGroup(groupId);

  if (!groupResult.success) {
    return err(groupResult.error);
  }

  const group = groupResult.data;

  // Check if group contains minors
  const hasMinors = await this.groupContainsMinors(group.memberIds);

  if (hasMinors) {
    // Check if sender is coach
    const senderResult = await userService.getUser(senderId);

    if (senderResult.success && senderResult.data.roles?.includes('coach')) {
      // Log coach-to-minor group messaging
      logger.info('Coach messaging in group with minors', {
        groupId,
        senderId,
        hasMinors: true,
      });

      // Future: could require parental notification
    }
  }

  const message: GroupMessage = {
    id: generateId(),
    groupId,
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.GROUP_MESSAGE_PREFIX}${message.id}`;
  await apiClient.set(key, message);

  return ok(message);
}

private async groupContainsMinors(memberIds: string[]): Promise<boolean> {
  // NOTE: Import calculateAge from a shared utility or define locally:
  // import { calculateAge } from '@/utils/date-utils';
  // If no shared util exists, compute inline:
  // const calculateAge = (dob: Date) => {
  //   const diff = Date.now() - dob.getTime();
  //   return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  // };

  const users = await Promise.all(
    memberIds.map(id => userService.getUser(id))
  );

  return users.some(result => {
    if (!result.success || !result.data.dateOfBirth) return false;

    const age = calculateAge(new Date(result.data.dateOfBirth));
    return age < 18;
  });
}
```

2. Add parental approval requirement:
```typescript
async requestParentalApprovalForGroup(
  groupId: string,
  minorId: string
): Promise<Result<ApprovalRequest, ServiceError>> {

  // Get minor's guardians
  const guardiansResult = await familyService.getGuardiansForChild(minorId);

  if (!guardiansResult.success) {
    return err(guardiansResult.error);
  }

  const approvalRequest: ApprovalRequest = {
    id: generateId(),
    groupId,
    minorId,
    guardianIds: guardiansResult.data.map(g => g.id),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.GROUP_APPROVAL_PREFIX}${approvalRequest.id}`;
  await apiClient.set(key, approvalRequest);

  // Notify guardians
  guardiansResult.data.forEach(guardian => {
    emitTyped('GROUP_APPROVAL_REQUESTED', {
      approvalRequestId: approvalRequest.id,
      groupId,
      minorId,
      guardianId: guardian.id,
    });
  });

  return ok(approvalRequest);
}
```

3. Add UI warning for groups with minors:
```typescript
// In group header or message screen
{groupContainsMinors && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.warningBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons name="shield-checkmark" size={20} color={colors.warning} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.subheading} color="warning">
        Group Contains Minors
      </ThemedText>
    </Row>
    <ThemedText style={Typography.small} color="warning">
      This group includes members under 18. Please keep all communication appropriate and professional.
    </ThemedText>
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ groupContainsMinors helper checks member ages
✅ Coach messages in minor groups logged
✅ Parental approval request function
✅ Guardians notified via GROUP_APPROVAL_REQUESTED event
✅ UI shows warning banner in groups with minors
✅ Storage keys added for approval requests
```

---

## S-38: Squad Member Names Visible to All

```
TASK: Show "First L." format to parents, full names to coaches

CONTEXT:
Squad member lists show full names to all users, including other parents who may not know the children.

FILE: components/squad/squad-members-card.tsx
LINES: ~64-105

REQUIRED CHANGES:

1. Add privacy formatting function:
```typescript
const formatNameForPrivacy = (name: string, viewerRole: 'coach' | 'parent' | 'athlete'): string => {
  if (viewerRole === 'coach') {
    return name; // Coaches see full names
  }

  // Parents and athletes see "First L."
  const parts = name.split(' ');
  if (parts.length === 0) return name;

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};
```

2. Update member list rendering:
```typescript
const SquadMemberCard = ({ member, viewerRole }) => {
  const displayName = formatNameForPrivacy(member.name, viewerRole);

  return (
    <Row style={{
      padding: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radii.sm,
      alignItems: 'center',
    }}>
      <Avatar uri={member.profileImage} size={40} />
      <Spacer width={Spacing.sm} />
      <Column style={{ flex: 1 }}>
        <ThemedText style={Typography.body}>
          {displayName}
        </ThemedText>
        {member.position && (
          <ThemedText style={Typography.small} color="secondary">
            {member.position}
          </ThemedText>
        )}
      </Column>
    </Row>
  );
};
```

3. Add privacy notice:
```typescript
{viewerRole === 'parent' && (
  <Column style={{
    padding: Spacing.sm,
    backgroundColor: colors.infoBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons name="eye-off" size={16} color={colors.info} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.small} color="info">
        Names shown as "First L." for privacy
      </ThemedText>
    </Row>
  </Column>
)}
```

4. Exception for own children:

**IMPORTANT**: Do NOT call async functions inside render or inside sync helper
functions used in render. Pre-compute the "own children" set in a `useEffect`
and pass it as a parameter to the pure formatting function.

```typescript
// Pre-compute own child IDs in the component
const [ownChildIds, setOwnChildIds] = useState<Set<string>>(new Set());

useEffect(() => {
  const loadOwnChildren = async () => {
    if (!currentUser || currentUser.role !== 'parent') return;
    const familyResult = await familyService.getFamilyMembers(currentUser.id);
    if (familyResult.success) {
      setOwnChildIds(new Set(familyResult.data.map(m => m.id)));
    }
  };
  loadOwnChildren();
}, [currentUser?.id]);

// Pure sync function -- safe to call in render
const formatNameForPrivacy = (
  name: string,
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
  ownChildren: Set<string>
): string => {
  if (viewerRole === 'coach') {
    return name; // Coaches see full names
  }

  // Parents see their own children's full names
  if (ownChildren.has(athleteId)) {
    return name;
  }

  // Other children: show "First L."
  const parts = name.split(' ');
  if (parts.length === 0) return name;

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};

// Usage in render:
// const displayName = formatNameForPrivacy(member.name, member.id, viewerRole, ownChildIds);
```

ACCEPTANCE CRITERIA:
✅ Coaches see full member names
✅ Parents see "First L." for other children
✅ Parents see full names for own children
✅ formatNameForPrivacy helper function
✅ Privacy notice shown to parents
✅ Athlete profile images still visible
```

---

## S-39: Session Location Visible to Non-Participants

```
TASK: Hide full address from non-confirmed participants

CONTEXT:
Session location shows full address to everyone viewing the session, including users who haven't been confirmed.

FILE: components/bookings/booking-info-cards.tsx
LINES: ~66-103

REQUIRED CHANGES:

1. Add participation check:
```typescript
const LocationCard = ({ session, viewerId }) => {
  const [canViewFullAddress, setCanViewFullAddress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkViewerParticipation();
  }, [session.id, viewerId]);

  const checkViewerParticipation = async () => {
    // Check if viewer is coach
    if (viewerId === session.coachId) {
      setCanViewFullAddress(true);
      setLoading(false);
      return;
    }

    // Check if viewer is confirmed participant
    const booking = await bookingService.getBookingForSession(session.id, viewerId);

    if (booking.success && booking.data.status === 'confirmed') {
      setCanViewFullAddress(true);
    } else {
      setCanViewFullAddress(false);
    }

    setLoading(false);
  };

  if (loading) {
    return <Skeleton width="100%" height={80} />;
  }

  return (
    <SurfaceCard>
      <Row style={{ alignItems: 'center' }}>
        <Ionicons name="location" size={24} color={colors.primary} />
        <Spacer width={Spacing.sm} />
        <Column style={{ flex: 1 }}>
          <ThemedText style={Typography.subheading}>Location</ThemedText>

          {canViewFullAddress ? (
            <ThemedText style={Typography.body} color="secondary">
              {session.location.fullAddress}
            </ThemedText>
          ) : (
            <ThemedText style={Typography.body} color="secondary">
              {session.location.area || 'Location shared after confirmation'}
            </ThemedText>
          )}

          {!canViewFullAddress && (
            <Row style={{ alignItems: 'center', marginTop: Spacing.xs }}>
              <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
              <Spacer width={Spacing.xxs} />
              <ThemedText style={Typography.small} color="secondary">
                Full address shown after booking confirmed
              </ThemedText>
            </Row>
          )}
        </Column>
      </Row>
    </SurfaceCard>
  );
};
```

2. Update Location type to include area:
```typescript
interface SessionLocation {
  fullAddress: string; // "123 Main St, City, AB1 2CD"
  area: string; // "City Centre" or "AB1" (postcode area)
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
```

3. Add area extraction helper:
```typescript
const extractAreaFromAddress = (fullAddress: string): string => {
  // Extract postcode area (first part before space)
  const postcodeMatch = fullAddress.match(/([A-Z]{1,2}\d{1,2})\s?\d[A-Z]{2}/i);

  if (postcodeMatch) {
    return postcodeMatch[1]; // e.g., "AB1"
  }

  // Fallback: use city/town name
  const parts = fullAddress.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim(); // Second to last part (usually city)
  }

  return 'Location provided after booking';
};
```

ACCEPTANCE CRITERIA:
✅ Coach sees full address always
✅ Confirmed participants see full address
✅ Non-confirmed users see area only
✅ Location type includes area field
✅ extractAreaFromAddress helper extracts postcode area
✅ Clear message: "Full address shown after confirmation"
✅ Lock icon indicates restricted access
```

---

## S-40: Location Picker No Privacy Warning

```
TASK: Alert before sharing exact GPS coordinates

CONTEXT:
Location picker allows sharing exact GPS without warning about privacy implications.

FILE: components/location/add-location-picker.native.tsx
LINES: ~531-539

REQUIRED CHANGES:

1. Add privacy confirmation before GPS share:
```typescript
const handleUseCurrentLocation = async () => {
  // Show privacy alert first
  Alert.alert(
    'Share Precise Location?',
    'This will share your exact GPS coordinates. For privacy, consider:\n\n• Using a nearby landmark instead\n• Sharing general area only\n• Using venue name if public facility\n\nDo you want to share your precise location?',
    [
      {
        text: 'Use General Area',
        onPress: () => handleUseGeneralArea(),
      },
      {
        text: 'Share Precise Location',
        style: 'destructive',
        onPress: () => proceedWithGPS(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
};

const proceedWithGPS = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Location permission is required to use GPS');
    return;
  }

  const location = await Location.getCurrentPositionAsync({});

  setSelectedLocation({
    fullAddress: 'Current Location',
    coordinates: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    area: 'Current Area',
    isPrecise: true, // Flag for precise GPS
  });

  logger.info('Precise GPS location shared', {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });
};

const handleUseGeneralArea = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Location permission is required');
    return;
  }

  const location = await Location.getCurrentPositionAsync({});

  // Round coordinates to ~1km accuracy
  const roundedLat = Math.round(location.coords.latitude * 100) / 100;
  const roundedLng = Math.round(location.coords.longitude * 100) / 100;

  setSelectedLocation({
    fullAddress: 'General Area',
    coordinates: {
      latitude: roundedLat,
      longitude: roundedLng,
    },
    area: 'General Area',
    isPrecise: false,
  });

  logger.info('General area location shared', {
    precision: '~1km',
  });
};
```

2. Add visual indicator for precise vs general:
```typescript
{selectedLocation && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: selectedLocation.isPrecise ? colors.warningBackground : colors.successBackground,
    borderRadius: Radii.sm,
    marginTop: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons
        name={selectedLocation.isPrecise ? "warning" : "checkmark-circle"}
        size={20}
        color={selectedLocation.isPrecise ? colors.warning : colors.success}
      />
      <Spacer width={Spacing.xs} />
      <ThemedText
        style={Typography.subheading}
        color={selectedLocation.isPrecise ? "warning" : "success"}
      >
        {selectedLocation.isPrecise ? 'Precise GPS Location' : 'General Area (~1km)'}
      </ThemedText>
    </Row>

    {selectedLocation.isPrecise && (
      <ThemedText style={[Typography.small, { marginTop: Spacing.xs }]} color="warning">
        Your exact coordinates will be shared with participants
      </ThemedText>
    )}
  </Column>
)}
```

3. Add location type options:
```typescript
const LocationTypeSelector = ({ onSelect }) => (
  <Column style={{ gap: Spacing.sm }}>
    <ThemedText style={Typography.subheading}>How specific?</ThemedText>

    <Clickable onPress={() => onSelect('venue')}>
      <SurfaceCard>
        <Row style={{ alignItems: 'center' }}>
          <Ionicons name="business" size={24} color={colors.primary} />
          <Spacer width={Spacing.sm} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.body}>Venue Name</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              e.g., "City Sports Centre" (recommended for public facilities)
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>
    </Clickable>

    <Clickable onPress={() => onSelect('area')}>
      <SurfaceCard>
        <Row style={{ alignItems: 'center' }}>
          <Ionicons name="locate" size={24} color={colors.primary} />
          <Spacer width={Spacing.sm} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.body}>General Area</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              ~1km radius (good balance of privacy and clarity)
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>
    </Clickable>

    <Clickable onPress={() => onSelect('precise')}>
      <SurfaceCard style={{ backgroundColor: colors.warningBackground }}>
        <Row style={{ alignItems: 'center' }}>
          <Ionicons name="pin" size={24} color={colors.warning} />
          <Spacer width={Spacing.sm} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.body}>Precise GPS</ThemedText>
            <ThemedText style={Typography.small} color="warning">
              Exact coordinates (use only if necessary)
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>
    </Clickable>
  </Column>
);
```

ACCEPTANCE CRITERIA:
✅ Privacy alert shown before GPS share
✅ Options: precise, general area, venue name
✅ General area rounds to ~1km accuracy
✅ isPrecise flag added to location type
✅ Visual indicator shows precision level
✅ Warning shown for precise GPS
✅ Recommended option (venue/area) highlighted
```

---

## S-45: Location Permission No Recovery

```
TASK: Add "Open Settings" button for denied location permission

CONTEXT:
When location permission denied, user sees error but no way to fix it.

FILE: components/location/add-location-picker.native.tsx
LINES: ~194-197

REQUIRED CHANGES:

1. Add permission recovery flow:
```typescript
import { Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const [permissionDenied, setPermissionDenied] = useState(false);

const handleUseCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status === 'denied') {
    setPermissionDenied(true);
    return;
  }

  if (status === 'granted') {
    setPermissionDenied(false);
    // Proceed with location fetch...
  }
};

const handleOpenSettings = async () => {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
  } else if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
    );
  }
};
```

2. Add permission denied UI:
```typescript
{permissionDenied && (
  <Column style={{
    padding: Spacing.lg,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.card,
    borderWidth: 2,
    borderColor: colors.error,
    marginVertical: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
      <Ionicons name="location-off" size={32} color={colors.error} />
      <Spacer width={Spacing.sm} />
      <ThemedText style={Typography.heading} color="error">
        Location Permission Denied
      </ThemedText>
    </Row>

    <ThemedText style={Typography.body}>
      To use your current location, please enable location access in your device settings.
    </ThemedText>

    <Spacer height={Spacing.md} />

    <Button
      title="Open Settings"
      onPress={handleOpenSettings}
      variant="primary"
      leftIcon="settings"
    />

    <Spacer height={Spacing.sm} />

    <Button
      title="Enter Address Manually"
      onPress={() => setPermissionDenied(false)}
      variant="secondary"
    />
  </Column>
)}
```

3. Add permission status check on mount:
```typescript
useEffect(() => {
  checkLocationPermission();
}, []);

const checkLocationPermission = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();

  if (status === 'denied') {
    setPermissionDenied(true);
  }
};
```

4. Add helpful tips:
```typescript
<Column style={{
  padding: Spacing.md,
  backgroundColor: colors.infoBackground,
  borderRadius: Radii.sm,
  marginTop: Spacing.md,
}}>
  <ThemedText style={Typography.small} color="secondary">
    To enable location access:
  </ThemedText>

  {Platform.OS === 'ios' ? (
    <Column style={{ marginTop: Spacing.xs, gap: Spacing.xxs }}>
      <ThemedText style={Typography.small} color="secondary">
        1. Open Settings
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        2. Scroll to Clubroom
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        3. Tap Location
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        4. Select "While Using the App"
      </ThemedText>
    </Column>
  ) : (
    <Column style={{ marginTop: Spacing.xs, gap: Spacing.xxs }}>
      <ThemedText style={Typography.small} color="secondary">
        1. Open Settings
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        2. Tap Apps → Clubroom
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        3. Tap Permissions → Location
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        4. Select "Allow only while using the app"
      </ThemedText>
    </Column>
  )}
</Column>
```

ACCEPTANCE CRITERIA:
✅ Permission status checked on mount
✅ "Open Settings" button shown when denied
✅ iOS opens app-settings URL
✅ Android opens location settings intent
✅ Manual address entry option available
✅ Platform-specific instructions shown
✅ Permission re-checked after settings return
```

---

## S-46: Video Upload No Consent Check

```
TASK: Check VIDEO consent before upload

CONTEXT:
Video upload doesn't check if athlete's parent has granted video consent.

FILE: components/video/video-upload-sections.tsx
LINES: ~56-92

REQUIRED CHANGES:

1. Add consent check before upload:
```typescript
const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
const [consentStatus, setConsentStatus] = useState<Record<string, boolean>>({});

useEffect(() => {
  if (selectedAthletes.length > 0) {
    checkConsents();
  }
}, [selectedAthletes]);

const checkConsents = async () => {
  const checks = await Promise.all(
    selectedAthletes.map(async (athleteId) => {
      const result = await consentService.hasConsent(
        athleteId,
        'PHOTO_VIDEO',
        currentUserId
      );
      return { athleteId, hasConsent: result.success && result.data };
    })
  );

  const statusMap: Record<string, boolean> = {};
  checks.forEach(check => {
    statusMap[check.athleteId] = check.hasConsent;
  });
  setConsentStatus(statusMap);
};

const handleUpload = async () => {
  // Validate all athletes have consent
  const athletesWithoutConsent = selectedAthletes.filter(
    id => !consentStatus[id]
  );

  if (athletesWithoutConsent.length > 0) {
    const names = await getAthleteNames(athletesWithoutConsent);

    Alert.alert(
      'Video Consent Required',
      `The following athletes don't have video consent:\n\n${names.join('\n')}\n\nPlease request consent from their parents before uploading videos.`,
      [{ text: 'OK' }]
    );
    return;
  }

  // Proceed with upload
  const uploadResult = await videoService.uploadVideo({
    uri: videoUri,
    athleteIds: selectedAthletes,
    title,
    description,
  });

  if (uploadResult.success) {
    router.back();
  }
};
```

2. Add visual consent indicators:
```typescript
{selectedAthletes.map(athleteId => {
  const hasConsent = consentStatus[athleteId];

  return (
    <Row
      key={athleteId}
      style={{
        padding: Spacing.sm,
        backgroundColor: hasConsent === false ? colors.errorBackground : colors.surface,
        borderRadius: Radii.sm,
        marginBottom: Spacing.xs,
        alignItems: 'center',
      }}
    >
      <Avatar athleteId={athleteId} size={32} />
      <Spacer width={Spacing.sm} />
      <Column style={{ flex: 1 }}>
        <ThemedText style={Typography.body}>
          {getAthleteName(athleteId)}
        </ThemedText>
        {hasConsent === false && (
          <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Spacer width={Spacing.xxs} />
            <ThemedText style={Typography.caption} color="error">
              No video consent
            </ThemedText>
          </Row>
        )}
        {hasConsent === true && (
          <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Spacer width={Spacing.xxs} />
            <ThemedText style={Typography.caption} color="success">
              Consent granted
            </ThemedText>
          </Row>
        )}
      </Column>

      <Clickable onPress={() => removeAthlete(athleteId)}>
        <Ionicons name="close-circle" size={24} color={colors.error} />
      </Clickable>
    </Row>
  );
})}
```

ACCEPTANCE CRITERIA:
✅ PHOTO_VIDEO consent checked for all tagged athletes
✅ Upload blocked if any athlete lacks consent
✅ Alert shows athlete names without consent
✅ Visual indicators show consent status per athlete
✅ Athletes without consent highlighted in red
✅ Athletes with consent shown with checkmark
```

---

## S-47: Attachment Sending No Content Scanning

```
TASK: Validate file types and add size limit to message attachments

CONTEXT:
Messaging allows any file type with no size validation, risking inappropriate or malicious files.

FILE: services/messaging-service.ts
LINES: ~121-176

REQUIRED CHANGES:

1. Add attachment validation:
```typescript
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async validateAttachment(attachment: MessageAttachment): Promise<Result<boolean, ServiceError>> {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(attachment.type)) {
    logger.warn('Invalid file type rejected', {
      type: attachment.type,
      fileName: attachment.name,
    });

    return err({
      code: 'VALIDATION',
      message: 'File type not allowed. Supported: images, videos, PDFs',
    });
  }

  // Check file size
  if (attachment.size > MAX_FILE_SIZE) {
    logger.warn('File too large rejected', {
      size: attachment.size,
      fileName: attachment.name,
    });

    return err({
      code: 'VALIDATION',
      message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    });
  }

  return ok(true);
}

async sendMessage(
  threadId: string,
  senderId: string,
  content: string,
  attachments?: MessageAttachment[]
): Promise<Result<Message, ServiceError>> {

  // Validate attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      const validationResult = await this.validateAttachment(attachment);

      if (!validationResult.success) {
        return err(validationResult.error);
      }
    }

    // Limit number of attachments
    if (attachments.length > 5) {
      return err({
        code: 'VALIDATION',
        message: 'Maximum 5 attachments per message',
      });
    }
  }

  // Continue with message creation...
}
```

2. Add UI file picker with validation:
```typescript
const handleSelectAttachment = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'video/*', 'application/pdf'],
    copyToCacheDirectory: true,
  });

  if (result.type === 'cancel') return;

  // Validate file
  const attachment: MessageAttachment = {
    uri: result.uri,
    name: result.name,
    type: result.mimeType || 'application/octet-stream',
    size: result.size || 0,
  };

  const validationResult = await messagingService.validateAttachment(attachment);

  if (!validationResult.success) {
    Alert.alert('Invalid File', validationResult.error.message, [{ text: 'OK' }]);
    return;
  }

  setAttachments([...attachments, attachment]);
};
```

3. Add attachment preview with size:
```typescript
{attachments.map((attachment, index) => (
  <Row
    key={index}
    style={{
      padding: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radii.sm,
      marginBottom: Spacing.xs,
      alignItems: 'center',
    }}
  >
    <Ionicons
      name={getFileIcon(attachment.type)}
      size={24}
      color={colors.primary}
    />
    <Spacer width={Spacing.sm} />
    <Column style={{ flex: 1 }}>
      <ThemedText style={Typography.body} numberOfLines={1}>
        {attachment.name}
      </ThemedText>
      <ThemedText style={Typography.small} color="secondary">
        {formatFileSize(attachment.size)}
      </ThemedText>
    </Column>
    <Clickable onPress={() => removeAttachment(index)}>
      <Ionicons name="close-circle" size={24} color={colors.error} />
    </Clickable>
  </Row>
))}
```

4. Add helper functions:
```typescript
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getFileIcon = (type: string): string => {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'videocam';
  if (type === 'application/pdf') return 'document-text';
  return 'attach';
};
```

ACCEPTANCE CRITERIA:
✅ ALLOWED_FILE_TYPES whitelist enforced
✅ MAX_FILE_SIZE limit enforced (10MB)
✅ Maximum 5 attachments per message
✅ Validation errors shown to user
✅ File picker restricted to allowed types
✅ Attachment preview shows file size
✅ Invalid files rejected with clear message
```

---

## S-48: No Data Retention Policy

```
TASK: Auto-archive athlete data 90 days after last session

CONTEXT:
Athlete data persists indefinitely even after coaching relationship ends, violating data minimization principles.

FILE: services/safety-service.ts

REQUIRED CHANGES:

1. Add data retention check function:
```typescript
async checkDataRetention(): Promise<void> {
  logger.info('Checking data retention policy');

  const allKeys = await apiClient.getAllKeys();
  const athleteKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.CHILD_PREFIX));

  const now = new Date();
  const retentionDays = 90;
  let archivedCount = 0;

  for (const key of athleteKeys) {
    const athlete = await apiClient.get<ChildProfile>(key);

    if (!athlete) continue;

    // Find last session date
    const lastSessionDate = await this.getLastSessionDate(athlete.id);

    if (!lastSessionDate) continue;

    const daysSinceLastSession = Math.ceil(
      (now.getTime() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSession > retentionDays) {
      // Archive athlete data
      await this.archiveAthleteData(athlete.id);
      archivedCount++;

      logger.info('Athlete data archived', {
        athleteId: athlete.id,
        lastSessionDate,
        daysSinceLastSession,
      });
    }
  }

  logger.info('Data retention check complete', { archivedCount });
}

private async getLastSessionDate(athleteId: string): Promise<string | null> {
  // Find most recent session for athlete
  const allKeys = await apiClient.getAllKeys();
  const sessionKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.SESSION_PREFIX));

  let latestDate: string | null = null;

  for (const key of sessionKeys) {
    const session = await apiClient.get<Session>(key);

    if (session && session.athleteId === athleteId) {
      if (!latestDate || new Date(session.endTime) > new Date(latestDate)) {
        latestDate = session.endTime;
      }
    }
  }

  return latestDate;
}

private async archiveAthleteData(athleteId: string): Promise<void> {
  // Move data to archive storage
  const archiveKey = `${STORAGE_KEYS.ARCHIVE_PREFIX}${athleteId}_${Date.now()}`;

  // Collect all athlete data
  const athleteData = {
    profile: await apiClient.get(`${STORAGE_KEYS.CHILD_PREFIX}${athleteId}`),
    emergency: await apiClient.get(`${STORAGE_KEYS.EMERGENCY_CONTACTS_PREFIX}${athleteId}`),
    progress: await apiClient.get(`${STORAGE_KEYS.PROGRESS_PREFIX}${athleteId}`),
    archivedAt: new Date().toISOString(),
    reason: 'data_retention_policy',
  };

  // Save to archive
  await apiClient.set(archiveKey, athleteData);

  // Soft-delete from active storage (add archivedAt timestamp rather than hard-deleting)
  // This allows recovery if needed
  const profile = await apiClient.get(`${STORAGE_KEYS.CHILD_PREFIX}${athleteId}`);
  if (profile) {
    await apiClient.set(`${STORAGE_KEYS.CHILD_PREFIX}${athleteId}`, {
      ...profile,
      archivedAt: new Date().toISOString(),
      isArchived: true,
    });
  }

  // Emit event
  emitTyped('ATHLETE_DATA_ARCHIVED', {
    athleteId,
    archivedAt: athleteData.archivedAt,
    archiveKey,
  });
}
```

2. Add notification before archival:
```typescript
async sendRetentionWarnings(): Promise<void> {
  const allKeys = await apiClient.getAllKeys();
  const athleteKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.CHILD_PREFIX));

  const now = new Date();
  const warningDays = [60, 75]; // Days before 90-day archival

  for (const key of athleteKeys) {
    const athlete = await apiClient.get<ChildProfile>(key);
    if (!athlete) continue;

    const lastSessionDate = await this.getLastSessionDate(athlete.id);
    if (!lastSessionDate) continue;

    const daysSinceLastSession = Math.ceil(
      (now.getTime() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (warningDays.includes(daysSinceLastSession)) {
      const daysRemaining = 90 - daysSinceLastSession;

      emitTyped('DATA_RETENTION_WARNING', {
        athleteId: athlete.id,
        parentId: athlete.primaryGuardianId,
        daysRemaining,
        lastSessionDate,
      });

      logger.warn('Data retention warning sent', {
        athleteId: athlete.id,
        daysRemaining,
      });
    }
  }
}
```

3. Add UI notification:
```typescript
// In parent dashboard or notifications
useEffect(() => {
  const unsubscribe = onTyped('DATA_RETENTION_WARNING', ({ athleteId, daysRemaining }) => {
    Alert.alert(
      'Data Retention Notice',
      `Your child's data will be archived in ${daysRemaining} days due to inactivity. To keep data active, book a new session or export your data.`,
      [
        { text: 'Export Data', onPress: () => handleExportData(athleteId) },
        { text: 'Book Session', onPress: () => router.push('/discover') },
        { text: 'Dismiss', style: 'cancel' },
      ]
    );
  });

  return unsubscribe;
}, []);
```

4. Add data export function:
```typescript
async exportAthleteData(athleteId: string, parentId: string): Promise<Result<string, ServiceError>> {
  // Verify parent access
  const familyResult = await familyService.getFamilyMembers(parentId);
  if (!familyResult.success || !familyResult.data.some(m => m.id === athleteId)) {
    return err({
      code: 'UNAUTHORIZED',
      message: 'Not authorized to export this data',
    });
  }

  // Collect data
  const exportData = {
    profile: await apiClient.get(`${STORAGE_KEYS.CHILD_PREFIX}${athleteId}`),
    emergency: await apiClient.get(`${STORAGE_KEYS.EMERGENCY_CONTACTS_PREFIX}${athleteId}`),
    progress: await apiClient.get(`${STORAGE_KEYS.PROGRESS_PREFIX}${athleteId}`),
    exportedAt: new Date().toISOString(),
    exportedBy: parentId,
  };

  // Convert to JSON
  const jsonData = JSON.stringify(exportData, null, 2);

  logger.info('Athlete data exported', { athleteId, parentId });

  return ok(jsonData);
}
```

5. Add storage key:
```typescript
// In constants/storage-keys.ts
ARCHIVE_PREFIX: 'archive_',
```

ACCEPTANCE CRITERIA:
✅ checkDataRetention runs daily
✅ Data archived 90 days after last session
✅ Warnings sent at 60 and 75 days
✅ Parents can export data before archival
✅ Archived data moved to separate storage
✅ Active data removed after archival
✅ ATHLETE_DATA_ARCHIVED event emitted
✅ Export includes all athlete data as JSON
```

---

## S-49: Consent Enforcement Zero

```
TASK: Audit and fix all consent enforcement gaps

CONTEXT:
ConsentBadge shows status but many actions don't actually check consent before proceeding.

FILES: Multiple (media upload, post creation, sharing, etc.)

REQUIRED CHANGES:

1. Create consent enforcement audit checklist:
```typescript
// utils/consent-audit.ts
export const CONSENT_CHECKPOINTS = {
  PHOTO_VIDEO: [
    'media-service.ts: saveMedia()',
    'video-upload-sections.tsx: handleUpload()',
    'create-post-form.tsx: handleSubmit()',
    'session-feedback-service.ts: attachMedia()',
  ],
  SOCIAL_MEDIA: [
    'media-service.ts: shareMedia()',
    'social-feed-service.ts: sharePost()',
  ],
  EMERGENCY_TREATMENT: [
    'safety-service.ts: getEmergencyInfo()',
    'session-start: pre-session check',
  ],
  CONTENT_POSTING: [
    'social-feed-service.ts: createPost()',
    'club-post-service.ts: createPost()',
  ],
};

export async function auditConsentEnforcement(): Promise<AuditReport> {
  const results: AuditResult[] = [];

  for (const [consentType, checkpoints] of Object.entries(CONSENT_CHECKPOINTS)) {
    for (const checkpoint of checkpoints) {
      const isEnforced = await checkConsentEnforcement(checkpoint, consentType);
      results.push({ checkpoint, consentType, isEnforced });
    }
  }

  const passed = results.filter(r => r.isEnforced).length;
  const failed = results.filter(r => !r.isEnforced).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}
```

2. Add runtime consent enforcement wrapper:
```typescript
// utils/enforce-consent.ts
export async function withConsentCheck<T>(
  athleteId: string,
  coachId: string,
  consentType: ConsentType,
  action: () => Promise<Result<T, ServiceError>>
): Promise<Result<T, ServiceError>> {

  // Check consent
  const consentResult = await consentService.hasConsent(athleteId, consentType, coachId);

  if (!consentResult.success) {
    logger.error('Consent check failed', { athleteId, coachId, consentType });
    return err({
      code: 'UNKNOWN',
      message: 'Unable to verify consent',
    });
  }

  if (!consentResult.data) {
    logger.warn('Action blocked - consent not granted', {
      athleteId,
      coachId,
      consentType,
    });

    return err({
      code: 'UNAUTHORIZED',
      message: getConsentRequiredMessage(consentType),
    });
  }

  // Consent granted - proceed with action
  return await action();
}

function getConsentRequiredMessage(consentType: ConsentType): string {
  const messages: Record<ConsentType, string> = {
    PHOTO_VIDEO: 'Photo/video consent required from athlete\'s parent',
    SOCIAL_MEDIA: 'Social media sharing consent required',
    EMERGENCY_TREATMENT: 'Emergency treatment consent required',
    CONTENT_POSTING: 'Content posting consent required',
    DATA_PROCESSING: 'Data processing consent required',
  };

  return messages[consentType] || 'Consent required';
}
```

3. Apply wrapper to all consent-required actions:
```typescript
// Example: media-service.ts
async saveMedia(params: SaveMediaParams): Promise<Result<MediaItem, ServiceError>> {
  return withConsentCheck(
    params.athleteId,
    params.coachId,
    'PHOTO_VIDEO',
    async () => {
      // Original saveMedia logic here
      const mediaItem: MediaItem = {
        id: generateId(),
        ...params,
        uploadedAt: new Date().toISOString(),
      };

      await apiClient.set(`${STORAGE_KEYS.MEDIA_PREFIX}${mediaItem.id}`, mediaItem);
      return ok(mediaItem);
    }
  );
}
```

4. Add test coverage for consent enforcement:
```typescript
// __tests__/consent-enforcement.test.ts
describe('Consent Enforcement', () => {
  it('should block media upload without PHOTO_VIDEO consent', async () => {
    const result = await mediaService.saveMedia({
      coachId: 'coach1',
      athleteId: 'athlete1',
      uri: 'file://photo.jpg',
      type: 'photo',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'UNAUTHORIZED');
  });

  it('should block social share without SOCIAL_MEDIA consent', async () => {
    const result = await mediaService.shareMedia('media1', 'athlete1', 'facebook', 'coach1');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'UNAUTHORIZED');
  });

  it('should block post creation without CONTENT_POSTING consent', async () => {
    const result = await socialFeedService.createPost({
      authorId: 'coach1',
      content: 'Great session!',
      taggedAthletes: ['athlete1'],
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'UNAUTHORIZED');
  });
});
```

ACCEPTANCE CRITERIA:
✅ withConsentCheck wrapper created
✅ All PHOTO_VIDEO actions wrapped
✅ All SOCIAL_MEDIA actions wrapped
✅ All CONTENT_POSTING actions wrapped
✅ Test coverage for each consent type
✅ Audit report shows 100% enforcement
✅ ConsentBadge reflects actual enforcement
```

---

## S-51: Safety Checklist Not in Session Start Flow

```
TASK: Integrate SafetyChecklist as mandatory gate before session start

CONTEXT:
SafetyChecklist component exists but isn't integrated as a required step in session start flow.

This is a duplicate of S-31 (which was in Sprint 2). If S-31 is already implemented, this can be marked as complete. Otherwise, refer to S-31 implementation in Sprint 2.

ACCEPTANCE CRITERIA:
✅ See Sprint 2, S-31 for full implementation
✅ SafetyChecklist integrated as gate
✅ Emergency contact + medical consent verified
✅ Session start blocked without passing checks
```

---

## S-52: Safety Theatre Audit

```
TASK: Audit all safeguarding UI and remove non-functional features

CONTEXT:
Multiple safeguarding features show UI but don't actually work: monitoring claims, consent badges that don't enforce, block buttons that aren't checked.

REQUIRED CHANGES:

1. Create safeguarding audit function:

Define ALL referenced helper functions. Each checks whether a safeguarding
feature is actually enforced (not just displayed in UI).

```typescript
// utils/safeguarding-audit.ts
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SafeguardingAudit');

interface AuditCheck {
  feature: string;
  claim: string;
  reality: string;
  isAccurate: boolean;
  recommendation: string;
}

interface SafeguardingAuditReport {
  total: number;
  passing: number;
  failing: number;
  checks: AuditCheck[];
  overallStatus: 'PASS' | 'FAIL';
}

/** Check if messaging service actually monitors content */
async function checkMessageMonitoring(): Promise<string> {
  // No monitoring implementation exists -- return honest status
  return 'No automated monitoring. Report button available.';
}

/** Check if consent badges actually gate actions */
async function checkConsentEnforcement(): Promise<{ enforced: boolean; details: string }> {
  // Check if media-service, social-feed-service, etc. call consentService.hasConsent()
  // This is a static audit -- in practice, run integration tests
  return { enforced: false, details: 'Consent badges shown but not all actions gated' };
}

/** Check if block-user actually prevents all interaction */
async function checkBlockEnforcement(): Promise<{ enforced: boolean; details: string }> {
  return { enforced: false, details: 'Block saves to storage but not checked in all flows' };
}

/** Check if reports are actually processed */
async function checkReportProcessing(): Promise<{ actionable: boolean; details: string }> {
  return { actionable: false, details: 'Reports saved but no admin review workflow' };
}

/** Check if DBS verification gates coaching */
async function checkDBSEnforcement(): Promise<{ enforced: boolean; details: string }> {
  return { enforced: false, details: 'DBS status checked in roster but not in booking/session start' };
}

export async function auditSafeguardingFeatures(): Promise<SafeguardingAuditReport> {
  const checks: AuditCheck[] = [];

  // Check 1: Monitoring claims
  const monitoringStatus = await checkMessageMonitoring();
  checks.push({
    feature: 'Message Monitoring',
    claim: 'Messages are monitored for safety',
    reality: monitoringStatus,
    isAccurate: false, // No monitoring exists
    recommendation: 'Remove claim or implement monitoring',
  });

  // Check 2: Consent enforcement
  const consentStatus = await checkConsentEnforcement();
  checks.push({
    feature: 'Consent Badges',
    claim: 'Shows consent status',
    reality: consentStatus.details,
    isAccurate: consentStatus.enforced,
    recommendation: 'Ensure all actions check consent before proceeding',
  });

  // Check 3: Block feature
  const blockStatus = await checkBlockEnforcement();
  checks.push({
    feature: 'Block User',
    claim: 'Blocks user from contact',
    reality: blockStatus.details,
    isAccurate: blockStatus.enforced,
    recommendation: 'Ensure blocks checked in messaging, booking, search',
  });

  // Check 4: Report feature
  const reportStatus = await checkReportProcessing();
  checks.push({
    feature: 'Report User',
    claim: 'Reports reviewed by team',
    reality: reportStatus.details,
    isAccurate: reportStatus.actionable,
    recommendation: 'Auto-block serious reports, notify admins',
  });

  // Check 5: DBS gate
  const dbsStatus = await checkDBSEnforcement();
  checks.push({
    feature: 'DBS Verification',
    claim: 'Required for coaching',
    reality: dbsStatus.details,
    isAccurate: dbsStatus.enforced,
    recommendation: 'Default to fail-closed, log bypasses',
  });

  const passing = checks.filter(c => c.isAccurate).length;
  const failing = checks.filter(c => !c.isAccurate).length;

  return {
    total: checks.length,
    passing,
    failing,
    checks,
    overallStatus: failing === 0 ? 'PASS' : 'FAIL',
  };
}
```

2. Add compliance scoring:
```typescript
export function calculateComplianceScore(report: SafeguardingAuditReport): number {
  return (report.passing / report.total) * 100;
}

export function getComplianceGrade(score: number): string {
  if (score >= 90) return 'A - Compliant';
  if (score >= 75) return 'B - Mostly Compliant';
  if (score >= 60) return 'C - Needs Improvement';
  if (score >= 40) return 'D - Poor';
  return 'F - Non-Compliant';
}
```

3. Add dev-mode audit screen:
```typescript
// app/dev/safeguarding-audit.tsx (only in __DEV__)
export default function SafeguardingAuditScreen() {
  const [report, setReport] = useState<SafeguardingAuditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    const result = await auditSafeguardingFeatures();
    setReport(result);
    setLoading(false);
  };

  useEffect(() => {
    runAudit();
  }, []);

  if (loading) {
    return <LoadingState message="Running safeguarding audit..." />;
  }

  const score = report ? calculateComplianceScore(report) : 0;
  const grade = getComplianceGrade(score);

  return (
    <ScrollView style={{ flex: 1 }}>
      <Column style={{ padding: Spacing.lg }}>
        <ThemedText style={Typography.display}>Safeguarding Audit</ThemedText>

        <Spacer height={Spacing.lg} />

        <SurfaceCard style={{
          backgroundColor: score >= 75 ? colors.successBackground : colors.errorBackground,
        }}>
          <ThemedText style={Typography.heading}>
            Score: {score.toFixed(1)}% — {grade}
          </ThemedText>
          <ThemedText style={Typography.body}>
            {report?.passing} / {report?.total} checks passing
          </ThemedText>
        </SurfaceCard>

        <Spacer height={Spacing.lg} />

        {report?.checks.map((check, index) => (
          <SurfaceCard
            key={index}
            style={{
              marginBottom: Spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: check.isAccurate ? colors.success : colors.error,
            }}
          >
            <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
              <Ionicons
                name={check.isAccurate ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={check.isAccurate ? colors.success : colors.error}
              />
              <Spacer width={Spacing.sm} />
              <ThemedText style={Typography.subheading}>{check.feature}</ThemedText>
            </Row>

            <ThemedText style={Typography.small} color="secondary">
              Claim: {check.claim}
            </ThemedText>

            <Spacer height={Spacing.xs} />

            <ThemedText style={Typography.small}>
              Reality: {check.reality}
            </ThemedText>

            {!check.isAccurate && (
              <Column style={{
                marginTop: Spacing.sm,
                padding: Spacing.sm,
                backgroundColor: colors.errorBackground,
                borderRadius: Radii.sm,
              }}>
                <ThemedText style={Typography.small} color="error">
                  {check.recommendation}
                </ThemedText>
              </Column>
            )}
          </SurfaceCard>
        ))}

        <Button
          title="Re-run Audit"
          onPress={runAudit}
          variant="primary"
        />
      </Column>
    </ScrollView>
  );
}
```

4. Action items list:
```typescript
const SAFEGUARDING_ACTION_ITEMS = [
  {
    item: 'S-33',
    feature: 'Message Monitoring',
    action: 'Remove false claim or implement monitoring',
    priority: 'P2',
  },
  {
    item: 'S-49',
    feature: 'Consent Enforcement',
    action: 'Audit and fix all enforcement gaps',
    priority: 'P3',
  },
  {
    item: 'S-13',
    feature: 'Block Feature',
    action: 'Integrate checks into all interaction points',
    priority: 'P0',
  },
  {
    item: 'S-14',
    feature: 'Report Feature',
    action: 'Auto-block serious reports, notify admins',
    priority: 'P0',
  },
  {
    item: 'S-01',
    feature: 'DBS Gate',
    action: 'Change to fail-closed by default',
    priority: 'P0',
  },
];
```

ACCEPTANCE CRITERIA:
✅ Safeguarding audit function created
✅ All major features checked for accuracy
✅ Compliance score calculated
✅ Dev-mode audit screen shows results
✅ Failing checks show recommendations
✅ Action items linked to sprint items
✅ Audit can be re-run to verify fixes
```

---

## Sprint 4 Summary

**Total Items**: 20 ongoing safeguarding improvements
**Estimated Effort**: 7-9 days (1 senior engineer)
**Priority**: P3 — Ongoing polish and advanced features

**Breakdown by Type**:
- Access Control: 2 items (S-11, S-38)
- Privacy Features: 3 items (S-38, S-39, S-40)
- UX Polish: 4 items (S-15, S-27, S-32, S-45)
- Advanced Consent: 2 items (S-22, S-46)
- Group Safety: 2 items (S-36, S-37)
- Data Management: 2 items (S-34, S-48)
- Content Validation: 1 item (S-47)
- Audit Tools: 2 items (S-49, S-52)

**Dependencies**:
- S-34, S-36, S-37 require family and community services
- S-38, S-39 require roster and session services
- S-48 requires background task scheduling
- S-49, S-52 are meta-tasks that verify other items

**Risk**: LOW — These are polish items and advanced features. None are launch-blocking. Some (like S-48 data retention) are important for GDPR compliance but can be implemented post-launch.

**Success Criteria**:
- Session notes access controlled
- Account deletion has 30-day grace period
- Privacy features protect athlete identities
- Location sharing has appropriate warnings
- Data retention policy automatically enforced
- Safeguarding audit shows 90%+ compliance
- All consent enforcement gaps closed
