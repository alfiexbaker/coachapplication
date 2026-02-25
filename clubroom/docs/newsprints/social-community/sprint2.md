# Social & Community Sprint 2: UX Polish

**Goal**: Add explanatory text, help content, and UX improvements to social and community features. These don't break functionality but reduce confusion and improve user understanding of privacy, notifications, and post distribution.

**Priority**: P2 — Post-launch polish
**Effort**: 6 engineer-days
**Dependencies**: Sprint 1 (broken features)

---

## Item 165: Post Distribution No Explanation

**File**: `components/social/club-post-selectors.tsx` ~lines 27-47

**Problem**: Post creation has "Distribute to" selector with options: Club Only, Squads, Everyone. No explanation of what these mean. Parent selects "Everyone", surprised post goes to people outside club.

**Prompt**:
```
Add explanatory text to post distribution selector.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/social/club-post-selectors.tsx
Lines: ~27-47 (distribution selector)

Current behavior:
- Three chip options: Club Only, Squads, Everyone
- No explanation of audience
- User confused about reach

Requirements:
1. Add helper text for each distribution option
2. Show estimated audience size
3. Explain who will see the post
4. Show preview of recipients (optional)
5. Default to most restrictive (Club Only)

Implementation:
```typescript
type DistributionOption = 'CLUB_ONLY' | 'SQUADS' | 'EVERYONE';

