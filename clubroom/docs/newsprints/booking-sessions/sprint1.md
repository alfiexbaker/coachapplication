# Booking & Sessions Sprint 1: Broken Logic

**Goal**: Fix critical bugs in booking flow, session management, and attendance tracking that break core coach and parent workflows. These are functional bugs that prevent bookings from completing or cause incorrect state.

**Priority**: P0 — Launch blockers
**Effort**: 14 engineer-days
**Dependencies**: None

---

## Item 1: Booking Detail No Parent Actions

**File**: `app/(tabs)/bookings/[id].tsx`

**Problem**: Parent views booking detail screen but sees read-only information with no actions. Can't cancel, can't reschedule, can't contact coach. Dead-end screen. Coach sees Cancel/Reschedule buttons, parent doesn't.

**Prompt**:
```
Add parent action buttons to booking detail screen.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/(tabs)/bookings/[id].tsx
Lines: Full file review needed (likely ~150-200 for action buttons section)

Current behavior:
- Screen shows booking details (date, time, coach, child)
- Coach role: sees Cancel, Reschedule, Complete buttons
- Parent role: sees nothing, read-only
- Parent can't take any action on their booking

Requirements:
1. Show parent-appropriate actions based on booking status
2. Cancel booking (if > 24h notice)
3. Request reschedule (opens message to coach)
4. Contact coach (opens message thread)
5. View session notes (if session completed)
6. Respect cancellation policy timing

Parent actions by booking status:
- PENDING: Cancel, Contact Coach
- CONFIRMED: Cancel (if > 24h), Request Reschedule, Contact Coach
- COMPLETED: View Notes, Rebook, Contact Coach
- CANCELLED: Rebook, Contact Coach

Implementation:
- Add role detection: `const { currentUser } = useAuth()` (from `hooks/use-auth.tsx`, NOT useAuthStore)
  `const userRole = currentUser?.role`
- Use `Routes.*` constants for all navigation (verify route constants exist in `navigation/routes.ts`; add if missing)
- Conditional action buttons:
  ```typescript
  const ParentActions = () => {
    const now = new Date();
    const sessionStart = new Date(booking.startTime);
    const hoursUntilSession = (sessionStart.getTime() - now.getTime()) / 3600000;
    const canCancel = hoursUntilSession > 24; // 24h policy

    return (
      <Column style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
        {booking.status === 'CONFIRMED' && canCancel && (
          <Button
            label="Cancel Booking"
            variant="outline"
            onPress={handleCancelPress}
            icon="close-circle-outline"
          />
        )}

        {booking.status === 'CONFIRMED' && (
          <Button
            label="Request Reschedule"
            variant="outline"
            onPress={handleRescheduleRequest}
            icon="calendar-outline"
          />
        )}

        {booking.status === 'COMPLETED' && (
          <Button
            label="View Session Notes"
            variant="outline"
            onPress={handleViewNotes}
            icon="document-text-outline"
          />
        )}

        <Button
          label="Contact Coach"
          variant="secondary"
          onPress={handleContactCoach}
          icon="chatbubble-outline"
        />

        {(booking.status === 'COMPLETED' || booking.status === 'CANCELLED') && (
          <Button
            label="Book Again"
            variant="primary"
            onPress={handleRebook}
            icon="repeat-outline"
          />
        )}
      </Column>
    );
  };
  ```
- Handler implementations:
  ```typescript
  // Use a confirmation modal state instead of Alert.alert (consistent with navigation sprint pattern)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelPress = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    router.push(Routes.BOOKING_CANCEL(id)); // Verify Routes constant exists
  }, [id]);

  const handleRescheduleRequest = useCallback(() => {
    router.push({
      pathname: Routes.CHAT, // Use Routes.* constants — verify they exist
      params: {
        recipientId: booking.coachId,
        template: 'reschedule_request',
        bookingId: booking.id
      }
    });
  }, [booking]);

  const handleContactCoach = useCallback(() => {
    router.push({ pathname: Routes.CHAT, params: { recipientId: booking.coachId } });
  }, [booking.coachId]);

  const handleViewNotes = useCallback(() => {
    router.push(Routes.BOOKING_NOTES(id)); // Verify Routes constant exists
  }, [id]);

  const handleRebook = useCallback(() => {
    router.push({
      pathname: Routes.BOOK_SCHEDULE(booking.coachId), // Verify Routes constant exists
      params: { sessionType: booking.sessionTypeId }
    });
  }, [booking]);

  // Note: Render a confirmation modal in JSX using the showCancelConfirm state,
  // with "Keep Booking" and "Cancel Session" (destructive) options.
  ```
- Show cancellation policy notice:
  ```typescript
  {!canCancel && booking.status === 'CONFIRMED' && (
    <SurfaceCard style={{ backgroundColor: withAlpha(colors.warning, 0.1), padding: Spacing.sm }}>
      <Row style={{ gap: Spacing.xs }}>
        <Ionicons name="information-circle" size={20} color={colors.warning} />
        <Column style={{ flex: 1 }}>
          <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary }]}>
            Cancellation Period
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
            Free cancellation is not available within 24 hours of the session. Contact coach to discuss options.
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  )}
  ```

Test cases:
- Parent views CONFIRMED booking > 24h away (sees Cancel, Reschedule, Contact)
- Parent views CONFIRMED booking < 24h away (no Cancel, sees notice)
- Parent views COMPLETED booking (sees View Notes, Rebook, Contact)
- Parent views CANCELLED booking (sees Rebook, Contact)
- Tap Cancel (alert shown, navigates to cancel flow)
- Tap Reschedule (opens message with template)
- Tap Contact Coach (opens chat)
```

