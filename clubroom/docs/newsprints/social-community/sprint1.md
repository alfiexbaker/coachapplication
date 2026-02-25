# Social & Community Sprint 1: Broken Features

**Goal**: Fix critical bugs in messaging, social feed, notifications, and event RSVP that break core social features. These are functional failures that prevent communication and community engagement.

**Priority**: P0 — Launch blockers
**Effort**: 11 engineer-days
**Dependencies**: None

---

## Item 162: No Typing Indicator

**File**: `components/messaging/message-composer.tsx`

**Problem**: No typing indicator in chat. User doesn't know if other person is responding or has abandoned conversation. Standard messaging feature missing, creates poor UX compared to WhatsApp/iMessage.

**Prompt**:
```
Add typing indicator to messaging component.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/messaging/message-composer.tsx
Lines: Full file (add typing detection and emission)

Current behavior:
- User types message
- Other person sees no indication of typing
- Unclear if message is being composed

Requirements:
1. Emit typing event when user starts typing
2. Stop emitting when user stops typing (2s debounce)
3. Display "X is typing..." indicator in chat
4. Show animated dots (...) while typing
5. Hide indicator when message sent or typing stopped

Implementation:

Part 1: Emit typing events
```typescript
// In MessageComposer component
import { emitTyped, onTyped } from '@/services/event-bus';

const [isTyping, setIsTyping] = useState(false);
const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Inline debounce via useRef (no lodash — project policy)
const stopTyping = useCallback(() => {
  if (stopTypingTimerRef.current) {
    clearTimeout(stopTypingTimerRef.current);
  }
  stopTypingTimerRef.current = setTimeout(() => {
    setIsTyping(false);
    emitTyped('USER_STOPPED_TYPING', {
      threadId,
      userId: currentUserId
    });
  }, 2000);  // Stop after 2s of no input
}, [threadId, currentUserId]);

const handleTextChange = (text: string) => {
  setMessage(text);

  // Start typing indicator
  if (!isTyping && text.length > 0) {
    setIsTyping(true);
    emitTyped('USER_TYPING', {
      threadId,
      userId: currentUserId,
      userName: currentUser.name
    });
  }

  // Reset stop timer
  if (text.length > 0) {
    stopTyping();
  } else {
    // Empty input, stop immediately
    setIsTyping(false);
    emitTyped('USER_STOPPED_TYPING', {
      threadId,
      userId: currentUserId
    });
  }
};

const handleSendMessage = async () => {
  // Send message
  await sendMessage();

  // Stop typing indicator immediately
  setIsTyping(false);
  emitTyped('USER_STOPPED_TYPING', {
    threadId,
    userId: currentUserId
  });

  if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);  // Cancel pending stop
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (isTyping) {
      emitTyped('USER_STOPPED_TYPING', {
        threadId,
        userId: currentUserId
      });
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
  };
}, [isTyping, threadId, currentUserId]);
```

Part 2: Display typing indicator in chat thread
```typescript
// In components/messaging/thread-view.tsx or similar
const [typingUsers, setTypingUsers] = useState<string[]>([]);

useEffect(() => {
  const handleUserTyping = (event: { threadId: string; userId: string; userName: string }) => {
    if (event.threadId !== threadId || event.userId === currentUserId) return;

    setTypingUsers(prev =>
      prev.includes(event.userName) ? prev : [...prev, event.userName]
    );
  };

  const handleUserStoppedTyping = (event: { threadId: string; userId: string }) => {
    if (event.threadId !== threadId) return;

    setTypingUsers(prev => prev.filter(name => name !== event.userName));
  };

  const unsubTyping = onTyped('USER_TYPING', handleUserTyping);
  const unsubStopped = onTyped('USER_STOPPED_TYPING', handleUserStoppedTyping);

  return () => {
    unsubTyping();
    unsubStopped();
  };
}, [threadId]);