const PostDistributionSelector = ({
  selectedDistribution,
  onDistributionChange,
  clubId
}: Props) => {
  const { colors } = useTheme();
  const [audienceCounts, setAudienceCounts] = useState({
    clubOnly: 0,
    squads: 0,
    everyone: 0
  });

  // Calculate audience sizes
  useEffect(() => {
    const calculateCounts = async () => {
      const clubMembers = await ClubService.getMemberCount(clubId);
      const squadMembers = await ClubService.getSquadMemberCount(clubId);
      const followers = await ClubService.getFollowerCount(clubId);

      setAudienceCounts({
        clubOnly: clubMembers,
        squads: squadMembers,
        everyone: clubMembers + followers
      });
    };

    calculateCounts();
  }, [clubId]);

  const distributions = [
    {
      value: 'CLUB_ONLY' as DistributionOption,
      label: 'Club Members',
      description: 'Only members of this club will see this post',
      audienceSize: audienceCounts.clubOnly,
      icon: 'people',
      recommended: true
    },
    {
      value: 'SQUADS' as DistributionOption,
      label: 'Squad Members',
      description: 'Members of your coaching squads within this club',
      audienceSize: audienceCounts.squads,
      icon: 'trophy'
    },
    {
      value: 'EVERYONE' as DistributionOption,
      label: 'Everyone',
      description: 'Club members and followers (visible to public)',
      audienceSize: audienceCounts.everyone,
      icon: 'globe'
    }
  ];

  return (
    <Column style={{ gap: Spacing.sm }}>
      <ThemedText style={[Typography.subheading, { marginBottom: Spacing.xs }]}>
        Who can see this post?
      </ThemedText>

      {distributions.map(dist => (
        <Clickable
          key={dist.value}
          onPress={() => onDistributionChange(dist.value)}
          accessibilityLabel={`Distribute to ${dist.label}`}
        >
          <SurfaceCard style={[
            {
              padding: Spacing.sm,
              borderWidth: 2,
              borderColor: selectedDistribution === dist.value
                ? colors.primary
                : colors.border
            }
          ]}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Row style={{ gap: Spacing.xs, flex: 1, alignItems: 'center' }}>
                <Ionicons
                  name={dist.icon}
                  size={20}
                  color={selectedDistribution === dist.value ? colors.primary : colors.textSecondary}
                />

                <Column style={{ flex: 1 }}>
                  <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
                    <ThemedText style={[
                      Typography.body,
                      {
                        color: selectedDistribution === dist.value
                          ? colors.textPrimary
                          : colors.textSecondary
                      }
                    ]}>
                      {dist.label}
                    </ThemedText>

                    {dist.recommended && (
                      <Badge label="Recommended" variant="success" size="small" />
                    )}
                  </Row>

                  <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
                    {dist.description}
                  </ThemedText>

                  <ThemedText style={[
                    Typography.caption,
                    { color: colors.primary, marginTop: Spacing.xxs }
                  ]}>
                    ~{dist.audienceSize} people
                  </ThemedText>
                </Column>
              </Row>

              {selectedDistribution === dist.value && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Row>
          </SurfaceCard>
        </Clickable>
      ))}

      {/* Privacy notice for public posts */}
      {selectedDistribution === 'EVERYONE' && (
        <SurfaceCard style={{
          backgroundColor: withAlpha(colors.info, 0.1),
          padding: Spacing.sm
        }}>
          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <ThemedText style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
              This post will be visible to anyone who follows your club, even if they're not members.
            </ThemedText>
          </Row>
        </SurfaceCard>
      )}
    </Column>
  );
};
```

Test cases:
- Load selector (counts calculated and displayed)
- Select "Club Members" (recommended badge shown)
- Select "Everyone" (privacy notice shown)
- Club with 50 members, 20 followers (Everyone shows ~70)
- Small club with 0 followers (Everyone shows same as Club Only)
```

**Acceptance Criteria**:
- [ ] Each distribution option has clear description
- [ ] Audience size shown per option (~X people)
- [ ] "Recommended" badge on Club Members
- [ ] Privacy notice shown for public posts
- [ ] Visual indication of selected option (border + checkmark)
- [ ] Icon per distribution type
- [ ] Helper question: "Who can see this post?"

---

## Item 168: Community Group Privacy No Explanation

**File**: `components/community/create-group-form-sections.tsx` ~lines 122-182

**Problem**: Group creation has "Public" / "Private" toggle with no explanation. User doesn't know difference between public (anyone can join) vs private (invite-only).

**Prompt**:
```
Add explanatory text to community group privacy selector.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/community/create-group-form-sections.tsx
Lines: ~122-182 (privacy toggle)

Current behavior:
- Toggle: Public / Private
- No explanation of what each means
- User confused about who can join

Requirements:
1. Explain Public: anyone can join, posts visible to all
2. Explain Private: invite-only, posts visible to members only
3. Show icon for each type
4. Recommend Private for sensitive groups (parent chats)
5. Show current selection clearly

Implementation:
```typescript
const PrivacySelector = ({ value, onChange }: { value: 'PUBLIC' | 'PRIVATE'; onChange: (v: 'PUBLIC' | 'PRIVATE') => void }) => {
  const { colors } = useTheme();

  const privacyOptions = [
    {
      value: 'PUBLIC' as const,
      label: 'Public Group',
      icon: 'globe-outline',
      description: 'Anyone can join and view posts',
      details: 'Members can invite others. Group will appear in search results.'
    },
    {
      value: 'PRIVATE' as const,
      label: 'Private Group',
      icon: 'lock-closed-outline',
      description: 'Invite-only, posts visible to members only',
      details: 'Members must be invited by admin. Group hidden from search.',
      recommended: true
    }
  ];

  return (
    <Column style={{ gap: Spacing.sm }}>
      <ThemedText style={Typography.subheading}>
        Privacy Setting
      </ThemedText>

      <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
        Choose who can join and view posts in this group
      </ThemedText>

      <Column style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
        {privacyOptions.map(option => (
          <Clickable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityLabel={`Set privacy to ${option.label}`}
          >
            <SurfaceCard style={[
              {
                padding: Spacing.sm,
                borderWidth: 2,
                borderColor: value === option.value ? colors.primary : colors.border
              }
            ]}>
              <Row style={{ gap: Spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={value === option.value ? colors.primary : colors.textSecondary}
                  style={{ marginTop: 2 }}
                />

                <Column style={{ flex: 1 }}>
                  <Row style={{ gap: Spacing.xs, alignItems: 'center', marginBottom: Spacing.xxs }}>
                    <ThemedText style={[
                      Typography.body,
                      { color: value === option.value ? colors.textPrimary : colors.textSecondary }
                    ]}>
                      {option.label}
                    </ThemedText>

                    {option.recommended && (
                      <Badge label="Recommended" variant="success" size="small" />
                    )}

                    {value === option.value && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </Row>

                  <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
                    {option.description}
                  </ThemedText>

                  <ThemedText style={[
                    Typography.caption,
                    { color: colors.textSecondary, marginTop: Spacing.xxs }
                  ]}>
                    {option.details}
                  </ThemedText>
                </Column>
              </Row>
            </SurfaceCard>
          </Clickable>
        ))}
      </Column>

      {/* Use case examples */}
      <SurfaceCard style={{
        backgroundColor: withAlpha(colors.info, 0.1),
        padding: Spacing.sm,
        marginTop: Spacing.xs
      }}>
        <Row style={{ gap: Spacing.xs }}>
          <Ionicons name="bulb-outline" size={16} color={colors.info} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={[Typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
              Tip
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
              {value === 'PUBLIC'
                ? 'Great for club announcements, team discussions, and community building.'
                : 'Best for parent chats, coaching teams, and sensitive discussions.'}
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>
    </Column>
  );
};
```

Test cases:
- Select Public (description + details shown)
- Select Private (recommended badge + tip shown)
- Switch between options (tip text updates)
- Visual selection feedback (border, checkmark)
```

**Acceptance Criteria**:
- [ ] Each privacy option has clear description
- [ ] Details explain joinability and visibility
- [ ] "Recommended" badge on Private
- [ ] Icon per privacy type (globe/lock)
- [ ] Tip box shows use case for selected option
- [ ] Helper text: "Choose who can join..."
- [ ] Selected option visually distinct

---

## Item 169: Notification Mute No Explanation

**File**: `components/notification/notification-card.tsx` ~lines 268-274

**Problem**: Notification settings screen has "Mute" button per coach/club. No explanation of what mute does. User doesn't know if mute is temporary, permanent, or affects which notification types.

**Prompt**:
```
Add explanatory text to notification mute button.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/notification/notification-card.tsx
Lines: ~268-274 (mute button)

Current behavior:
- "Mute" button with no context
- User doesn't know what will be muted
- No indication of mute duration (permanent vs temporary)

Requirements:
1. Explain what gets muted (all notifications from this source)
2. Show that mute is permanent until unmuted
3. Confirmation dialog explaining mute
4. Show muted status clearly
5. Easy unmute option

Implementation:
```typescript
const NotificationCard = ({ source, type }: { source: Coach | Club; type: 'coach' | 'club' }) => {
  const { colors } = useTheme();
  const [isMuted, setIsMuted] = useState(source.isMuted);

  // Use a confirmation modal state (not Alert.alert — consistent with project pattern)
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);

  const handleMutePress = useCallback(() => {
    if (isMuted) {
      // Unmute immediately
      handleUnmute();
    } else {
      // Show confirmation modal before muting
      setShowMuteConfirm(true);
      // Modal message: "You will no longer receive notifications from {source.name}.
      // This includes: Session reminders, New messages, Schedule changes, Post updates.
      // You can unmute anytime from notification settings."
      // Options: "Cancel" and "Mute" (destructive)
    }
  }, [isMuted]);

  const handleMute = async () => {
    const result = await NotificationPreferencesService.muteSource({
      sourceId: source.id,
      sourceType: type
    });

    if (result.success) {
      setIsMuted(true);
      showToast({
        type: 'success',
        message: `Notifications from ${source.name} muted`
      });
    } else {
      showToast({ type: 'error', message: result.error.message });
    }
  };

  const handleUnmute = async () => {
    const result = await NotificationPreferencesService.unmuteSource({
      sourceId: source.id,
      sourceType: type
    });

    if (result.success) {
      setIsMuted(false);
      showToast({
        type: 'success',
        message: `Notifications from ${source.name} unmuted`
      });
    } else {
      showToast({ type: 'error', message: result.error.message });
    }
  };

  return (
    <SurfaceCard style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Row style={{ gap: Spacing.sm, flex: 1, alignItems: 'center' }}>
          <Avatar source={{ uri: source.photoUrl }} size={44} />

          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.body}>
              {source.name}
            </ThemedText>

            {isMuted && (
              <Row style={{ gap: Spacing.xxs, alignItems: 'center', marginTop: Spacing.xxs }}>
                <Ionicons name="notifications-off" size={14} color={colors.textSecondary} />
                <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
                  Notifications muted
                </ThemedText>
              </Row>
            )}
          </Column>
        </Row>

        <Button
          label={isMuted ? 'Unmute' : 'Mute'}
          variant={isMuted ? 'secondary' : 'outline'}
          onPress={handleMutePress}
          size="compact"
          icon={isMuted ? 'notifications' : 'notifications-off'}
        />
      </Row>

      {/* Explanation when muted */}
      {isMuted && (
        <Column style={{
          marginTop: Spacing.sm,
          padding: Spacing.sm,
          backgroundColor: withAlpha(colors.warning, 0.1),
          borderRadius: Radii.sm
        }}>
          <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
            You won't receive notifications from {source.name} until you unmute. Important updates like session cancellations may still appear.
          </ThemedText>
        </Column>
      )}
    </SurfaceCard>
  );
};
```

Test cases:
- Tap Mute on coach (confirmation dialog shown with explanation)
- Confirm mute (status updated, success toast)
- Muted coach card (shows "Notifications muted" + explanation)
- Tap Unmute (immediately unmutes, no confirmation needed)
- Mute multiple coaches (each tracked independently)
```

**Acceptance Criteria**:
- [ ] Confirmation dialog before muting
- [ ] Dialog lists what will be muted
- [ ] Dialog explains permanence and unmute option
- [ ] Muted status shown in card (icon + text)
- [ ] Explanation text shown when muted
- [ ] Unmute action immediate (no confirmation)
- [ ] Success toast on mute/unmute
- [ ] Visual distinction for muted sources

---

## Item 170: Notification Unmute No Context

**File**: `components/notification/muted-coaches-list-sections.tsx` ~lines 52-60

**Problem**: "Muted Coaches" list shows coaches with Unmute button. No reminder of why they were muted or when. User forgets they muted someone, confused seeing them in list.

**Prompt**:
```
Add context to muted coaches list.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/notification/muted-coaches-list-sections.tsx
Lines: ~52-60 (muted coach card)

Current behavior:
- List of muted coaches with Unmute button
- No indication of when muted or why
- No reminder of what's being muted

Requirements:
1. Show date when muted
2. Show count of notifications missed (optional)
3. Reminder of what's muted
4. Empty state with explanation
5. Quick unmute action

Implementation:
```typescript
type MutedSource = {
  id: string;
  name: string;
  type: 'coach' | 'club';
  photoUrl: string;
  mutedAt: string;
  missedNotifications?: number;  // Optional: count of notifications that would have been sent
};

const MutedCoachesList = () => {
  const { colors } = useTheme();
  const [mutedSources, setMutedSources] = useState<MutedSource[]>([]);

  useEffect(() => {
    const loadMuted = async () => {
      const result = await NotificationPreferencesService.getMutedSources();
      if (result.success) {
        setMutedSources(result.data);
      }
    };

    loadMuted();
  }, []);

  const handleUnmute = async (sourceId: string) => {
    const result = await NotificationPreferencesService.unmuteSource({ sourceId });

    if (result.success) {
      setMutedSources(prev => prev.filter(s => s.id !== sourceId));
      showToast({
        type: 'success',
        message: 'Notifications unmuted'
      });
    }
  };

  if (mutedSources.length === 0) {
    return (
      <EmptyState
        icon="notifications-outline"
        title="No Muted Notifications"
        message="You're receiving notifications from all coaches and clubs. Use 'Mute' to stop notifications from specific sources."
      />
    );
  }

  return (
    <Column style={{ gap: Spacing.sm }}>
      <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
        You won't receive notifications from these sources. Session reminders, messages, and updates are hidden.
      </ThemedText>

      {mutedSources.map(source => (
        <SurfaceCard key={source.id} style={{ padding: Spacing.md }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Row style={{ gap: Spacing.sm, flex: 1 }}>
              <Avatar source={{ uri: source.photoUrl }} size={44} />

              <Column style={{ flex: 1 }}>
                <ThemedText style={Typography.body}>
                  {source.name}
                </ThemedText>

                <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
                  Muted {formatDistanceToNow(new Date(source.mutedAt), { addSuffix: true })}
                </ThemedText>

                {source.missedNotifications && source.missedNotifications > 0 && (
                  <ThemedText style={[Typography.caption, { color: colors.warning, marginTop: Spacing.xxs }]}>
                    {source.missedNotifications} notification{source.missedNotifications > 1 ? 's' : ''} missed
                  </ThemedText>
                )}
              </Column>
            </Row>

            <Button
              label="Unmute"
              variant="secondary"
              onPress={() => handleUnmute(source.id)}
              size="compact"
              icon="notifications"
            />
          </Row>
        </SurfaceCard>
      ))}
    </Column>
  );
};
```

Test cases:
- No muted sources (empty state shown with explanation)
- 1 muted coach (card shows name, muted time, unmute button)
- Muted 5 days ago (shows "Muted 5 days ago")
- Missed 3 notifications (shows "3 notifications missed" in warning color)
- Tap Unmute (source removed from list, toast shown)
```

**Acceptance Criteria**:
- [ ] List shows when each source was muted
- [ ] Missed notification count shown (if tracked)
- [ ] Helper text explains what's muted
- [ ] Empty state with explanation
- [ ] Unmute button per source
- [ ] Relative time format ("5 days ago")
- [ ] Success toast on unmute
- [ ] List updates immediately after unmute

---

## Item 171: 99+ Notifications No Bulk Clear

**File**: `components/ui/notification-bell.tsx` ~line 43

**Problem**: Notification bell shows badge with unread count (e.g., "99+"). No way to mark all as read in one action. User must tap each notification individually. Tedious with 50+ notifications.

**Prompt**:
```
Add "Mark All Read" button to notification screen.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/ui/notification-bell.tsx
Lines: ~43 (notification list screen, or create new file if needed)

Context:
- Notification bell badge shows unread count
- Tapping bell opens notification list
- User must tap each notification to mark as read
- Need bulk action

Requirements:
1. "Mark All Read" button at top of notification list
2. Confirmation dialog if > 20 unread
3. Update badge immediately after bulk mark
4. Show success toast with count
5. Disable button when no unread

Implementation:
```typescript
// In app/notifications/index.tsx or notification list screen
const NotificationsScreen = () => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();  // from hooks/use-auth.tsx
  const currentUserId = currentUser?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      const result = await NotificationStoreService.getNotifications(currentUserId);
      if (result.success) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter(n => !n.isRead).length);
      }
    };

    loadNotifications();
  }, [currentUserId]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    // Confirmation for large counts — use confirmation modal state (not Alert.alert)
    if (unreadCount > 20) {
      setShowMarkAllConfirm(true);
      // Modal message: "This will mark {unreadCount} notifications as read. Continue?"
      // Options: "Cancel" and "Mark All Read"
    } else {
      await performMarkAllRead();
    }
  };

  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);

  const performMarkAllRead = async () => {
    setIsMarkingAllRead(true);

    const unreadIds = notifications
      .filter(n => !n.isRead)
      .map(n => n.id);

    const result = await NotificationStoreService.markAllAsRead(currentUserId, unreadIds);

    if (result.success) {
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);

      // Emit event to update badge
      emitTyped('NOTIFICATIONS_MARKED_READ', {
        userId: currentUserId,
        count: unreadIds.length
      });

      showToast({
        type: 'success',
        message: `${unreadIds.length} notification${unreadIds.length > 1 ? 's' : ''} marked as read`
      });
    } else {
      showToast({ type: 'error', message: result.error.message });
    }

    setIsMarkingAllRead(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Notifications" />

      {/* Mark All Read button */}
      {notifications.length > 0 && (
        <Column style={{ padding: Spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
          <Button
            label={unreadCount > 0 ? `Mark All Read (${unreadCount})` : 'All Read'}
            variant="outline"
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0 || isMarkingAllRead}
            loading={isMarkingAllRead}
            icon="checkmark-done"
            size="compact"
          />
        </Column>
      )}

      {/* Notification list */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}  // Wrap in useCallback: const renderNotificationItem = useCallback(({ item }) => <NotificationCard notification={item} />, []);
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No Notifications"
            message="You're all caught up! Notifications will appear here."
          />
        }
      />
    </SafeAreaView>
  );
};
```

Also add to NotificationStoreService:
```typescript
async markAllAsRead(
  userId: string,
  notificationIds: string[]
): Promise<Result<void, ServiceError>> {
  try {
    const notifications = await this.getNotifications(userId);

    const updated = notifications.map(n =>
      notificationIds.includes(n.id)
        ? { ...n, isRead: true, readAt: new Date().toISOString() }
        : n
    );

    await apiClient.set(STORAGE_KEYS.NOTIFICATIONS(userId), updated);

    logger.info(`Marked ${notificationIds.length} notifications as read for user ${userId}`);

    return ok(undefined);
  } catch (error) {
    logger.error('Failed to mark all notifications as read', { userId, error });
    return err({
      code: 'STORAGE',
      message: 'Failed to mark notifications as read'
    });
  }
}
```

Test cases:
- 5 unread notifications (button shows "Mark All Read (5)")
- Tap button with < 20 unread (marks immediately, no confirmation)
- Tap button with > 20 unread (confirmation dialog shown)
- Confirm mark all (all notifications marked, badge updates to 0)
- All read (button disabled, shows "All Read")
- Loading state shown during bulk mark
- Success toast shows count marked
```