**Acceptance Criteria**:
- [ ] Parent sees role-appropriate action buttons
- [ ] Actions conditional on booking status
- [ ] 24h cancellation policy enforced in UI
- [ ] All buttons navigate to correct screens
- [ ] Cancellation policy notice shown when within 24h
- [ ] Rebook button pre-fills session type
- [ ] Reschedule request opens message template
- [ ] Design tokens used for all UI

---

## Item 199: Booking Wizard No Final Confirmation

**File**: `components/ui/booking/booking-wizard.tsx` ~lines 10-115

**Problem**: Booking wizard goes straight from "Select Time" to "Booking Created" with no confirmation step. Parent doesn't see total cost, session details, or cancellation policy before submitting. Leads to booking errors and support tickets.

**Prompt**:
```
Add final confirmation step to booking wizard.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/ui/booking/booking-wizard.tsx
Lines: ~10-115 (wizard steps)

Current behavior:
- Step 1: Select Coach
- Step 2: Select Session Type
- Step 3: Select Date/Time
- [Missing: Confirmation]
- Submit → Booking Created

Requirements:
1. Add Step 4: Review & Confirm
2. Show all booking details for review
3. Show total cost breakdown
4. Show cancellation policy
5. Require explicit confirmation before submit
6. Allow back navigation to edit

Confirmation screen content:
- Session summary (type, duration, location)
- Date and time
- Coach name and avatar
- Child name
- Price breakdown (session + extras)
- Cancellation policy summary
- Confirm button (prominent)
- Back to edit button

Implementation:
- Add confirmation step to wizard flow:
  ```typescript
  const WIZARD_STEPS = [
    'select_coach',
    'select_type',
    'select_time',
    'confirm',  // NEW
  ];
  ```
- Confirmation screen component:
  ```typescript
  const ConfirmationStep = ({ booking, onConfirm, onBack }: Props) => {
    const totalCost = calculateTotalCost(booking);

    return (
      <ScrollView>
        <ThemedText style={[Typography.heading, { marginBottom: Spacing.sm }]}>
          Review Booking
        </ThemedText>

        {/* Session Summary Card */}
        <SurfaceCard style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
          <Row style={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <Avatar source={{ uri: booking.coach.photoUrl }} size={44} />
            <Column style={{ flex: 1 }}>
              <ThemedText style={Typography.subheading}>{booking.coach.name}</ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
                {booking.sessionType.name}
              </ThemedText>
            </Column>
          </Row>

          <Spacer height={Spacing.xs} />

          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              Date
            </ThemedText>
            <ThemedText style={Typography.body}>
              {format(booking.date, 'EEEE, d MMMM yyyy')}
            </ThemedText>
          </Row>

          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              Time
            </ThemedText>
            <ThemedText style={Typography.body}>
              {format(booking.startTime, 'HH:mm')} - {format(booking.endTime, 'HH:mm')}
            </ThemedText>
          </Row>

          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              Duration
            </ThemedText>
            <ThemedText style={Typography.body}>
              {booking.sessionType.duration} minutes
            </ThemedText>
          </Row>

          <Row style={{ justifyContent: 'space-between' }}>
            <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
              Athlete
            </ThemedText>
            <ThemedText style={Typography.body}>
              {booking.child.firstName} {booking.child.lastName}
            </ThemedText>
          </Row>
        </SurfaceCard>

        {/* Price Breakdown Card */}
        <SurfaceCard style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
          <ThemedText style={[Typography.subheading, { marginBottom: Spacing.sm }]}>
            Price Breakdown
          </ThemedText>

          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
            <ThemedText style={Typography.body}>Session</ThemedText>
            <ThemedText style={Typography.body}>£{booking.sessionType.price}</ThemedText>
          </Row>

          {booking.extras?.map(extra => (
            <Row key={extra.id} style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
              <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
                {extra.name}
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: colors.textSecondary }]}>
                £{extra.price}
              </ThemedText>
            </Row>
          ))}

          <Spacer height={1} style={{ backgroundColor: colors.border, marginVertical: Spacing.xs }} />

          <Row style={{ justifyContent: 'space-between' }}>
            <ThemedText style={Typography.subheading}>Total</ThemedText>
            <ThemedText style={[Typography.subheading, { color: colors.primary }]}>
              £{totalCost}
            </ThemedText>
          </Row>
        </SurfaceCard>

        {/* Cancellation Policy Card */}
        <SurfaceCard style={{
          padding: Spacing.sm,
          backgroundColor: withAlpha(colors.info, 0.1),
          marginBottom: Spacing.md
        }}>
          <Row style={{ gap: Spacing.xs }}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Column style={{ flex: 1 }}>
              <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary, marginBottom: Spacing.xxs }]}>
                Cancellation Policy
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
                Free cancellation up to 24 hours before the session. Cancellations within 24 hours may incur a fee.
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>

        {/* Action Buttons */}
        <Column style={{ gap: Spacing.sm }}>
          <Button
            label="Confirm Booking"
            variant="primary"
            onPress={onConfirm}
            icon="checkmark-circle"
          />
          <Button
            label="Back to Edit"
            variant="outline"
            onPress={onBack}
          />
        </Column>
      </ScrollView>
    );
  };
  ```
- Update wizard navigation to include confirmation step
- handleConfirm creates booking via BookingCrudService

Test cases:
- Complete wizard to confirmation step (all details shown correctly)
- Tap "Back to Edit" (returns to time selection)
- Edit time, return to confirmation (updated time shown)
- Tap "Confirm Booking" (booking created successfully)
- Booking with extras (price breakdown includes extras)
- Booking without extras (only session price shown)
```