// Typing indicator UI (at bottom of message list)
{typingUsers.length > 0 && (
  <Row style={{
    padding: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center'
  }}>
    <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
      {typingUsers.length === 1
        ? `${typingUsers[0]} is typing`
        : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` and ${typingUsers.length - 2} others` : ''} are typing`
      }
    </ThemedText>
    <TypingDots />
  </Row>
)}
```

Part 3: Animated typing dots
```typescript
// components/messaging/typing-dots.tsx
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence
} from 'react-native-reanimated';

const TypingDots = () => {
  const { colors } = useTheme();

  const Dot = ({ delay }: { delay: number }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: withRepeat(
        withSequence(
          withTiming(0.3, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,  // Infinite
        false
      ),
      transform: [
        {
          translateY: withRepeat(
            withSequence(
              withTiming(-3, { duration: 400 }),
              withTiming(0, { duration: 400 })
            ),
            -1,
            false
          )
        }
      ]
    }));

    return (
      <Animated.View
        style={[
          {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.textSecondary,
            marginHorizontal: Spacing.micro
          },
          animatedStyle
        ]}
      />
    );
  };

  return (
    <Row style={{ gap: Spacing.micro }}>
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </Row>
  );
};
```

Test cases:
- User A types (User B sees "User A is typing...")
- User A stops typing for 2s (indicator disappears)
- User A sends message (indicator disappears immediately)
- Multiple users typing (shows "User A, User B are typing")
- User closes app while typing (stopped event emitted)
- Typing indicator animates smoothly
- No indicator shown for own typing

**Acceptance Criteria**:
- [ ] Typing event emitted when user starts typing
- [ ] Stopped event emitted after 2s of no input
- [ ] Stopped event emitted on message send
- [ ] Typing indicator shows other user's name
- [ ] Animated dots shown while typing
- [ ] Multiple users typing handled correctly
- [ ] Indicator disappears when typing stops
- [ ] No indicator for own typing
- [ ] Events cleaned up on unmount

---

## Item 214: Tab Bar Message Badge Doesn't Update on Read

**File**: `app/(tabs)/_layout.tsx` ~lines 153-182

**Problem**: Tab bar shows unread message count badge. User opens chat, reads messages, returns to tab bar. Badge still shows old count. Doesn't update until app restart.

**Prompt**:
```
Fix tab bar message badge to update on message read.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/_layout.tsx
Lines: ~153-182 (tab bar badges)

Current behavior:
- Badge count loaded on mount
- User reads messages
- Badge count not updated
- Stale count shown until app restart

Requirements:
1. Badge count updates when messages read
2. Badge count updates when new message received
3. Subscribe to message events
4. Update badge in real-time
5. Badge shows 0 or hidden when no unread

Implementation:
```typescript
import { onTyped } from '@/services/event-bus';
import { MessagingService } from '@/services/community/community-messaging-service';

const TabBarLayout = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();  // from hooks/use-auth.tsx
  const currentUserId = currentUser?.id;

  // Load initial count
  useEffect(() => {
    const loadUnreadCount = async () => {
      const result = await MessagingService.getUnreadCount(currentUserId);
      if (result.success) {
        setUnreadCount(result.data);
      }
    };

    loadUnreadCount();
  }, [currentUserId]);

  // Subscribe to message events
  useEffect(() => {
    const handleNewMessage = async () => {
      // Refresh count when new message received
      const result = await MessagingService.getUnreadCount(currentUserId);
      if (result.success) {
        setUnreadCount(result.data);
      }
    };

    const handleMessageRead = async () => {
      // Refresh count when message marked as read
      const result = await MessagingService.getUnreadCount(currentUserId);
      if (result.success) {
        setUnreadCount(result.data);
      }
    };

    const handleThreadOpened = async (event: { threadId: string; userId: string }) => {
      // Mark thread as read when opened
      if (event.userId === currentUserId) {
        await MessagingService.markThreadAsRead(event.threadId, currentUserId);

        // Refresh count
        const result = await MessagingService.getUnreadCount(currentUserId);
        if (result.success) {
          setUnreadCount(result.data);
        }
      }
    };

    const unsubNewMessage = onTyped('MESSAGE_RECEIVED', handleNewMessage);
    const unsubMessageRead = onTyped('MESSAGES_MARKED_READ', handleMessageRead);
    const unsubThreadOpened = onTyped('THREAD_OPENED', handleThreadOpened);

    return () => {
      unsubNewMessage();
      unsubMessageRead();
      unsubThreadOpened();
    };
  }, [currentUserId]);

  return (
    <Tabs>
      {/* Other tabs */}

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4
                }}>
                  <ThemedText style={[
                    Typography.micro,
                    { color: colors.onPrimary, fontWeight: '600' }
                  ]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          )
        }}
      />
    </Tabs>
  );
};
```

Also emit THREAD_OPENED event when user opens chat:
```typescript
// In app/chat/index.tsx or thread view component
useEffect(() => {
  emitTyped('THREAD_OPENED', {
    threadId,
    userId: currentUserId
  });
}, [threadId]);
```

Optimization: Debounce count refresh (inline, no lodash)
```typescript
const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const refreshUnreadCount = useCallback(() => {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  refreshTimerRef.current = setTimeout(async () => {
    const result = await MessagingService.getUnreadCount(currentUserId);
    if (result.success) {
      setUnreadCount(result.data);
    }
  }, 500);
}, [currentUserId]
);
```

Test cases:
- Badge shows correct count on load
- New message received (badge increments)
- Open chat thread (badge decrements)
- Read all messages (badge shows 0 or hidden)
- Multiple threads with unread (badge shows total)
- Background message received (badge updates)
- Mark as read from notification (badge updates)
```