**Acceptance Criteria**:
- [ ] "Mark All Read" button at top of notification list
- [ ] Button shows unread count in label
- [ ] Confirmation dialog for > 20 unread
- [ ] All unread marked as read on confirm
- [ ] Badge updated immediately after bulk mark
- [ ] Success toast shows count marked
- [ ] Button disabled when no unread
- [ ] Loading state during bulk operation
- [ ] Event emitted to update other screens

---

## Item 172: Quiet Hours No Push vs In-App Explanation

**File**: `components/notification/quiet-hours-sections.tsx` ~line 48

**Problem**: Quiet Hours setting shows time range selector (e.g., 22:00-08:00). No explanation of what happens during quiet hours. User doesn't know if notifications are blocked completely or just delayed.

**Prompt**:
```
Add explanation to Quiet Hours setting.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/notification/quiet-hours-sections.tsx
Lines: ~48 (quiet hours UI)

Current behavior:
- Toggle: Enable Quiet Hours
- Time pickers: Start time, End time
- No explanation of behavior

Requirements:
1. Explain push notifications disabled during quiet hours
2. Explain in-app notifications still visible
3. Show current quiet hours status (active/inactive)
4. Show next quiet hours start/end time
5. Recommend default times (22:00-08:00)

Implementation:
```typescript
const QuietHoursSection = () => {
  const { colors } = useTheme();
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  // Store times as minutes-from-midnight for clean numeric comparison
  const [startMinutes, setStartMinutes] = useState(22 * 60);  // 22:00 = 1320
  const [endMinutes, setEndMinutes] = useState(8 * 60);        // 08:00 = 480

  // Format minutes-from-midnight to HH:mm for display
  const formatMinutes = useCallback((mins: number): string => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Memoize to avoid recalculating on every render
  const isCurrentlyInQuietHours = useMemo(() => {
    if (!quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Handle overnight range (e.g., 22:00-08:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }

    return currentTime >= startMinutes && currentTime < endMinutes;
  }, [quietHoursEnabled, startMinutes, endMinutes]);

  const getNextTransition = useCallback(() => {
    if (!quietHoursEnabled) return null;

    if (isCurrentlyInQuietHours) {
      return `Quiet hours end at ${formatMinutes(endMinutes)}`;
    } else {
      return `Quiet hours start at ${formatMinutes(startMinutes)}`;
    }
  }, [quietHoursEnabled, isCurrentlyInQuietHours, startMinutes, endMinutes, formatMinutes]);

  return (
    <Column style={{ gap: Spacing.md }}>
      <ThemedText style={Typography.subheading}>
        Quiet Hours
      </ThemedText>

      <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
        No push notifications will be sent during quiet hours. You'll still receive in-app notifications when you open the app.
      </ThemedText>

      {/* Enable toggle */}
      <SurfaceCard style={{ padding: Spacing.md }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.body}>
              Enable Quiet Hours
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
              Recommended: 22:00 - 08:00
            </ThemedText>
          </Column>

          <Switch
            value={quietHoursEnabled}
            onValueChange={setQuietHoursEnabled}
          />
        </Row>
      </SurfaceCard>

      {/* Time pickers (shown when enabled) */}
      {quietHoursEnabled && (
        <>
          <Row style={{ gap: Spacing.sm }}>
            <SurfaceCard style={{ flex: 1, padding: Spacing.md }}>
              <ThemedText style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
                Start Time
              </ThemedText>
              <TimePicker
                value={formatMinutes(startMinutes)}
                onChange={(timeStr: string) => {
                  const [h, m] = timeStr.split(':').map(Number);
                  setStartMinutes(h * 60 + m);
                }}
              />
            </SurfaceCard>

            <SurfaceCard style={{ flex: 1, padding: Spacing.md }}>
              <ThemedText style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
                End Time
              </ThemedText>
              <TimePicker
                value={formatMinutes(endMinutes)}
                onChange={(timeStr: string) => {
                  const [h, m] = timeStr.split(':').map(Number);
                  setEndMinutes(h * 60 + m);
                }}
              />
            </SurfaceCard>
          </Row>

          {/* Current status */}
          <SurfaceCard style={{
            padding: Spacing.sm,
            backgroundColor: isCurrentlyInQuietHours
              ? withAlpha(colors.warning, 0.1)
              : withAlpha(colors.success, 0.1)
          }}>
            <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
              <Ionicons
                name={isCurrentlyInQuietHours ? 'moon' : 'sunny'}
                size={16}
                color={isCurrentlyInQuietHours ? colors.warning : colors.success}
              />
              <Column style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary }]}>
                  {isCurrentlyInQuietHours
                    ? 'Quiet hours active'
                    : 'Notifications active'}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
                  {getNextTransition()}
                </ThemedText>
              </Column>
            </Row>
          </SurfaceCard>

          {/* What's affected */}
          <SurfaceCard style={{
            padding: Spacing.sm,
            backgroundColor: withAlpha(colors.info, 0.1)
          }}>
            <Row style={{ gap: Spacing.xs }}>
              <Ionicons name="information-circle" size={16} color={colors.info} />
              <Column style={{ flex: 1 }}>
                <ThemedText style={[Typography.caption, { color: colors.textPrimary, fontWeight: '600', marginBottom: Spacing.xxs }]}>
                  What happens during quiet hours?
                </ThemedText>

                <Column style={{ gap: Spacing.xxs }}>
                  <Row style={{ gap: Spacing.xxs }}>
                    <Ionicons name="close-circle" size={14} color={colors.error} />
                    <ThemedText style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                      No push notifications (sound/vibration)
                    </ThemedText>
                  </Row>

                  <Row style={{ gap: Spacing.xxs }}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <ThemedText style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                      In-app notifications still visible when you open the app
                    </ThemedText>
                  </Row>

                  <Row style={{ gap: Spacing.xxs }}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <ThemedText style={[Typography.caption, { color: colors.textSecondary, flex: 1 }]}>
                      Badge count updates (red dot on app icon)
                    </ThemedText>
                  </Row>
                </Column>
              </Column>
            </Row>
          </SurfaceCard>
        </>
      )}
    </Column>
  );
};
```

Test cases:
- Enable quiet hours (time pickers shown, status card shown)
- Current time in quiet hours range (status shows "Quiet hours active")
- Current time outside range (status shows "Notifications active")
- Set 22:00-08:00 (overnight range, status calculated correctly)
- Disable quiet hours (time pickers hidden)
- Explanation shows what's blocked and what's allowed
```

