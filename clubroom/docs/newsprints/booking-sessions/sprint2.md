# Booking & Sessions Sprint 2: UX Improvements

**Goal**: Fix UX issues in booking and session management that don't break core functionality but create friction, confusion, and poor mobile experience. These are polish items that improve parent and coach satisfaction.

**Priority**: P1 — Pre-launch polish
**Effort**: 8 engineer-days
**Dependencies**: Sprint 1 (broken logic fixes)

---

## Item 203: Booking Schedule Auto-Selects First Date

**File**: `app/book/[coachId]/schedule.tsx` ~lines 91-99

**Problem**: Calendar auto-selects first available date on load. Parent sees date highlighted before they've chosen anything. Confusing: "Did I tap that? Is this the date I want?" Parent often re-taps the same date, wasting time.

**Prompt**:
```
Remove auto-selection from booking schedule calendar.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/book/[coachId]/schedule.tsx
Lines: ~91-99 (calendar initialization)

Current behavior:
- useEffect runs on mount
- Finds first available date in coach availability
- Sets selectedDate to first available
- Calendar shows date highlighted
- Parent confused: did I select this?

Requirements:
1. Don't auto-select any date on load
2. Show placeholder state: "Select a date to see available times"
3. Highlight available dates (dots/indicators)
4. Show helper text: "Tap a date to view available times"
5. First tap selects date and loads times

Implementation:
```typescript
const [selectedDate, setSelectedDate] = useState<Date | null>(null);  // Was: useState(firstAvailableDate)
const [availableTimes, setAvailableTimes] = useState<TimeSlot[]>([]);

// Remove auto-selection useEffect
// useEffect(() => {
//   setSelectedDate(getFirstAvailableDate(availability));
// }, []);

// Load times only when date selected
useEffect(() => {
  if (!selectedDate) {
    setAvailableTimes([]);
    return;
  }

  const loadTimesForDate = async () => {
    setIsLoadingTimes(true);
    const result = await AvailabilityService.getAvailableSlots({
      coachId,
      date: selectedDate,
      sessionTypeId
    });

    if (result.success) {
      setAvailableTimes(result.data);
    }

    setIsLoadingTimes(false);
  };

  loadTimesForDate();
}, [selectedDate]);