**Acceptance Criteria**:
- [ ] Badge count loaded on mount
- [ ] Badge updates on MESSAGE_RECEIVED event
- [ ] Badge updates on MESSAGES_MARKED_READ event
- [ ] Badge updates on THREAD_OPENED event
- [ ] Badge shows 0 or hidden when no unread
- [ ] Badge shows "99+" for counts > 99
- [ ] Count refresh debounced (performance)
- [ ] Events cleaned up on unmount
- [ ] Real-time updates work correctly

---

## Item 280: Social Feed Notifies Ex-Club Members

**File**: `services/social-feed-service.ts` ~lines 652-671

**Problem**: Post notification logic doesn't check if user is still a club member. User leaves club, still receives notifications for new posts. Spam and privacy issue.

**Prompt**:
```
Fix social feed notifications to exclude ex-members.

File: /Users/tubton/Desktop/coachapplication/clubroom/services/social-feed-service.ts
Lines: ~652-671 (notifyClubMembers method)

Current behavior:
- New post created in club
- notifyClubMembers fetches all members who ever joined
- Sends notification to all, including ex-members
- Ex-members can't access post (left club), but get notified

Requirements:
1. Check user's current club membership status
2. Only notify active members
3. Exclude users who left club
4. Exclude users with club notifications muted
5. Log excluded users for debugging

Implementation:
```typescript
private async notifyClubMembers(
  clubId: string,
  post: Post,
  authorId: string
): Promise<void> {
  try {
    // 1. Get current active members only
    const membersResult = await ClubService.getActiveMembers(clubId);

    if (!membersResult.success) {
      logger.error('Failed to get club members for notification', { clubId });
      return;
    }

    const members = membersResult.data;

    // 2. Filter out author and inactive members
    const recipientIds = members
      .filter(m => m.id !== authorId)  // Don't notify author
      .filter(m => m.status === 'ACTIVE')  // Only active members
      .filter(m => !m.hasLeftClub)  // Exclude ex-members
      .map(m => m.id);

    if (recipientIds.length === 0) {
      logger.info('No active members to notify', { clubId, postId: post.id });
      return;
    }

    // 3. Check notification preferences
    const notificationPrefsResult = await NotificationPreferencesService.getBulkPreferences(
      recipientIds,
      'CLUB_POST'
    );

    const enabledRecipients = recipientIds.filter(id => {
      const prefs = notificationPrefsResult.success
        ? notificationPrefsResult.data.find(p => p.userId === id)
        : null;

      // Default to enabled if no preference set
      return prefs?.enabled !== false;
    });

    if (enabledRecipients.length === 0) {
      logger.info('No members with notifications enabled', { clubId, postId: post.id });
      return;
    }

    logger.info(`Notifying ${enabledRecipients.length} club members`, {
      clubId,
      postId: post.id,
      totalMembers: members.length,
      excludedCount: recipientIds.length - enabledRecipients.length
    });

    // 4. Send notifications
    const notificationPromises = enabledRecipients.map(recipientId =>
      NotificationSenderService.send({
        recipientId,
        type: 'CLUB_POST',
        title: `New post in ${post.clubName}`,
        body: `${post.authorName}: ${truncate(post.content, 100)}`,
        data: {
          postId: post.id,
          clubId,
          authorId
        }
      })
    );

    const results = await Promise.allSettled(notificationPromises);

    const failedCount = results.filter(r => r.status === 'rejected').length;

    if (failedCount > 0) {
      logger.warn(`Failed to send ${failedCount} club post notifications`, {
        clubId,
        postId: post.id
      });
    }

  } catch (error) {
    logger.error('Error notifying club members', { clubId, postId: post.id, error });
  }
}
```

Also update ClubService to track membership status:
```typescript
// In services/club-service.ts
type ClubMember = {
  id: string;
  clubId: string;
  userId: string;
  role: 'ADMIN' | 'COACH' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  hasLeftClub: boolean;
  joinedAt: string;
  leftAt?: string;
};