**Acceptance Criteria**:
- [ ] Explanation of quiet hours behavior above toggle
- [ ] "What happens" card lists blocked and allowed items
- [ ] Current status shown (active/inactive)
- [ ] Next transition time shown ("starts at" or "ends at")
- [ ] Recommended times shown in helper text
- [ ] Visual distinction for active/inactive status
- [ ] Moon icon for active, sun for inactive
- [ ] Time pickers only shown when enabled

---

## Sprint 2 Summary

**Total Items**: 6 items
**Effort**: 6 engineer-days
**Risk**: Low (UX text and UI improvements, no logic changes)

**Success Criteria**:
- [ ] Post distribution options have clear explanations
- [ ] Community group privacy explained with examples
- [ ] Notification mute shows confirmation with details
- [ ] Muted sources list shows context (when muted, missed count)
- [ ] Bulk mark all read available for notifications
- [ ] Quiet hours explanation shows what's blocked/allowed
- [ ] All explanations use plain language, no jargon
- [ ] Helper text concise and actionable

**Testing Strategy**:
1. Usability tests: Have non-technical users try features, check if explanations are clear
2. Copy review: Ensure all helper text is consistent in tone and style
3. Visual review: Ensure info cards don't clutter UI
4. Accessibility: VoiceOver users should understand explanations

**Deployment**:
- Low risk: Only UI/text changes, no business logic impact
- Can deploy incrementally per feature
- Monitor: User feedback on explanation clarity (surveys, support tickets)

**Dependencies**:
- Builds on Sprint 1 (functional features working)
- Some items require new service methods (e.g., NotificationPreferencesService.getMutedSources with missed count)

**Follow-up Work**:
- User education: In-app tutorials or tooltips for first-time users
- Help center: Link to help docs from explanation cards
- Analytics: Track if users read explanations (expand/collapse interactions)
- Internationalization: Translate all helper text for localization