// Placeholder state when no date selected
{!selectedDate ? (
  <Center style={{ padding: Spacing.xl }}>
    <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
    <ThemedText style={[Typography.body, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
      Select a date to view available times
    </ThemedText>
  </Center>
) : isLoadingTimes ? (
  <LoadingState message="Loading available times..." />
) : availableTimes.length === 0 ? (
  <EmptyState
    icon="time-outline"
    title="No times available"
    message="This date is fully booked. Try another date."
  />
) : (
  <FlatList
    data={availableTimes}
    renderItem={({ item }) => <TimeSlotCard slot={item} onSelect={handleTimeSelect} />}
    keyExtractor={item => item.id}
  />
)}

// Calendar component
<Calendar
  markedDates={{
    ...getMarkedDates(availability),  // Dots for available dates
    ...(selectedDate && {
      [format(selectedDate, 'yyyy-MM-dd')]: {
        selected: true,
        selectedColor: colors.primary
      }
    })
  }}
  onDayPress={(day) => {
    setSelectedDate(new Date(day.dateString));
  }}
  minDate={format(new Date(), 'yyyy-MM-dd')}  // Can't book in past
  theme={{
    todayTextColor: colors.primary,
    selectedDayBackgroundColor: colors.primary,
    dotColor: colors.primary,
    // ... other theme
  }}
/>
```

Helper function for marking available dates:
```typescript
const getMarkedDates = (availability: AvailabilityBlock[]) => {
  const marked: Record<string, MarkedDate> = {};

  availability.forEach(block => {
    const dateStr = format(block.date, 'yyyy-MM-dd');
    marked[dateStr] = {
      marked: true,
      dotColor: colors.primary
    };
  });

  return marked;
};
```

Test cases:
- Load booking schedule (no date selected, placeholder shown)
- Tap available date (date selected, times load)
- Tap unavailable date (no action, or show toast "No times available")
- Available dates show dots in calendar
- Selected date highlighted in primary color
- Tap same date again (stays selected, times remain)
```

**Acceptance Criteria**:
- [ ] No auto-selection on load
- [ ] Placeholder state shown when no date selected
- [ ] Helper text explains action needed
- [ ] Available dates marked with dots
- [ ] First user tap selects date and loads times
- [ ] Selected date highlighted in primary color
- [ ] Empty state shown when selected date has no times
- [ ] Loading state shown while fetching times

---

## Item 222: Waitlist Shows Count Not Position

**File**: `components/group/waitlist-banner.tsx` ~lines 34-36

**Problem**: Banner shows "3 people on waitlist" but doesn't show user's position. Parent doesn't know if they're #1 (likely to get spot) or #15 (unlikely). Need to show position.

**Prompt**:
```
Add user position to waitlist banner.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/group/waitlist-banner.tsx
Lines: ~34-36 (banner text)

Current behavior:
- Shows total waitlist count only
- Text: "3 people on the waitlist"
- User doesn't know their position

Requirements:
1. Show user's position in waitlist
2. Show total count
3. Format: "You're #2 of 5 on the waitlist"
4. Show estimated likelihood (optional)
5. Different message if user is #1

Implementation:
```typescript
type WaitlistBannerProps = {
  sessionId: string;
  userId: string;
  totalOnWaitlist: number;
  userPosition: number;  // 1-indexed
};

const WaitlistBanner = ({ sessionId, userId, totalOnWaitlist, userPosition }: WaitlistBannerProps) => {
  const { colors } = useTheme();

  const getMessage = () => {
    if (userPosition === 1) {
      return `You're next on the waitlist! ${totalOnWaitlist > 1 ? `${totalOnWaitlist - 1} others waiting.` : ''}`;
    }

    if (userPosition <= 3) {
      return `You're #${userPosition} of ${totalOnWaitlist} on the waitlist. Good chance of getting a spot!`;
    }

    return `You're #${userPosition} of ${totalOnWaitlist} on the waitlist.`;
  };

  const getIcon = () => {
    if (userPosition === 1) return 'trophy-outline';
    if (userPosition <= 3) return 'arrow-up-circle-outline';
    return 'list-outline';
  };

  const getColor = () => {
    if (userPosition === 1) return colors.success;
    if (userPosition <= 3) return colors.primary;
    return colors.textSecondary;
  };

  return (
    <SurfaceCard style={{
      backgroundColor: withAlpha(getColor(), 0.1),
      padding: Spacing.sm,
      marginBottom: Spacing.md
    }}>
      <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
        <Ionicons name={getIcon()} size={20} color={getColor()} />
        <Column style={{ flex: 1 }}>
          <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary }]}>
            {getMessage()}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
            We'll notify you if a spot opens up.
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
};
```

Also update parent component to fetch user position:
```typescript
const { data: waitlistData } = useWaitlistPosition(sessionId, currentUserId);

<WaitlistBanner
  sessionId={sessionId}
  userId={currentUserId}
  totalOnWaitlist={waitlistData.total}
  userPosition={waitlistData.userPosition}
/>
```

Hook implementation:
```typescript
const useWaitlistPosition = (sessionId: string, userId: string) => {
  const [data, setData] = useState({ total: 0, userPosition: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await SessionWaitlistService.getUserPosition(sessionId, userId);
      if (result.success) {
        setData({
          total: result.data.totalOnWaitlist,
          userPosition: result.data.position
        });
      }
      setIsLoading(false);
    };

    load();
  }, [sessionId, userId]);

  return { data, isLoading };
};
```

Test cases:
- User is #1 (shows "You're next!", trophy icon, green tint)
- User is #2 (shows "Good chance!", up arrow, blue tint)
- User is #10 (shows position, list icon, gray tint)
- Only user on waitlist (shows "You're next! No others waiting")
- Waitlist position updates when someone ahead cancels
```

**Acceptance Criteria**:
- [ ] User's position shown: "#X of Y"
- [ ] Different messages based on position (1st, top 3, other)
- [ ] Icon and color vary by likelihood
- [ ] Encouraging message for top 3 positions
- [ ] Total count shown
- [ ] Notification reminder shown
- [ ] Updates when waitlist changes
- [ ] Design tokens used for colors