async getActiveMembers(clubId: string): Promise<Result<ClubMember[], ServiceError>> {
  try {
    const allMembers = await this.getClubMembers(clubId);

    const activeMembers = allMembers.filter(m =>
      m.status === 'ACTIVE' && !m.hasLeftClub
    );

    return ok(activeMembers);
  } catch (error) {
    return err({
      code: 'STORAGE',
      message: 'Failed to get active club members'
    });
  }
}

async leaveClub(clubId: string, userId: string): Promise<Result<void, ServiceError>> {
  // When user leaves club, mark hasLeftClub = true
  const member = await this.getMember(clubId, userId);

  if (member) {
    member.hasLeftClub = true;
    member.leftAt = new Date().toISOString();
    member.status = 'INACTIVE';

    await this.updateMember(member);
  }

  // ... rest of leave logic
}
```

Test cases:
- Post created (only active members notified)
- Ex-member leaves club, new post created (ex-member not notified)
- Member with notifications disabled (not notified)
- Author creates post (doesn't notify self)
- Club with 50 members, 5 left, 3 muted (42 notifications sent)
- Logging shows excluded counts
```

**Acceptance Criteria**:
- [ ] Only active club members notified
- [ ] Ex-members excluded from notifications
- [ ] Members with notifications disabled excluded
- [ ] Author not notified of own post
- [ ] Logging shows member counts (total, active, excluded)
- [ ] ClubService tracks hasLeftClub status
- [ ] leaveClub updates member status correctly
- [ ] No notifications sent to inactive/left users

---

## Item 284: Event RSVP Can Submit GOING When Full

**File**: `app/events/[id]/rsvp.tsx` ~lines 316-357

**Problem**: RSVP form allows submitting "Going" when event is full. Client-side check missing. Backend rejects, but user wasted time filling form. Poor UX.

**Prompt**:
```
Add capacity check to event RSVP submission.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/events/[id]/rsvp.tsx
Lines: ~316-357 (RSVP submission)

Current behavior:
- User fills RSVP form with status "Going"
- No check if event capacity reached
- Submit goes to backend
- Backend rejects with "Event full"
- User frustrated

Requirements:
1. Check capacity before allowing "Going" submission
2. Disable "Going" button when event full
3. Show "Event Full" banner
4. Offer waitlist option if enabled
5. Allow "Can't Go" even when full (for those already registered)

Implementation:
```typescript
const [event, setEvent] = useState<Event | null>(null);
const [currentRSVPs, setCurrentRSVPs] = useState(0);

// Load event details
useEffect(() => {
  const loadEvent = async () => {
    const result = await EventCrudService.getById(eventId);
    if (result.success) {
      setEvent(result.data);
    }

    const rsvpCountResult = await EventRsvpService.getRSVPCount(eventId);
    if (rsvpCountResult.success) {
      setCurrentRSVPs(rsvpCountResult.data);
    }
  };

  loadEvent();
}, [eventId]);

// Calculate availability
const totalCapacity = event?.maxCapacity || 0;
const spotsRemaining = Math.max(0, totalCapacity - currentRSVPs);
const isFull = spotsRemaining === 0;
const userRsvp = event?.userRSVP;  // User's existing RSVP status