**Acceptance Criteria**:
- [ ] Confirmation step added as Step 4 in wizard
- [ ] All booking details shown for review
- [ ] Price breakdown clear and accurate
- [ ] Cancellation policy displayed prominently
- [ ] "Confirm Booking" button creates booking
- [ ] "Back to Edit" allows navigation to previous steps
- [ ] Layout works on small screens (scrollable)
- [ ] Design tokens used throughout

---

## Item 221: Roll Call Present AND Late Simultaneously

**File**: `components/group/roll-call-modal.tsx` ~lines 151-178

**Problem**: Attendance status chips have no mutual exclusion. Coach can mark athlete as both Present and Late. This breaks attendance statistics and creates ambiguous records.

**Prompt**:
```
Add mutual exclusion to roll call attendance status chips.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/group/roll-call-modal.tsx
Lines: ~151-178 (attendance status selection)

Current behavior:
- Three chips: Present, Late, Absent
- Can select multiple chips for same athlete
- Can be Present + Late simultaneously
- Breaks attendance queries: counted twice

Requirements:
1. Enforce single selection per athlete (radio behavior)
2. Selecting new status deselects previous
3. Visual feedback: only one chip selected at a time
4. Default state: no status (null)
5. Can deselect to return to null (optional)

Implementation:
- Change from multi-select to single-select:
  ```typescript
  type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | null;

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    participants.reduce((acc, p) => ({ ...acc, [p.id]: null }), {})
  );

  const handleStatusChange = (athleteId: string, newStatus: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [athleteId]: prev[athleteId] === newStatus ? null : newStatus  // Toggle or set
    }));
  };
  ```
- Update UI to show radio behavior:
  ```typescript
  const AttendanceRow = ({ athlete }: { athlete: Participant }) => {
    const currentStatus = attendance[athlete.id];

    return (
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <Row style={{ gap: Spacing.xs, flex: 1 }}>
          <Avatar source={{ uri: athlete.photoUrl }} size={32} />
          <ThemedText style={Typography.body}>{athlete.name}</ThemedText>
        </Row>

        <Row style={{ gap: Spacing.xs }}>
          <Chip
            label="Present"
            selected={currentStatus === 'PRESENT'}
            onPress={() => handleStatusChange(athlete.id, 'PRESENT')}
            icon={currentStatus === 'PRESENT' ? 'checkmark-circle' : undefined}
            variant="success"
          />
          <Chip
            label="Late"
            selected={currentStatus === 'LATE'}
            onPress={() => handleStatusChange(athlete.id, 'LATE')}
            icon={currentStatus === 'LATE' ? 'time' : undefined}
            variant="warning"
          />
          <Chip
            label="Absent"
            selected={currentStatus === 'ABSENT'}
            onPress={() => handleStatusChange(athlete.id, 'ABSENT')}
            icon={currentStatus === 'ABSENT' ? 'close-circle' : undefined}
            variant="error"
          />
        </Row>
      </Row>
    );
  };
  ```
- Validation before save:
  ```typescript
  const handleSave = async () => {
    // Ensure all athletes have a status
    const unmarked = participants.filter(p => attendance[p.id] === null);

    if (unmarked.length > 0) {
      // Use a confirmation modal state (avoid Alert.alert — use a Toast or confirmation modal)
      showToast({
        type: 'warning',
        message: `${unmarked.length} athlete(s) not yet marked. Please mark all before saving.`
      });
      return;
    }

    await saveAttendance();
  };
  ```

Test cases:
- Mark athlete as Present (Present chip selected, others deselected)
- Tap Late (Late selected, Present deselected)
- Tap Present again (Present selected, Late deselected)
- Tap Present twice (second tap deselects, returns to null)
- Save with unmarked athletes (alert shown)
- Save with all marked (succeeds)
```

**Acceptance Criteria**:
- [ ] Single attendance status per athlete enforced
- [ ] Selecting new status deselects previous (radio behavior)
- [ ] Can deselect to return to unmarked (null)
- [ ] Visual feedback: only one chip selected
- [ ] Validation warns about unmarked athletes
- [ ] Chip colors match status (green/yellow/red)
- [ ] No database records with multiple statuses

---

## Item 240: Overlapping Availability No Validation

**File**: `hooks/use-add-template.ts` ~line 55

**Problem**: Coach can create overlapping availability blocks for same day. Example: 9am-11am AND 10am-12pm both saved. This breaks slot generation in booking flow, causing double-bookings or no available slots shown.