---

## Item 225: Who's Going No Pagination

**File**: `components/group/whos-going-card.tsx` ~lines 206-222

**Problem**: "Who's Going" list renders all attendees in a FlatList. For large group sessions (50+ attendees), this causes performance issues and excessive scrolling. Need pagination or "Show More" pattern.

**Prompt**:
```
Add pagination to Who's Going attendee list.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/group/whos-going-card.tsx
Lines: ~206-222 (attendee FlatList)

Current behavior:
- FlatList with all attendees (no limit)
- 50+ attendees: slow rendering, long scroll
- No "Show More" functionality

Requirements:
1. Show first 10 attendees initially
2. "Show More" button to load next 10
3. Show total count
4. "Show All" button when < 20 remaining
5. Collapse back to 10 with "Show Less"

Implementation:
```typescript
const WhosGoingCard = ({ attendees }: { attendees: Participant[] }) => {
  const [displayCount, setDisplayCount] = useState(10);
  const { colors } = useTheme();

  const visibleAttendees = attendees.slice(0, displayCount);
  const remainingCount = Math.max(0, attendees.length - displayCount);

  const handleShowMore = () => {
    setDisplayCount(prev => Math.min(prev + 10, attendees.length));
  };

  const handleShowAll = () => {
    setDisplayCount(attendees.length);
  };

  const handleShowLess = () => {
    setDisplayCount(10);
  };

  return (
    <SurfaceCard style={{ padding: Spacing.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText style={Typography.subheading}>
          Who's Going
        </ThemedText>
        <Badge label={`${attendees.length}`} variant="neutral" />
      </Row>

      <Column style={{ gap: Spacing.xs }}>
        {visibleAttendees.map(attendee => (
          <Row key={attendee.id} style={{ gap: Spacing.xs, alignItems: 'center' }}>
            <Avatar source={{ uri: attendee.photoUrl }} size={32} />
            <ThemedText style={Typography.body}>{attendee.name}</ThemedText>
            {attendee.isPaid && (
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            )}
          </Row>
        ))}
      </Column>

      {remainingCount > 0 && (
        <Column style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
          <ThemedText style={[Typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            {remainingCount} more attending
          </ThemedText>

          {remainingCount <= 20 ? (
            <Button
              label="Show All"
              variant="ghost"
              onPress={handleShowAll}
              size="compact"
            />
          ) : (
            <Button
              label="Show 10 More"
              variant="ghost"
              onPress={handleShowMore}
              size="compact"
            />
          )}
        </Column>
      )}

      {displayCount > 10 && (
        <Button
          label="Show Less"
          variant="ghost"
          onPress={handleShowLess}
          size="compact"
          icon="chevron-up"
        />
      )}
    </SurfaceCard>
  );
};
```

Alternative: Use FlatList with onEndReached (infinite scroll)
```typescript
const [displayCount, setDisplayCount] = useState(10);

const handleLoadMore = () => {
  if (displayCount < attendees.length) {
    setDisplayCount(prev => prev + 10);
  }
};

<FlatList
  data={attendees.slice(0, displayCount)}
  renderItem={({ item }) => <AttendeeRow attendee={item} />}
  keyExtractor={item => item.id}
  onEndReached={handleLoadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={
    displayCount < attendees.length ? (
      <ThemedText style={[Typography.caption, { textAlign: 'center', padding: Spacing.sm }]}>
        {attendees.length - displayCount} more...
      </ThemedText>
    ) : null
  }
/>
```

Recommend: "Show More" button (more explicit control)

Test cases:
- 5 attendees (all shown, no button)
- 15 attendees (10 shown, "Show 5 More" button)
- 50 attendees (10 shown, "Show 10 More" button)
- Tap "Show More" (next 10 loaded)
- Tap "Show All" when < 20 remaining (all loaded)
- Tap "Show Less" (collapses back to 10)
- Large list: smooth rendering, no lag
```

**Acceptance Criteria**:
- [ ] First 10 attendees shown initially
- [ ] "Show More" button loads next 10
- [ ] "Show All" shown when < 20 remaining
- [ ] "Show Less" collapses back to 10
- [ ] Remaining count shown above button
- [ ] Smooth performance with 100+ attendees
- [ ] Total count badge shown in header
- [ ] Paid status indicator shown per attendee

---

## Item 235: Expired Invite Still Shows Buttons Briefly

**File**: `components/invite/invite-card.tsx` ~lines 55-57, 168-169

**Problem**: Invite cards show Accept/Decline buttons on render, then check expiry and hide buttons. Creates flash: buttons visible for 200ms, then disappear. Confusing and unprofessional.

**Prompt**:
```
Fix invite card button flash on expired invites.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/invite/invite-card.tsx
Lines: ~55-57 (expiry check), ~168-169 (action buttons)

Current behavior:
- Card renders with buttons immediately
- useEffect checks expiry
- If expired, buttons hidden
- Visual flash: buttons appear then disappear

Requirements:
1. Check expiry before rendering
2. Don't show buttons on expired invites
3. Show "Expired" badge instead
4. No visual flash or layout shift
5. Skeleton state while loading (if async check)

Implementation:
```typescript
const InviteCard = ({ invite }: { invite: Invite }) => {
  const { colors } = useTheme();

  // Check expiry immediately (synchronous)
  const isExpired = invite.expiresAt && new Date() > new Date(invite.expiresAt);
  const isAccepted = invite.status === 'ACCEPTED';
  const isDeclined = invite.status === 'DECLINED';

  const canRespond = !isExpired && !isAccepted && !isDeclined;

  return (
    <SurfaceCard style={{ padding: Spacing.md }}>
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText style={Typography.subheading}>
          {invite.sessionType.name}
        </ThemedText>

        {/* Status badges - conditional, no flash */}
        {isExpired && (
          <Badge label="Expired" variant="neutral" />
        )}
        {isAccepted && (
          <Badge label="Accepted" variant="success" />
        )}
        {isDeclined && (
          <Badge label="Declined" variant="error" />
        )}
      </Row>

      {/* Details */}
      <Column style={{ gap: Spacing.xxs, marginBottom: Spacing.sm }}>
        <Row style={{ gap: Spacing.xs }}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
            {format(invite.sessionDate, 'EEEE, d MMMM yyyy')}
          </ThemedText>
        </Row>

        <Row style={{ gap: Spacing.xs }}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
            {format(invite.sessionDate, 'HH:mm')} ({invite.duration} min)
          </ThemedText>
        </Row>

        {isExpired && (
          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="close-circle-outline" size={16} color={colors.error} />
            <ThemedText style={[Typography.caption, { color: colors.error }]}>
              Expired {format(invite.expiresAt, 'd MMM yyyy')}
            </ThemedText>
          </Row>
        )}
      </Column>

      {/* Action buttons - only render if can respond */}
      {canRespond && (
        <Row style={{ gap: Spacing.xs }}>
          <Button
            label="Accept"
            variant="primary"
            onPress={() => handleAccept(invite.id)}
            style={{ flex: 1 }}
            icon="checkmark-circle"
          />
          <Button
            label="Decline"
            variant="outline"
            onPress={() => handleDecline(invite.id)}
            style={{ flex: 1 }}
            icon="close-circle"
          />
        </Row>
      )}

      {/* Expired message (instead of buttons) */}
      {isExpired && (
        <ThemedText style={[Typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
          This invite has expired and can no longer be accepted.
        </ThemedText>
      )}
    </SurfaceCard>
  );
};
```

If expiry check is async (e.g., needs server time):
```typescript
const [isCheckingExpiry, setIsCheckingExpiry] = useState(true);
const [isExpired, setIsExpired] = useState(false);

useEffect(() => {
  const checkExpiry = async () => {
    const serverTime = await getServerTime();  // If needed
    const expired = invite.expiresAt && serverTime > new Date(invite.expiresAt);
    setIsExpired(expired);
    setIsCheckingExpiry(false);
  };

  checkExpiry();
}, []);

// Render skeleton while checking
if (isCheckingExpiry) {
  return <InviteCardSkeleton />;
}
```

Recommend: Synchronous check (use client time, good enough)

Test cases:
- Non-expired invite (buttons shown)
- Expired invite (badge + message shown, no buttons)
- Just-expired invite (no flash, correct state immediately)
- Accepted invite (badge shown, no buttons)
- Declined invite (badge shown, no buttons)
- No layout shift between states
```

**Acceptance Criteria**:
- [ ] Expiry checked before rendering buttons
- [ ] No button flash on expired invites
- [ ] "Expired" badge shown for expired invites
- [ ] Expiry date shown in message
- [ ] Accept/Decline buttons only rendered when valid
- [ ] No layout shift between valid/expired states
- [ ] Status badges (Accepted/Declined) shown correctly
- [ ] Synchronous check (no skeleton needed)

---

## Item 237: Invite List Card No Recurring Indicator

**File**: `components/invite/invite-list-card.tsx`

**Problem**: Invite list doesn't indicate if invite is for recurring session. Parent accepts, thinking it's one session, then surprised by 8 sessions. Need recurring indicator.

**Prompt**:
```
Add recurring session indicator to invite list cards.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/invite/invite-list-card.tsx
Lines: Full file review (likely ~50-100 for card content)

Current behavior:
- Invite card shows date, time, session type
- No indication if recurring (weekly, multiple instances)
- Parent accepts, surprised by commitment

Requirements:
1. Show "Recurring" badge for recurring invites
2. Show recurrence pattern: "Weekly for 8 weeks"
3. Show total sessions count
4. Show date range: "Jan 15 - Mar 10"
5. Expand to show all session dates (optional)

Implementation:
```typescript
const InviteListCard = ({ invite }: { invite: Invite }) => {
  const { colors } = useTheme();
  const isRecurring = invite.recurrencePattern !== null;

  return (
    <SurfaceCard style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm }}>
        <Column style={{ flex: 1 }}>
          <ThemedText style={Typography.subheading}>
            {invite.sessionType.name}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
            {invite.coachName}
          </ThemedText>
        </Column>

        {isRecurring && (
          <Badge
            label="Recurring"
            variant="info"
            icon="repeat"
          />
        )}
      </Row>

      {isRecurring ? (
        <Column style={{ gap: Spacing.xxs, marginBottom: Spacing.sm }}>
          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {getRecurrenceDescription(invite.recurrencePattern)}
            </ThemedText>
          </Row>

          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {invite.totalSessions} sessions • {format(invite.startDate, 'd MMM')} - {format(invite.endDate, 'd MMM yyyy')}
            </ThemedText>
          </Row>

          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              £{invite.pricePerSession} per session (£{invite.totalPrice} total)
            </ThemedText>
          </Row>
        </Column>
      ) : (
        <Column style={{ gap: Spacing.xxs, marginBottom: Spacing.sm }}>
          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {format(invite.sessionDate, 'EEEE, d MMMM yyyy')}
            </ThemedText>
          </Row>

          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              {format(invite.sessionDate, 'HH:mm')} ({invite.duration} min)
            </ThemedText>
          </Row>

          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              £{invite.price}
            </ThemedText>
          </Row>
        </Column>
      )}

      {/* Action buttons same as before */}
    </SurfaceCard>
  );
};

const getRecurrenceDescription = (pattern: RecurrencePattern): string => {
  switch (pattern.frequency) {
    case 'WEEKLY':
      return `Every ${pattern.dayOfWeek} for ${pattern.occurrences} weeks`;
    case 'DAILY':
      return `Daily for ${pattern.occurrences} days`;
    case 'CUSTOM':
      return `${pattern.occurrences} sessions`;
    default:
      return 'Recurring';
  }
};
```

Optional: Expandable session list
```typescript
const [isExpanded, setIsExpanded] = useState(false);

{isRecurring && (
  <>
    <Clickable onPress={() => setIsExpanded(!isExpanded)} accessibilityLabel={isExpanded ? 'Hide all sessions' : `View all ${invite.totalSessions} sessions`}>
      <Row style={{ gap: Spacing.xs, alignItems: 'center' }}>
        <ThemedText style={[Typography.caption, { color: colors.primary }]}>
          {isExpanded ? 'Hide' : 'View'} all {invite.totalSessions} sessions
        </ThemedText>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.primary}
        />
      </Row>
    </Clickable>

    {isExpanded && (
      <Column style={{ gap: Spacing.xxs, marginTop: Spacing.sm, paddingLeft: Spacing.md }}>
        {invite.sessionDates.map((date, i) => (
          <ThemedText key={i} style={[Typography.caption, { color: colors.textSecondary }]}>
            {i + 1}. {format(date, 'EEE, d MMM yyyy HH:mm')}
          </ThemedText>
        ))}
      </Column>
    )}
  </>
)}
```

Test cases:
- Single session invite (no recurring badge)
- Weekly recurring invite (badge + "Every Monday for 8 weeks")
- Daily recurring invite (badge + "Daily for 5 days")
- Expand session list (all 8 dates shown)
- Collapse session list (dates hidden)
- Total price shown for recurring (£20 × 8 = £160)
```

**Acceptance Criteria**:
- [ ] "Recurring" badge shown for recurring invites
- [ ] Recurrence pattern described clearly
- [ ] Total sessions count shown
- [ ] Date range shown (start - end)
- [ ] Price per session + total price shown
- [ ] Expandable session list (optional, nice-to-have)
- [ ] Single session invites unchanged (no badge)
- [ ] Visual distinction between single and recurring

---

## Item 239: No Timezone Handling

> **Scope Note**: This item is a full cross-cutting concern affecting 50+ files. It should be moved to its own dedicated sprint rather than being bundled into this UX polish sprint. The implementation below is a starting point for the timezone-specific sprint.

**Files**: All scheduling-related files (session creation, booking, availability)

**Problem**: Systematic gap. All date/time handling uses `new Date()` with no timezone awareness. Coach in London creates 10am session, parent in New York sees 5am. Causes massive confusion and missed sessions.

**Prompt**:
```
Add timezone handling to all date/time operations (LARGE TASK).

Scope: All files that create, display, or compare dates/times.

Context:
- Current: All dates stored as ISO strings without timezone
- Current: All displays use local device timezone
- Problem: Coach and athlete in different timezones see different times
- Problem: Booking a "10am" session means different things to different users

Solution approaches:
1. **Store in UTC, display in user timezone** (RECOMMENDED)
   - All dates saved as UTC ISO strings
   - Convert to user timezone on display
   - Use library: date-fns-tz or Luxon

2. **Store timezone with each session**
   - Session has `timezone` field (e.g., "Europe/London")
   - Display in that timezone or user's preference
   - More complex, but more accurate

Implementation (Approach 1 - UTC):

Step 1: Add timezone utility helpers
```typescript
// utils/timezone.ts
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const formatInUserTimezone = (date: Date | string, formatStr: string): string => {
  const userTz = getUserTimezone();
  return formatInTimeZone(date, userTz, formatStr);
};

export const convertToUserTimezone = (utcDate: Date | string): Date => {
  const userTz = getUserTimezone();
  return toZonedTime(utcDate, userTz);
};

export const convertToUTC = (localDate: Date): string => {
  return localDate.toISOString();  // Already UTC
};
```

Step 2: Update all date displays
- Replace: `format(date, 'HH:mm')`
- With: `formatInUserTimezone(date, 'HH:mm')`

Step 3: Update all date inputs
- When user selects time, convert to UTC before saving
- When displaying existing time, convert from UTC to user timezone

Step 4: Update all comparisons
- Ensure dates compared in UTC
- Example: `new Date() > new Date(booking.startTime)` (both UTC)

Files to update (examples):
1. components/bookings/create-session-date-picker.tsx
2. components/session/create-schedule-step.tsx
3. app/book/[coachId]/schedule.tsx
4. services/booking-crud-service.ts
5. services/availability-service.ts
... (50+ files likely)

This is a MASSIVE undertaking. Recommend:
- Sprint 2: Add timezone utils, update 10 highest-impact files
- Future sprint: Comprehensive timezone audit and migration

High-priority files:
1. Booking creation (wizard, schedule selection)
2. Session creation (coach session setup)
3. Booking detail display (parent/coach views)
4. Calendar/availability display
5. RSVP deadline checks

For EACH file:
- Import timezone utils
- Replace format() with formatInUserTimezone()
- Replace date inputs with timezone-aware pickers
- Test with different device timezones

Testing:
- Change device timezone to different continent
- Create session, verify time displayed correctly
- Book session, verify time matches coach's intent
- Check RSVP deadlines with timezone offset
```

**Acceptance Criteria** (for high-priority files):
- [ ] Timezone utility helpers created
- [ ] Date displays use formatInUserTimezone()
- [ ] Date inputs convert to UTC on save
- [ ] Date comparisons use UTC
- [ ] Booking times accurate across timezones
- [ ] Session times shown in user's timezone
- [ ] RSVP/registration deadlines timezone-aware
- [ ] No hardcoded timezone assumptions

**Note**: This item is partially complete in Sprint 2. Full timezone support requires dedicated sprint.

---

## Item 249: Recurring Instance Cancel No Athlete Notification

**File**: `components/sessions/session-instance-manager.tsx` ~lines 79-84

**Problem**: Coach cancels one instance of recurring session. Instance cancelled in database but athletes not notified. Athletes show up expecting session, coach not there.

**Prompt**:
```
Add athlete notification when recurring session instance cancelled.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/sessions/session-instance-manager.tsx
Lines: ~79-84 (cancel instance handler)

Current behavior:
- handleCancelInstance calls RecurringBookingService.cancelInstance
- Instance status updated to CANCELLED
- No notification sent to registered athletes
- Athletes don't know session cancelled

Requirements:
1. Send push notification to all registered athletes
2. Send email notification (if email enabled)
3. Notification includes: session date, cancellation reason, rescheduling info
4. Show confirmation that notifications sent
5. Log notification failures

Implementation:
```typescript
const handleCancelInstance = async (instanceId: string, reason: string, notes?: string) => {
  setIsCancelling(true);

  try {
    // 1. Cancel the instance
    const cancelResult = await RecurringBookingService.cancelInstance(instanceId, {
      cancelledBy: currentUserId,
      reason,
      notes
    });

    if (!cancelResult.success) {
      showToast({ type: 'error', message: cancelResult.error.message });
      return;
    }

    // 2. Get all registered athletes for this instance
    const instance = cancelResult.data;
    const athletesResult = await RecurringBookingService.getInstanceParticipants(instanceId);

    if (!athletesResult.success) {
      logger.error('Failed to get instance participants for notification', { instanceId });
      // Still show success for cancellation
      showToast({
        type: 'warning',
        message: 'Session cancelled, but failed to notify some athletes. Please contact them manually.'
      });
      return;
    }

    const athletes = athletesResult.data;

    // 3. Send notifications to all athletes
    const notificationPromises = athletes.map(async (athlete) => {
      // Send push notification
      await NotificationSenderService.send({
        recipientId: athlete.parentId,
        type: 'SESSION_CANCELLED',
        title: 'Session Cancelled',
        body: `${instance.sessionType.name} on ${format(instance.date, 'd MMM yyyy')} has been cancelled. Reason: ${reason}`,
        data: {
          instanceId,
          bookingId: athlete.bookingId,
          reason,
          notes
        }
      });

      // Send email (if enabled)
      if (athlete.parent.emailNotificationsEnabled) {
        await NotificationSenderService.sendEmail({
          to: athlete.parent.email,
          subject: 'Session Cancelled',
          template: 'session-cancelled',
          data: {
            athleteName: athlete.name,
            sessionName: instance.sessionType.name,
            sessionDate: format(instance.date, 'EEEE, d MMMM yyyy'),
            sessionTime: format(instance.date, 'HH:mm'),
            reason,
            notes,
            coachName: currentUser.name,
            coachPhone: currentUser.phone
          }
        });
      }
    });

    const results = await Promise.allSettled(notificationPromises);

    const failedCount = results.filter(r => r.status === 'rejected').length;

    if (failedCount > 0) {
      logger.warn(`Failed to send ${failedCount} notifications for instance ${instanceId}`);

      showToast({
        type: 'warning',
        message: `Session cancelled. ${athletes.length - failedCount} of ${athletes.length} athletes notified.`
      });
    } else {
      showToast({
        type: 'success',
        message: `Session cancelled. All ${athletes.length} athletes notified.`
      });
    }

    // 4. Emit event for other screens to refresh
    // NOTE: Use ServiceEvents constant. If RECURRING_INSTANCE_CANCELLED doesn't exist in
    // event-bus.ts, add it to ServiceEvents and EventPayloads before using.
    emitTyped(ServiceEvents.RECURRING_INSTANCE_CANCELLED, {
      instanceId,
      seriesId: instance.seriesId,
      cancelledBy: currentUserId,
    });

    // 5. Close modal / navigate back
    onCancelComplete?.();

  } catch (error) {
    logger.error('Error cancelling recurring instance', { instanceId, error });
    showToast({
      type: 'error',
      message: 'Failed to cancel session'
    });
  } finally {
    setIsCancelling(false);
  }
};
```

Also add confirmation before cancel (use a confirmation modal state, not Alert.alert):
```typescript
const [showCancelConfirm, setShowCancelConfirm] = useState(false);
const [pendingCancelInstanceId, setPendingCancelInstanceId] = useState<string | null>(null);

const showCancelConfirmation = useCallback((instanceId: string) => {
  setPendingCancelInstanceId(instanceId);
  setShowCancelConfirm(true);
}, []);

const handleConfirmCancel = useCallback(() => {
  if (pendingCancelInstanceId) {
    handleCancelInstance(pendingCancelInstanceId, reason, notes);
  }
  setShowCancelConfirm(false);
}, [pendingCancelInstanceId, reason, notes]);

// Render a confirmation modal in JSX using showCancelConfirm state,
// with "Keep Session" and "Cancel Session" (destructive) options.
// Message: "This will cancel one session in the recurring series.
// All registered athletes will be notified. Continue?"
```

Test cases:
- Cancel instance with 5 athletes (all 5 notified)
- Cancel instance with push notifications disabled for 1 athlete (4 push, 5 emails)
- Cancel instance with notification failure (toast shows partial success)
- Cancel instance with no athletes (success, no notifications)
- Verify athletes receive push notification
- Verify athletes receive email (if enabled)
- Event emitted for other screens to refresh
```

**Acceptance Criteria**:
- [ ] All registered athletes notified on instance cancellation
- [ ] Push notifications sent with session details
- [ ] Email notifications sent (if enabled)
- [ ] Notification includes reason and coach contact
- [ ] Toast shows notification success/failure count
- [ ] Event emitted for cross-screen updates
- [ ] Confirmation dialog before cancel
- [ ] Logging for notification failures
- [ ] No athletes missed (Promise.allSettled ensures all attempts)

---

## Item 255: Post Distribution Recurring Not Shown (Duplicate of Item 237)

**Status**: Covered by Item 237. No additional work needed.

---

## Sprint 2 Summary

**Total Items**: 8 items (excluding duplicates)
**Effort**: 8 engineer-days
**Risk**: Medium (Item 239 timezone is complex and high-risk)

**Success Criteria**:
- [ ] No auto-selection in booking calendar
- [ ] Waitlist shows user position, not just count
- [ ] Large attendee lists paginated (10 per page)
- [ ] Expired invites don't flash buttons
- [ ] Recurring invites clearly marked with pattern
- [ ] Recurring instance cancellations notify athletes
- [ ] Timezone handling added to high-priority files
- [ ] All UX improvements tested on real devices

**Testing Strategy**:
1. Manual QA: Test each UX flow on iOS and Android
2. Performance: Test pagination with 100+ attendees
3. Timezone: Test with device set to different timezones
4. Notifications: Verify push/email sent on instance cancel
5. Edge cases: Expired invites, empty waitlists, single attendees

**Deployment**:
- Medium risk: Item 239 (timezone) has potential for breaking existing date logic
- Recommend: Deploy timezone changes separately from other items
- Monitor: Booking creation times, session display accuracy, notification delivery
- Rollback plan: Revert timezone utils if issues detected

**Dependencies**:
- Item 249 requires NotificationSenderService with email support
- Item 239 requires date-fns-tz or Luxon library (add to package.json)
- Builds on Sprint 1 fixes (correct booking state, proper cancellation flow)

**Follow-up Work**:
- Item 239 continuation: Full timezone audit across all 50+ date-handling files
- Add user timezone preference setting (override device timezone)
- Comprehensive timezone testing with international users
- Performance optimization for waitlist position calculation