// Can submit "Going" if:
// - Event not full, OR
// - User already RSVP'd "Going" (updating other fields)
const canSubmitGoing = !isFull || userRsvp === 'GOING';

// Full event banner
{isFull && userRsvp !== 'GOING' && (
  <SurfaceCard style={{
    backgroundColor: withAlpha(colors.error, 0.1),
    padding: Spacing.sm,
    marginBottom: Spacing.md
  }}>
    <Row style={{ gap: Spacing.xs }}>
      <Ionicons name="people" size={20} color={colors.error} />
      <Column style={{ flex: 1 }}>
        <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary }]}>
          Event Full
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
          This event has reached maximum capacity ({totalCapacity} attendees).
        </ThemedText>
      </Column>
    </Row>
  </SurfaceCard>
)}

// RSVP buttons
<Row style={{ gap: Spacing.sm }}>
  <Button
    label={isFull && userRsvp !== 'GOING' ? 'Event Full' : 'Going'}
    variant="primary"
    onPress={() => handleRsvpSubmit('GOING')}
    disabled={!canSubmitGoing || isPastDeadline}
    style={{ flex: 1 }}
    icon={isFull ? 'lock-closed' : 'checkmark-circle'}
  />

  <Button
    label="Can't Go"
    variant="outline"
    onPress={() => handleRsvpSubmit('CANT_GO')}
    disabled={isPastDeadline}
    style={{ flex: 1 }}
    icon="close-circle"
  />
</Row>

// Waitlist option if event full
{isFull && event.waitlistEnabled && userRsvp !== 'GOING' && (
  <Button
    label="Join Waitlist"
    variant="secondary"
    onPress={handleJoinWaitlist}
    icon="list"
    style={{ marginTop: Spacing.sm }}
  />
)}

// Validation in submit handler
const handleRsvpSubmit = async (status: 'GOING' | 'CANT_GO') => {
  // Check capacity again (defensive programming)
  if (status === 'GOING' && !canSubmitGoing) {
    showToast({
      type: 'error',
      message: 'This event is now full. Join the waitlist instead.'
    });
    return;
  }

  // Check deadline (covered in Sprint 1 Item 15)
  if (isPastDeadline) {
    showToast({
      type: 'error',
      message: 'RSVP deadline has passed'
    });
    return;
  }

  setIsSubmitting(true);

  const result = await EventRsvpService.submitRsvp({
    eventId,
    userId: currentUserId,
    status,
    guestCount,
    dietaryRequirements,
    notes
  });

  if (!result.success) {
    showToast({ type: 'error', message: result.error.message });
    setIsSubmitting(false);
    return;
  }

  showToast({
    type: 'success',
    message: `RSVP updated to "${status}"`
  });

  emitTyped('EVENT_RSVP_UPDATED', {
    eventId,
    userId: currentUserId,
    status
  });

  setIsSubmitting(false);
  router.back();
};
```

Also handle capacity in backend (defensive):
```typescript
// In services/event-rsvp-service.ts
async submitRsvp(data: RsvpData): Promise<Result<Rsvp, ServiceError>> {
  if (data.status === 'GOING') {
    const event = await EventCrudService.getById(data.eventId);
    const currentCount = await this.getRSVPCount(data.eventId);

    // Check if user already RSVP'd (updating existing)
    const existingRsvp = await this.getUserRsvp(data.eventId, data.userId);

    if (!existingRsvp && currentCount >= event.maxCapacity) {
      return err({
        code: 'CONFLICT',
        message: 'Event has reached maximum capacity'
      });
    }
  }

  // Proceed with RSVP creation/update
}
```

Test cases:
- Event with 10 capacity, 5 RSVPs (Going enabled, shows "5 spots remaining")
- Event with 10 capacity, 10 RSVPs (Going disabled, shows "Event Full" banner)
- Full event with waitlist enabled (Waitlist button shown)
- User already RSVP'd Going, event now full (can update dietary requirements)
- Attempt to submit Going when full (client validates, shows toast)
- Backend validation catches concurrent RSVP race condition
```