**Prompt**:
```
Add overlap validation to availability template creation.

File: /Users/tubton/Desktop/coachapplication/clubroom/hooks/use-add-template.ts
Lines: ~55 (save handler)

Current behavior:
- User adds multiple blocks for Monday
- No validation if blocks overlap
- Both blocks saved to AsyncStorage
- Slot generation breaks: overlapping slots shown or hidden

Requirements:
1. Detect overlapping time blocks for same day
2. Show error when overlap detected
3. Prevent saving overlapping blocks
4. Allow adjacent blocks (11:00-12:00 and 12:00-13:00 is OK)
5. Visual feedback: highlight overlapping blocks

Implementation:
- Add overlap detection helper:
  ```typescript
  type TimeBlock = {
    day: string;
    startTime: string;  // HH:mm format
    endTime: string;
  };

  const doBlocksOverlap = (block1: TimeBlock, block2: TimeBlock): boolean => {
    if (block1.day !== block2.day) return false;

    const start1 = parseTime(block1.startTime);
    const end1 = parseTime(block1.endTime);
    const start2 = parseTime(block2.startTime);
    const end2 = parseTime(block2.endTime);

    // Overlap if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;  // Convert to minutes since midnight
  };

  const findOverlaps = (blocks: TimeBlock[]): [number, number][] => {
    const overlaps: [number, number][] = [];

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (doBlocksOverlap(blocks[i], blocks[j])) {
          overlaps.push([i, j]);
        }
      }
    }

    return overlaps;
  };
  ```
- Validate before save:
  ```typescript
  const handleSave = async () => {
    const overlaps = findOverlaps(availabilityBlocks);

    if (overlaps.length > 0) {
      const [i, j] = overlaps[0];  // Show first overlap
      const block1 = availabilityBlocks[i];
      const block2 = availabilityBlocks[j];

      return err({
        code: 'CONFLICT',
        message: `${block1.day} ${block1.startTime}-${block1.endTime} overlaps with ${block2.startTime}-${block2.endTime}`
      });
    }

    // Proceed with save
    const result = await AvailabilityService.saveTemplate(availabilityBlocks);
    return result;
  };
  ```
- Show error in UI:
  ```typescript
  const result = await handleSave();
  if (!result.success) {
    showToast({ type: 'error', message: result.error.message });
    // Highlight overlapping blocks (optional)
    setOverlappingBlocks(overlaps);
  }
  ```

Edge cases:
- Adjacent blocks: 10:00-11:00 and 11:00-12:00 (not overlapping, allowed)
- Identical blocks: 10:00-12:00 and 10:00-12:00 (overlapping, blocked)
- Partial overlap: 10:00-12:00 and 11:00-13:00 (overlapping, blocked)
- Different days: Monday 10:00-12:00 and Tuesday 10:00-12:00 (not overlapping, allowed)

Test cases:
- Add Monday 9:00-11:00, then Monday 10:00-12:00 (error shown)
- Add Monday 9:00-11:00, then Monday 11:00-13:00 (allowed, adjacent)
- Add Monday 9:00-12:00, then Monday 9:00-12:00 (error, duplicate)
- Add Monday 9:00-11:00, then Tuesday 9:00-11:00 (allowed, different days)
- Fix overlap by editing time, save again (succeeds)
```

**Acceptance Criteria**:
- [ ] Overlap detection works for all cases
- [ ] Adjacent blocks allowed (end = start)
- [ ] Error shown with specific overlap details
- [ ] Save blocked when overlaps exist
- [ ] Overlapping blocks highlighted in UI (optional)
- [ ] Different days don't trigger overlap
- [ ] Case-insensitive day comparison

---

## Item 241: Blocking Dates with Bookings No Warning

**File**: `components/coach/block-date-modal.tsx` ~lines 117-137

**Problem**: Coach can block dates that already have confirmed bookings. No warning that bookings exist. Blocks date, bookings still show in calendar but coach won't honor them. Creates no-shows and angry parents.

**Prompt**:
```
Add booking conflict check to block date modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/block-date-modal.tsx
Lines: ~117-137 (date selection + save handler)

Current behavior:
- Coach selects date to block
- No check for existing bookings
- Date blocked, bookings still in database
- Parents see confirmed booking, arrive, coach not available

Requirements:
1. Check for existing bookings in selected date range
2. Show warning if bookings exist
3. Require explicit confirmation to proceed
4. Offer to cancel bookings automatically (optional)
5. Show booking details in warning

Implementation:
- Add booking check before save:
  ```typescript
  const checkExistingBookings = async (startDate: Date, endDate: Date): Promise<Booking[]> => {
    const result = await BookingSearchService.findBookingsInDateRange({
      coachId: currentUserId,
      startDate,
      endDate,
      status: ['CONFIRMED', 'PENDING']
    });

    return result.success ? result.data : [];
  };

  const handleSave = async () => {
    // Check for existing bookings
    const existingBookings = await checkExistingBookings(startDate, endDate);

    if (existingBookings.length > 0) {
      // Use a confirmation modal state (consistent with project pattern — avoid Alert.alert)
      setConflictingBookings(existingBookings);
      setShowBlockConfirm(true);
      // Modal renders 3 options: Cancel, Block & Keep Bookings, Block & Cancel Bookings (destructive)
      return;
    }

    // No bookings, proceed
    await saveBlock({ cancelBookings: false });
  };

  const formatBookingList = (bookings: Booking[]): string => {
    return bookings
      .slice(0, 3)  // Show max 3
      .map(b => `• ${format(b.startTime, 'MMM d, HH:mm')} - ${b.childName}`)
      .join('\n')
      + (bookings.length > 3 ? `\n... and ${bookings.length - 3} more` : '');
  };

  const saveBlock = async ({ cancelBookings }: { cancelBookings: boolean }) => {
    // Save block date
    const blockResult = await AvailabilityService.blockDateRange({
      startDate,
      endDate,
      reason,
      notes
    });

    if (!blockResult.success) {
      showToast({ type: 'error', message: blockResult.error.message });
      return;
    }

    // Optionally cancel bookings
    if (cancelBookings) {
      const cancelResult = await bulkCancelBookings(existingBookings, reason);

      if (!cancelResult.success) {
        showToast({
          type: 'error',
          message: 'Dates blocked but failed to cancel some bookings. Please cancel manually.'
        });
      } else {
        showToast({
          type: 'success',
          message: `Dates blocked and ${existingBookings.length} bookings cancelled`
        });
      }
    } else {
      showToast({
        type: 'info',
        message: 'Dates blocked. Remember to cancel conflicting bookings manually.'
      });
    }

    onClose();
  };
  ```

Test cases:
- Block date with no bookings (saves without warning)
- Block date with 2 bookings (alert shows booking list, 3 options)
- Choose "Cancel" (modal stays open, no changes)
- Choose "Block & Keep Bookings" (dates blocked, bookings remain, info toast)
- Choose "Block & Cancel Bookings" (dates blocked, bookings cancelled, success toast)
- Block date range with > 3 bookings (alert shows first 3 + "... and X more")
```