**Acceptance Criteria**:
- [ ] Capacity checked before allowing "Going" submission
- [ ] "Going" button disabled when event full
- [ ] "Event Full" banner shown when capacity reached
- [ ] Waitlist button shown if enabled and event full
- [ ] User can update existing "Going" RSVP even when full
- [ ] "Can't Go" always available (even when full)
- [ ] Backend validates capacity (defensive)
- [ ] Toast error shown if submit attempted when full
- [ ] Spots remaining shown in UI

---

## Item 312: GroupSessionCard Stale RSVP Counts

**File**: `components/group/group-session-card.tsx` ~lines 26, 166-168

**Problem**: Group session card shows RSVP count loaded on mount. User RSVPs, count doesn't update. Card shows "5/10 going" but after user RSVPs, still shows "5/10" instead of "6/10".

**Prompt**:
```
Fix group session card to update RSVP count in real-time.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/group/group-session-card.tsx
Lines: ~26 (RSVP count), ~166-168 (count display)

Current behavior:
- Card receives session prop with rsvpCount
- User RSVPs from card or detail screen
- rsvpCount not updated
- Stale count shown

Requirements:
1. Subscribe to SESSION_RSVP_UPDATED event
2. Increment/decrement count based on RSVP change
3. Fetch fresh count on mount
4. Update count when user's RSVP changes
5. Show loading state during update

Implementation:
```typescript
import { onTyped } from '@/services/event-bus';

type GroupSessionCardProps = {
  session: GroupSession;
  onPress?: () => void;
};

const GroupSessionCard = ({ session, onPress }: GroupSessionCardProps) => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();  // from hooks/use-auth.tsx
  const currentUserId = currentUser?.id;

  // Local state for real-time count
  const [rsvpCount, setRsvpCount] = useState(session.rsvpCount || 0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Load fresh count on mount
  useEffect(() => {
    const loadRsvpCount = async () => {
      setIsLoadingCount(true);
      const result = await SessionRsvpService.getRsvpCount(session.id);
      if (result.success) {
        setRsvpCount(result.data);
      }
      setIsLoadingCount(false);
    };

    loadRsvpCount();
  }, [session.id]);

  // Subscribe to RSVP updates
  useEffect(() => {
    const handleRsvpUpdate = (event: {
      sessionId: string;
      userId: string;
      previousStatus: RsvpStatus | null;
      newStatus: RsvpStatus;
    }) => {
      // Only update for this session
      if (event.sessionId !== session.id) return;

      // Update count based on status change
      setRsvpCount(prev => {
        let newCount = prev;

        // Previous status was GOING, new is not → decrement
        if (event.previousStatus === 'GOING' && event.newStatus !== 'GOING') {
          newCount = Math.max(0, prev - 1);
        }
        // Previous status was not GOING, new is GOING → increment
        else if (event.previousStatus !== 'GOING' && event.newStatus === 'GOING') {
          newCount = prev + 1;
        }

        return newCount;
      });
    };

    const unsub = onTyped('SESSION_RSVP_UPDATED', handleRsvpUpdate);

    return unsub;
  }, [session.id]);

  const spotsRemaining = session.maxCapacity - rsvpCount;

  return (
    <Clickable onPress={onPress} accessibilityLabel={`View ${session.name} details`}>
      <SurfaceCard style={{ padding: Spacing.md }}>
        {/* Session details */}
        <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>
              {session.name}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {format(session.date, 'EEE, d MMM • HH:mm')}
            </ThemedText>
          </Column>

          <Badge
            label={`£${session.price}`}
            variant="neutral"
          />
        </Row>

        {/* RSVP count */}
        <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
          <Ionicons name="people" size={16} color={colors.textSecondary} />

          {isLoadingCount ? (
            <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
              Loading...
            </ThemedText>
          ) : (
            <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
              {rsvpCount}/{session.maxCapacity} going
              {spotsRemaining > 0 && (
                <ThemedText style={{ color: colors.primary }}>
                  {' '}• {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
                </ThemedText>
              )}
            </ThemedText>
          )}

          {spotsRemaining === 0 && (
            <Badge label="Full" variant="error" size="small" />
          )}
        </Row>
      </SurfaceCard>
    </Clickable>
  );
};
```

Also update RSVP service to emit detailed events:
```typescript
// In services/event-rsvp-service.ts or session-rsvp-service.ts
async updateRsvp(data: RsvpData): Promise<Result<Rsvp, ServiceError>> {
  // Get existing RSVP to know previous status
  const existingRsvp = await this.getUserRsvp(data.sessionId, data.userId);
  const previousStatus = existingRsvp?.status || null;

  // Update RSVP
  const result = await this.saveRsvp(data);

  if (result.success) {
    // Emit event with previous and new status
    emitTyped('SESSION_RSVP_UPDATED', {
      sessionId: data.sessionId,
      userId: data.userId,
      previousStatus,
      newStatus: data.status
    });
  }

  return result;
}
```

Test cases:
- Load card (count fetched and displayed)
- User RSVPs from card (count increments immediately)
- User RSVPs from detail screen (card count updates)
- User changes RSVP from Going → Can't Go (count decrements)
- Multiple cards on screen, one updated (only relevant card updates)
- Event emitted with previousStatus=null, newStatus=GOING (count +1)
- Event emitted with previousStatus=GOING, newStatus=CANT_GO (count -1)
```

**Acceptance Criteria**:
- [ ] RSVP count loaded fresh on mount
- [ ] Count updates in real-time via events
- [ ] Increment when status changes to GOING
- [ ] Decrement when status changes away from GOING
- [ ] Loading state shown during initial fetch
- [ ] Spots remaining calculated correctly
- [ ] "Full" badge shown when capacity reached
- [ ] Event subscription cleaned up on unmount
- [ ] Only updates for matching sessionId

---

## Item 315: FeedPost Like/Comment No Loading State

**File**: `components/club/FeedPost.tsx` ~lines 167-197

**Problem**: Liking or commenting on post has no loading feedback. User taps heart, nothing happens for 500ms, then heart fills. User taps multiple times thinking it didn't work, creating duplicate requests.

**Prompt**:
```
Add loading state to feed post like and comment actions.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/club/FeedPost.tsx
Lines: ~167-197 (like/comment buttons)

Current behavior:
- User taps like button
- No visual feedback
- 500ms later, like count increments
- User may tap multiple times (race condition)

Requirements:
1. Show loading spinner on like button during request
2. Disable like button during request
3. Optimistic update: show liked state immediately
4. Rollback if API fails
5. Same for comment submission

Implementation:
```typescript
const FeedPost = ({ post }: { post: Post }) => {
  const { colors } = useTheme();
  const { currentUser } = useAuth();  // from hooks/use-auth.tsx
  const currentUserId = currentUser?.id;

  const [isLiked, setIsLiked] = useState(post.isLikedByUser);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;  // Prevent double-tap

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiking(true);

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await SocialFeedService.toggleLike(post.id, currentUserId);

    if (!result.success) {
      // Rollback on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);

      showToast({ type: 'error', message: result.error.message });
    }

    setIsLiking(false);
  };

  const handleComment = async () => {
    if (isCommenting || !commentText.trim()) return;

    setIsCommenting(true);

    const result = await SocialFeedService.addComment({
      postId: post.id,
      userId: currentUserId,
      text: commentText.trim()
    });

    if (!result.success) {
      showToast({ type: 'error', message: result.error.message });
      setIsCommenting(false);
      return;
    }

    // Clear input and refresh comments
    setCommentText('');
    setIsCommenting(false);

    showToast({
      type: 'success',
      message: 'Comment added'
    });

    // Emit event to refresh post
    emitTyped('POST_COMMENTED', {
      postId: post.id,
      commentId: result.data.id
    });
  };

  return (
    <SurfaceCard style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
      {/* Post content */}

      {/* Like/Comment buttons */}
      <Row style={{ gap: Spacing.lg, marginTop: Spacing.sm }}>
        {/* Like button */}
        <Clickable
          onPress={handleLike}
          disabled={isLiking}
          hitSlop={8}
          accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
        >
          <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
            {isLiking ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? colors.error : colors.textSecondary}
              />
            )}
            <ThemedText style={[
              Typography.bodySmall,
              { color: isLiked ? colors.error : colors.textSecondary }
            ]}>
              {likeCount}
            </ThemedText>
          </Row>
        </Clickable>

        {/* Comment button */}
        <Clickable onPress={() => setShowComments(!showComments)} hitSlop={8} accessibilityLabel="Toggle comments">
          <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {post.commentCount}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>

      {/* Comment input */}
      {showComments && (
        <Row style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            style={[/* input styles */]}
            editable={!isCommenting}
          />
          <Button
            label="Post"
            variant="primary"
            onPress={handleComment}
            disabled={!commentText.trim() || isCommenting}
            loading={isCommenting}
            size="compact"
          />
        </Row>
      )}
    </SurfaceCard>
  );
};
```

Optional: Like animation
```typescript
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