**Acceptance Criteria**:
- [ ] Existing bookings checked before blocking dates
- [ ] Warning alert shown if bookings exist
- [ ] Alert lists affected bookings (max 3 shown)
- [ ] Three options: Cancel action, Block & Keep, Block & Cancel
- [ ] "Block & Cancel" cancels all bookings in range
- [ ] "Block & Keep" shows reminder toast
- [ ] No bookings: saves without warning
- [ ] Booking cancellation uses proper CancellationService

---

## Item 242: Scheduling Rules 0 Notice Allowed

**File**: `components/coach/scheduling-rules-modal.tsx` ~lines 29-36

**Problem**: Minimum notice period can be set to 0 hours. This allows instant bookings, breaking payment flow (no time to process payment) and coach preparation. Should have minimum 1 hour notice.

**Prompt**:
```
Add minimum value validation to scheduling rules notice period.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/scheduling-rules-modal.tsx
Lines: ~29-36 (notice period input)

Current behavior:
- Can set minNoticeHours to 0
- Allows bookings to start immediately
- Breaks payment processing, coach has no prep time

Requirements:
1. Minimum notice: 1 hour (platform policy)
2. Maximum notice: 168 hours (7 days)
3. Show inline error when out of range
4. Disable save when invalid
5. Show helper text: "Recommended: 24 hours"

Implementation:
- Add validation (similar to Sprint 1 Item 12):
  ```typescript
  const validateNoticeHours = (value: string): string | null => {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      return 'Enter a valid number';
    }

    if (parsed < 1) {
      return 'Minimum notice is 1 hour';
    }

    if (parsed > 168) {
      return 'Maximum notice is 7 days (168 hours)';
    }

    return null;
  };

  const handleNoticeHoursChange = (value: string) => {
    setMinNoticeHours(value);
    const error = validateNoticeHours(value);
    setNoticeHoursError(error);
  };
  ```
- Show error text below input when noticeHoursError present
- Disable save: disabled={noticeHoursError !== null || ...}
- Add helper text:
  ```typescript
  <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
    Recommended: 24 hours. This gives you time to prepare and process payment.
  </ThemedText>
  ```

Test cases:
- Enter 0 (error: minimum 1 hour)
- Enter 1 (valid)
- Enter 24 (valid, recommended)
- Enter 169 (error: maximum 168)
- Enter -5 (error: minimum 1)
- Save with error (blocked)
```

**Acceptance Criteria**:
- [ ] Minimum 1 hour enforced
- [ ] Maximum 168 hours enforced
- [ ] Inline error shown for out-of-range values
- [ ] Save disabled when validation fails
- [ ] Helper text recommends 24 hours
- [ ] Error messages clear and actionable

---

## Item 269: Counter-Offer Accept Creates Duplicate Booking

**File**: `services/counter-offer-service.ts` ~lines 326-364

**Problem**: Accepting counter-offer doesn't check if original booking still exists. Race condition: parent accepts, booking created, then accepts again (double-tap or slow network), duplicate booking created. Parent charged twice.

**Prompt**:
```
Add idempotency check to counter-offer acceptance.

File: /Users/tubton/Desktop/coachapplication/clubroom/services/counter-offer-service.ts
Lines: ~326-364 (acceptCounterOffer method)

Current behavior:
- acceptCounterOffer creates booking immediately
- No check if counter-offer already accepted
- No check if resulting booking already exists
- Double-tap creates duplicate bookings

Requirements:
1. Check counter-offer status before accepting
2. Return existing booking if already accepted
3. Use idempotency key to prevent duplicates
4. Update counter-offer status atomically
5. Return error if counter-offer expired or withdrawn

Implementation notes — the REAL counter-offer-service.ts API:
- The service uses `counterOffersCache` and `negotiationsCache` module-level arrays
- Storage helpers: `loadCounterOffersFromStorage()`, `saveCounterOffersToStorage()`
- Storage helpers: `loadNegotiationsFromStorage()`, `saveNegotiationsToStorage()`
- Real method: `counterOfferService.acceptCounterOffer(offerId: string): Promise<Result<CounterOffer, ServiceError>>`
  (takes only `offerId`, not `acceptedBy` — single argument)
- Use `counterOfferService.getCounterOffer(offerId)` to look up an offer (NOT `this.getById()`)
- Idempotency key should be a valid UUID or use `generateId()` from `@/utils/generate-id`

```typescript
// REAL acceptCounterOffer already exists in counter-offer-service.ts at ~line 279.
// The fix should ADD idempotency checks to the existing method body:

async acceptCounterOffer(offerId: string): Promise<Result<CounterOffer, ServiceError>> {
  // Validate offerId format
  if (!offerId || typeof offerId !== 'string') {
    return err({ code: 'VALIDATION', message: 'Invalid counter-offer ID' });
  }

  counterOffersCache = await loadCounterOffersFromStorage();
  const index = counterOffersCache.findIndex((o) => o.id === offerId);

  if (index === -1) {
    return err(notFound('Counter-offer', offerId));
  }

  const offer = counterOffersCache[index];

  // 1. Idempotency: if already accepted, return existing result
  if (offer.status === 'ACCEPTED') {
    logger.info(`Counter-offer ${offerId} already accepted (idempotent return)`);
    return ok(offer);
  }

  // 2. Check if expired
  if (offer.status === 'EXPIRED' || (offer.expiresAt && new Date() > new Date(offer.expiresAt))) {
    return err({ code: 'CONFLICT', message: 'This counter-offer has expired' });
  }

  // 3. Check if already rejected/withdrawn
  if (offer.status === 'REJECTED') {
    return err({ code: 'CONFLICT', message: 'This counter-offer has already been rejected' });
  }

  // 4. Accept — update cache and persist
  counterOffersCache[index] = {
    ...offer,
    status: 'ACCEPTED',
    respondedAt: new Date().toISOString(),
  };

  await saveCounterOffersToStorage(counterOffersCache);

  // 5. Update negotiation status
  negotiationsCache = await loadNegotiationsFromStorage();
  const negotiation = negotiationsCache.find((n) => n.bookingId === offer.bookingId);
  if (negotiation) {
    negotiation.status = 'RESOLVED';
    negotiation.finalTime = offer.proposedTime;
    negotiation.resolvedAt = new Date().toISOString();
  }
  await saveNegotiationsToStorage(negotiationsCache);

  // 6. Emit event (payload must match EventPayloads: offerId, bookingId, respondedAt)
  emitTyped(ServiceEvents.COUNTER_OFFER_ACCEPTED, {
    offerId,
    bookingId: offer.bookingId,
    respondedAt: counterOffersCache[index].respondedAt ?? new Date().toISOString(),
  });

  logger.info(`Counter-offer ${offerId} accepted`);
  return ok(counterOffersCache[index]);
}
```

Note: The real `acceptCounterOffer` in counter-offer-service.ts already creates a booking
via `bookingService.createBooking()` after line 327. The idempotency check above
(returning `ok(offer)` when `offer.status === 'ACCEPTED'`) prevents the duplicate booking
path from being reached. No changes to BookingCrudService are needed for this fix.

Test cases:
- Accept counter-offer (booking created, status updated)
- Accept same counter-offer again (returns existing booking, no duplicate)
- Accept expired counter-offer (error returned)
- Accept withdrawn counter-offer (error returned)
- Double-tap accept button (only one booking created)
- Network delay, retry accept (idempotent, no duplicate)
```

**Acceptance Criteria**:
- [ ] Counter-offer status checked before accepting
- [ ] Already-accepted offers return existing booking (idempotent)
- [ ] Expired/withdrawn offers return error
- [ ] Idempotency key prevents duplicate bookings
- [ ] Status updated atomically after booking creation
- [ ] Event emitted on successful acceptance
- [ ] Logging covers all paths (success, duplicate, error)
- [ ] Double-tap creates only one booking

---

## Item 270: Cancellation Doesn't Update Booking Status

**File**: `services/cancellation-service.ts` ~lines 136-186

**Problem**: Cancellation record created but booking status not updated. Booking shows as CONFIRMED in parent/coach views even after cancellation. Causes confusion and potential double-bookings.

**Prompt**:
```
Fix cancellation service to update booking status.

File: /Users/tubton/Desktop/coachapplication/clubroom/services/cancellation-service.ts
Lines: ~136-186 (cancelBooking method)

Current behavior:
- Cancellation record created in CANCELLATIONS storage
- Booking record not updated
- booking.status still 'CONFIRMED'
- Appears in active bookings list

Requirements:
1. Update booking.status to 'CANCELLED' atomically
2. Add cancellation metadata to booking record
3. Emit event after both updates complete
4. Handle partial failure (cancellation created but booking update fails)
5. Make operation idempotent

Implementation notes — the REAL cancellation-service.ts API:
- Uses `loadRecords()` / `saveRecords()` helper functions (not class methods)
- Storage: `apiClient.get(STORAGE_KEYS.CANCELLATION_RECORDS, [])` / `apiClient.set(STORAGE_KEYS.CANCELLATION_RECORDS, records)`
- Real method: `cancellationService.cancelBooking(bookingId, cancelledBy, details)` at ~line 136
- Uses `CancellationRecord` type (not `Cancellation`)
- Uses `generateId()` from `@/utils/generate-id`
- Uses `ok()`/`err()` from `@/types/result`
- The ACTUAL signature takes 3 params: `(bookingId: string, cancelledBy: string, details: { reason, note?, refundCalculation?, coachId?, familyId? })`

```typescript
async cancelBooking(
  bookingId: string,
  cancelledBy: string,
  details: {
    reason: string;
    note?: string;
    refundCalculation?: RefundCalculation | null;
    coachId?: string;
    familyId?: string;
  },
): Promise<Result<CancellationRecord, ServiceError>> {
  try {
    // 1. Load existing records using the REAL helper
    const records = await loadRecords();

    // 2. Idempotency: check if already cancelled
    const existing = records.find(r => r.bookingId === bookingId);
    if (existing) {
      logger.info(`Booking ${bookingId} already cancelled (idempotent return)`);
      return ok(existing);
    }

    // 3. Calculate refund (using schedulingRulesService)
    const hoursBeforeSession = /* calculate from booking.startTime */;
    const refundResult = schedulingRulesService.calculateRefund(coachId, hoursBeforeSession);

    // 4. Create cancellation record matching CancellationRecord interface
    const record: CancellationRecord = {
      id: generateId('cancel'),
      bookingId,
      cancelledBy,
      cancelledAt: new Date().toISOString(),
      reason,
      reasonCategory,
      note,
      refundAmount: refundResult.refundAmount,
      refundPercentage: refundResult.refundPercentage,
      hoursBeforeSession,
      coachId,
      familyId,
    };

    // 5. Save cancellation record using the REAL helper
    records.push(record);
    await saveRecords(records);

    // 6. CRITICAL FIX: Update booking status to 'CANCELLED'
    //    Use BookingCrudService to update the booking record.
    //    This was the missing step — without it, booking appears CONFIRMED in UI.
    const bookingUpdateResult = await bookingCrudService.update(bookingId, {
      status: 'CANCELLED',
      cancellationId: record.id,
    });

    if (!bookingUpdateResult.success) {
      // Cancellation record was saved but booking update failed.
      // Log error — the cancellation record exists, so we don't roll back.
      // The CANCELLATION_RECORDED event will still fire, and a background
      // reconciliation job can fix the booking status later.
      logger.error('Cancellation recorded but booking status update failed', {
        bookingId,
        cancellationId: record.id,
        error: bookingUpdateResult.error.message,
      });
    }

    // 7. Emit event (actual service uses CANCELLATION_RECORDED, not BOOKING_CANCELLED)
    emitTyped(ServiceEvents.CANCELLATION_RECORDED, {
      cancellationId: record.id,
      bookingId: record.bookingId,
      cancelledBy: record.cancelledBy,
      coachId: record.coachId,
      familyId: record.familyId,
    });

    logger.info(`Booking ${bookingId} cancelled successfully`, { cancellationId: record.id });
    return ok(record);
  } catch (error) {
    logger.error('Error cancelling booking', { bookingId, details: error });
    return err(storageError('Failed to cancel booking'));
  }
}
```

Also add a lookup helper matching the existing pattern:
```typescript
async function findByBookingId(bookingId: string): Promise<CancellationRecord | undefined> {
  const records = await loadRecords();
  return records.find(r => r.bookingId === bookingId);
}
```

Test cases:
- Cancel confirmed booking (status updated to CANCELLED)
- Cancel already-cancelled booking (idempotent, returns existing record)
- Cancellation record created (exists in CANCELLATIONS storage)
- Booking record updated (status = CANCELLED, cancellationId set)
- Event emitted with correct data
- Cancelled booking excluded from active bookings list
- Cancelled booking shows in cancellation history
```