const LikeButton = ({ isLiked, onPress, isLoading }: Props) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePress = () => {
    scale.value = withSpring(1.2, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });

    onPress();
  };

  return (
    <Clickable onPress={handlePress} disabled={isLoading} accessibilityLabel={isLiked ? 'Unlike' : 'Like'}>
      <Animated.View style={animatedStyle}>
        {isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} />
        )}
      </Animated.View>
    </Clickable>
  );
};
```

Test cases:
- Tap like (optimistic update, spinner shown, count increments)
- API succeeds (spinner disappears, liked state persists)
- API fails (spinner disappears, rollback to previous state, error toast)
- Double-tap like (second tap ignored during first request)
- Tap comment with empty text (button disabled)
- Submit comment (loading state shown, input disabled, success toast)
- Comment submission fails (error toast, input re-enabled)
```

**Acceptance Criteria**:
- [ ] Like button shows loading spinner during request
- [ ] Like button disabled during request (no double-tap)
- [ ] Optimistic update for instant feedback
- [ ] Rollback on API failure
- [ ] Haptic feedback on like
- [ ] Comment button shows loading state
- [ ] Comment input disabled during submission
- [ ] Success/error toast shown for both actions
- [ ] Like animation (optional, nice-to-have)
- [ ] Events emitted for cross-component updates

---

## Item 318: Tab Bar Badge Doesn't Update on Read (Duplicate of Item 214)

**Status**: Covered by Item 214. No additional work needed.

---

## Sprint 1 Summary

**Total Items**: 8 items (excluding duplicates)
**Effort**: 11 engineer-days
**Risk**: Medium (event-bus heavy, real-time updates, race conditions)

**Success Criteria**:
- [ ] Typing indicator works in all chat threads
- [ ] Tab bar message badge updates in real-time
- [ ] Social feed notifications exclude ex-club members
- [ ] Event RSVP blocked when capacity reached
- [ ] Group session RSVP counts update in real-time
- [ ] Feed post like/comment has loading states
- [ ] No duplicate requests from double-taps
- [ ] All event subscriptions cleaned up on unmount

**Testing Strategy**:
1. Real-time tests: Two devices, verify typing indicator, badge updates
2. Race condition tests: Rapid taps, slow network, concurrent actions
3. Event subscription tests: Multiple components, ensure cleanup
4. Edge cases: Full events, ex-members, disabled notifications
5. Performance: Large clubs (100+ members), ensure notification filtering efficient

**Deployment**:
- Medium risk: Heavy reliance on event-bus, potential for memory leaks if cleanup incorrect
- Monitor: Event listener counts (should not grow unbounded), notification delivery rates
- Test: User-initiated testing with real notifications before full rollout
- Rollback: Previous version if event-bus causes performance issues

**Dependencies**:
- Requires MessagingService.getUnreadCount() method
- Requires ClubService.getActiveMembers() and member status tracking
- Requires event-bus events: USER_TYPING, USER_STOPPED_TYPING, MESSAGE_RECEIVED, MESSAGES_MARKED_READ, THREAD_OPENED, SESSION_RSVP_UPDATED, POST_COMMENTED
- Requires NotificationPreferencesService for checking user preferences

**Follow-up Work**:
- Sprint 2: UX polish (explanations, bulk actions, help text)
- Add analytics for typing indicator usage
- Performance optimization for large club notification filtering
- Consider server-side event-bus for true real-time (currently client-only)