**Acceptance Criteria**:
- [ ] Booking status updated to 'CANCELLED'
- [ ] Cancellation metadata added to booking record
- [ ] Cancellation record created with correct data
- [ ] Operation is idempotent (repeat calls return existing)
- [ ] Event emitted after both updates complete
- [ ] Rollback if booking update fails
- [ ] Logging covers all paths
- [ ] Cancelled bookings excluded from active lists

---

## Item 282: Session RSVP State Mutated Before Async Completes

**File**: `app/session/[id]/rsvp.tsx` ~lines 128-151

**Problem**: RSVP state updated optimistically before API call completes. If API fails, UI shows incorrect state. User taps "Going", sees checkmark, but RSVP never saved. Leads to no-shows.

**Prompt**:
```
Fix optimistic updates in session RSVP screen.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/session/[id]/rsvp.tsx
Lines: ~128-151 (RSVP submit handler)

Current behavior:
- User taps "Going"
- State updated immediately: setRsvpStatus('GOING')
- API call made
- If API fails, state still shows 'GOING'
- User thinks they're registered, but they're not

Requirements:
1. Don't update state until API succeeds
2. Show loading indicator during API call
3. Revert state if API fails
4. Show error toast if API fails
5. Disable buttons during submission

Implementation:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(null);

// Load initial RSVP status
useEffect(() => {
  const loadRSVP = async () => {
    const result = await EventRsvpService.getUserRsvp(sessionId, currentUserId);
    if (result.success && result.data) {
      setRsvpStatus(result.data.status);
    }
  };

  loadRSVP();
}, [sessionId]);

const handleRsvpChange = async (newStatus: RSVPStatus) => {
  if (isSubmitting) return;

  const previousStatus = rsvpStatus;  // Save for rollback

  setIsSubmitting(true);

  // Optimistic update (optional, but must rollback on error)
  // OR wait for API to succeed (safer)
  // Recommend: show loading, don't update state until success

  try {
    const result = await EventRsvpService.updateRsvp({
      sessionId,
      userId: currentUserId,
      status: newStatus,
      guestCount,
      dietaryRequirements,
      notes
    });

    if (!result.success) {
      // API failed, don't update state
      showToast({ type: 'error', message: result.error.message });
      setIsSubmitting(false);
      return;
    }

    // Success: update state
    setRsvpStatus(newStatus);

    showToast({
      type: 'success',
      message: `RSVP updated to "${newStatus}"`
    });

    // Emit event for other screens to refresh
    // NOTE: Use ServiceEvents constant. If SESSION_RSVP_UPDATED doesn't exist in
    // event-bus.ts, add it to ServiceEvents and EventPayloads before using.
    emitTyped(ServiceEvents.SESSION_RSVP_UPDATED, {
      sessionId,
      userId: currentUserId,
      status: newStatus,
    });

  } catch (error) {
    logger.error('RSVP submission failed', { sessionId, newStatus, error });

    showToast({
      type: 'error',
      message: 'Failed to update RSVP. Please try again.'
    });

  } finally {
    setIsSubmitting(false);
  }
};
```

UI updates:
```typescript
<Button
  label="Going"
  variant={rsvpStatus === 'GOING' ? 'primary' : 'outline'}
  onPress={() => handleRsvpChange('GOING')}
  disabled={isSubmitting || isPastDeadline}
  loading={isSubmitting && pendingStatus === 'GOING'}  // Show spinner on this button only
  icon={rsvpStatus === 'GOING' ? 'checkmark-circle' : 'checkmark-circle-outline'}
/>

<Button
  label="Can't Go"
  variant={rsvpStatus === 'CANT_GO' ? 'outline' : 'ghost'}
  onPress={() => handleRsvpChange('CANT_GO')}
  disabled={isSubmitting || isPastDeadline}
  loading={isSubmitting && pendingStatus === 'CANT_GO'}
  icon={rsvpStatus === 'CANT_GO' ? 'close-circle' : 'close-circle-outline'}
/>
```

Alternative: Optimistic update with rollback
```typescript
// Update state immediately
setRsvpStatus(newStatus);

const result = await EventRsvpService.updateRsvp(...);

if (!result.success) {
  // Rollback on failure
  setRsvpStatus(previousStatus);
  showToast({ type: 'error', message: result.error.message });
}
```

Recommend: No optimistic update (wait for API success) - safer for critical actions like RSVP

Test cases:
- Tap "Going" with working API (state updates, success toast)
- Tap "Going" with failing API (state unchanged, error toast)
- Rapid tap "Going" 3 times (only one API call, button disabled during submission)
- Network timeout (error handled gracefully)
- State persists after screen unmount/remount
```

**Acceptance Criteria**:
- [ ] State not updated until API succeeds
- [ ] Loading indicator shown during submission
- [ ] Buttons disabled during submission
- [ ] Error toast shown on API failure
- [ ] State unchanged if API fails
- [ ] Success toast shown on API success
- [ ] Event emitted on successful update
- [ ] Rapid taps don't create multiple API calls
- [ ] RSVP status persists correctly

---

## Item 283: Group Session Registration Active After Deadline

**File**: `app/group-sessions/[id].tsx` ~lines 339-358

**Problem**: Registration button enabled after registration deadline. Parent can tap "Register", payment flow starts, but registration rejected at final step. Wastes time and creates frustration.

**Prompt**:
```
Disable group session registration after deadline.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/group-sessions/[id].tsx
Lines: ~339-358 (registration button)

Current behavior:
- Registration button always enabled if spots available
- No deadline check in UI
- Backend rejects late registrations
- Poor UX: parent goes through flow, then sees error

Requirements:
1. Check if current time > registrationDeadline
2. Disable registration button if past deadline
3. Show banner: "Registration closed"
4. Show deadline date in banner
5. Show waitlist option if applicable

Implementation:
```typescript
import { format } from 'date-fns';

const isPastDeadline = session.registrationDeadline
  ? new Date() > new Date(session.registrationDeadline)
  : false;

const canRegister = !isPastDeadline && session.spotsAvailable > 0 && !isUserRegistered;

// Banner when past deadline
{isPastDeadline && (
  <SurfaceCard style={{
    backgroundColor: withAlpha(colors.warning, 0.1),
    padding: Spacing.sm,
    marginBottom: Spacing.md
  }}>
    <Row style={{ gap: Spacing.xs }}>
      <Ionicons name="time-outline" size={20} color={colors.warning} />
      <Column style={{ flex: 1 }}>
        <ThemedText style={[Typography.bodySmall, { color: colors.textPrimary }]}>
          Registration Closed
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.textSecondary }]}>
          Registration deadline was {format(session.registrationDeadline, 'MMM d, yyyy HH:mm')}
        </ThemedText>
      </Column>
    </Row>
  </SurfaceCard>
)}

// Registration button
<Button
  label={
    isPastDeadline
      ? 'Registration Closed'
      : isUserRegistered
      ? 'Already Registered'
      : `Register (£${session.price})`
  }
  variant="primary"
  onPress={handleRegister}
  disabled={!canRegister}
  icon={isPastDeadline ? 'lock-closed' : 'checkmark-circle'}
/>

// Optional: Waitlist button when past deadline but full
{isPastDeadline && session.waitlistEnabled && (
  <Button
    label="Join Waitlist"
    variant="outline"
    onPress={handleJoinWaitlist}
    icon="list"
  />
)}
```

Also add validation in handleRegister (defensive):
```typescript
const handleRegister = async () => {
  // Check deadline again (defensive programming)
  if (isPastDeadline) {
    showToast({
      type: 'error',
      message: 'Registration deadline has passed'
    });
    return;
  }

  // Proceed with registration
  const result = await SessionRegistrationService.register({
    sessionId,
    userId: currentUserId,
    childId: selectedChildId
  });

  // ... handle result
};
```

Test cases:
- View session before deadline (register button enabled)
- View session after deadline (register button disabled, banner shown)
- View session exactly at deadline (disabled)
- Attempt to register past deadline (toast error, blocked)
- Past deadline with waitlist enabled (waitlist button shown)
```

**Acceptance Criteria**:
- [ ] Registration button disabled after deadline
- [ ] Warning banner shown when past deadline
- [ ] Banner shows deadline date and time
- [ ] Button text changes to "Registration Closed"
- [ ] handleRegister validates deadline (defensive)
- [ ] Waitlist option shown if enabled
- [ ] Before deadline: registration works normally
- [ ] Deadline timezone handled correctly (if applicable)

---

## Sprint 1 Summary

**Total Items**: 10 items
**Effort**: 14 engineer-days
**Risk**: Medium-High (core booking logic, state management, race conditions)

**Success Criteria**:
- [ ] Parents can take actions on their bookings
- [ ] Booking wizard includes confirmation step
- [ ] No duplicate bookings from race conditions
- [ ] Cancellations update booking status correctly
- [ ] Attendance tracking uses single-select (no multi-status)
- [ ] No overlapping availability blocks
- [ ] Coaches warned about existing bookings when blocking dates
- [ ] RSVP state only updates on API success
- [ ] Deadlines enforced in UI for registrations and RSVPs

**Testing Strategy**:
1. Integration tests for booking flow (wizard → confirmation → creation)
2. Race condition tests (double-tap, slow network, retry)
3. State management tests (optimistic updates, rollback)
4. Role-based tests (coach vs parent views and actions)
5. Edge cases: deadlines, overlaps, conflicts

**Deployment**:
- High risk: Changes affect core booking flow
- Recommend phased rollout: 10% → 50% → 100%
- Monitor: Booking creation rate, cancellation rate, error logs
- Rollback plan: Previous version of affected services

**Dependencies**:
- Some fixes require new service methods (e.g., findByIdempotencyKey)
- Event emissions for cross-screen updates
- Cancellation policy enforcement (Item 241 references Item 1's policy logic)

**Follow-up Work**:
- Sprint 2: UX improvements (auto-select, pagination, timezone handling)
- Add comprehensive logging to all booking state changes
- Performance optimization for overlap detection (large availability templates)
