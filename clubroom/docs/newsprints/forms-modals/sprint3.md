# Forms & Modals Sprint 3: Modal Interaction Bugs

**Goal**: Fix modal dismiss behavior, keyboard management, and state persistence issues that cause data loss and poor mobile UX. These are interaction bugs that frustrate users and cause accidental data loss.

**Priority**: P1 — Pre-launch polish
**Effort**: 9 engineer-days
**Dependencies**: Sprint 1, Sprint 2

---

## Item 38: iOS Date Picker Doesn't Auto-Close

**File**: `components/bookings/create-session-date-picker.tsx` ~lines 88-101

**Problem**: On iOS, DateTimePicker modal stays open after date selection. User must tap outside to close, which is non-standard iOS behavior. Expected: picker closes automatically after selection.

**Prompt**:
```
Fix iOS date picker to auto-close after selection.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/bookings/create-session-date-picker.tsx
Lines: ~88-101 (DateTimePicker)

Current behavior (iOS):
- DateTimePicker renders in modal mode
- User taps date
- onChange fires
- Modal stays open (requires tap outside to close)

Expected behavior:
- User taps date
- onChange fires
- Modal closes automatically

Implementation:
- Check DateTimePicker mode: should be 'spinner' or 'compact' for inline, 'default' for modal
- On iOS, use mode='default' which shows modal
- In onChange handler, close modal after updating state:
  ```typescript
  import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      setShowPicker(false); // Close modal
    }

    if (selectedDate) {
      onChange(selectedDate);
    }
  };
  ```
- Ensure showPicker state controls visibility
- On Android, picker auto-closes (default behavior)

Platform differences:
- iOS: manual close needed
- Android: auto-closes on selection
- Web: use HTML input[type=date]

Test cases:
- iOS: Select date → picker closes
- iOS: Tap "Cancel" → picker closes, no change
- Android: Select date → picker closes (default)
- Date state updates correctly after selection
```

**Acceptance Criteria**:
- [ ] iOS date picker closes automatically after date selection
- [ ] onChange fires before picker closes
- [ ] State updates correctly
- [ ] Cancel button works (closes without changing date)
- [ ] Android behavior unchanged
- [ ] No console warnings on platform-specific code

---

## Item 42: Adjust Day Modal Save Disabled No Message

**File**: `components/coach/adjust-day-modal.tsx` ~lines 62-69

**Problem**: Save button disabled when no changes made, but no message explains why. User taps disabled button repeatedly, confused.

**Prompt**:
```
Add explanation text when adjust day save button is disabled.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/adjust-day-modal.tsx
Lines: ~62-69 (save button + disabled logic)

Current behavior:
- Save button disabled when no slots changed
- No visual explanation
- User confusion: "Why can't I save?"

Requirements:
1. Show helper text below save button when disabled due to no changes
2. Don't show text when disabled due to validation errors (separate message)
3. Use subtle color (textSecondary)
4. Text: "No changes to save"

Implementation:
- Detect reason for disabled state:
  ```typescript
  const hasChanges = JSON.stringify(slots) !== JSON.stringify(originalSlots);
  const hasErrors = slots.some(slot => slot.error);

  const saveDisabled = !hasChanges || hasErrors || isSaving;
  ```
- Render helper text conditionally:
  ```typescript
  {saveDisabled && !hasChanges && (
    <ThemedText style={[
      Typography.caption,
      { color: colors.muted, textAlign: 'center', marginTop: Spacing.xs }
    ]}>
      No changes to save
    </ThemedText>
  )}
  {hasErrors && (
    <ThemedText style={[
      Typography.caption,
      { color: colors.error, textAlign: 'center', marginTop: Spacing.xs }
    ]}>
      Fix errors before saving
    </ThemedText>
  )}
  ```

Test cases:
- Open modal, don't change slots (shows "No changes to save")
- Change slot time (helper text disappears, save enabled)
- Introduce validation error (shows "Fix errors before saving")
- Fix error (save enabled)
```

**Acceptance Criteria**:
- [ ] Helper text shown when disabled due to no changes
- [ ] Error text shown when disabled due to validation
- [ ] Correct text shown based on disabled reason
- [ ] Text uses design tokens (caption, textSecondary/error)
- [ ] Text center-aligned below button
- [ ] No text shown when save is enabled

---

## Item 52: Coach Observation Modal Closing Discards Text

**File**: `components/development/coach-observation-modal.tsx` ~lines 34-179

**Problem**: Modal can be dismissed (swipe down, backdrop tap) without warning, losing long-form coach observation text. No "unsaved changes" warning.

**Prompt**:
```
Add unsaved changes warning to coach observation modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/development/coach-observation-modal.tsx
Lines: ~34-179 (modal dismissal)

Current behavior:
- User types 300 words of observation
- Accidentally swipes down or taps backdrop
- Modal closes, all text lost
- No warning

Requirements:
1. Detect if observation text has changed from initial value
2. Show alert when attempting to close with unsaved changes
3. Allow user to cancel dismiss or confirm discard
4. Don't warn if text unchanged
5. Don't warn after successful save

Implementation:
- Track initial value: const [initialObservation, setInitialObservation] = useState('')
- Track has changes: const hasUnsavedChanges = observation.trim() !== initialObservation.trim()
- Override modal onRequestClose:
  ```typescript
  // Use a confirmation modal state (not Alert.alert)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
      // Render a confirmation modal: "Discard Changes?"
      // Message: "You have unsaved observations. Are you sure you want to close?"
      // Options: "Keep Editing" and "Discard" (destructive -> calls onClose())
    } else {
      onClose();
    }
  };
  ```
- Use handleClose for:
  - Modal onRequestClose prop
  - Backdrop onPress (if custom modal)
  - Close button onPress
- After successful save: setInitialObservation(observation) // Mark as saved
- Reset on open: useEffect(() => { setInitialObservation(existingObservation || '') }, [visible])

Test cases:
- Type text, attempt close (alert shown)
- Choose "Keep Editing" (modal stays open)
- Choose "Discard" (modal closes, text lost)
- Save text, then close (no alert, closes normally)
- Open modal with existing text, don't edit, close (no alert)
```

**Acceptance Criteria**:
- [ ] Alert shown when closing with unsaved changes
- [ ] Alert has "Keep Editing" and "Discard" options
- [ ] "Discard" is destructive style (red text)
- [ ] No alert after successful save
- [ ] No alert if text unchanged
- [ ] Alert triggered by all close methods (backdrop, button, swipe)

---

## Item 56: Decline Reason Notes Only for "Other"

**File**: `components/parent/decline-reason-sheet.tsx` ~lines 146-163

**Problem**: Notes field always visible but only validated/used when reason="Other". Confusing UX. Should hide notes field unless "Other" selected.

**Prompt**:
```
Show decline reason notes field only when "Other" selected.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/parent/decline-reason-sheet.tsx
Lines: ~146-163 (notes TextInput)

Current behavior:
- Notes field always visible
- Only validated when reason="Other"
- User enters notes for "Schedule conflict", but notes ignored
- Confusing

Requirements:
1. Hide notes field unless reason="Other"
2. Show notes field when "Other" selected
3. Animate appearance (slide down)
4. Clear notes if reason changed from "Other" to something else
5. Validate notes when visible (see Item 105 implementation)

Implementation:
- Conditional render:
  ```typescript
  {reason === 'Other' && (
    <Animated.View entering={SlideInDown.duration(200)}>
      <ThemedText style={[Typography.bodySmall, { color: colors.muted, marginBottom: Spacing.xs }]}>
        Please provide a reason
      </ThemedText>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g., Family emergency"
        multiline
        numberOfLines={3}
        maxLength={200}
        style={[/* existing styles */]}
      />
      <ThemedText style={[Typography.caption, { color: colors.muted, textAlign: 'right' }]}>
        {notes.length}/200
      </ThemedText>
    </Animated.View>
  )}
  ```
- Clear notes when reason changes:
  ```typescript
  const handleReasonChange = (newReason: string) => {
    setReason(newReason);
    if (newReason !== 'Other') {
      setNotes(''); // Clear notes when switching away from Other
    }
  };
  ```
- Validate notes only when visible (reason="Other")

Test cases:
- Select "Other" (notes field appears with animation)
- Select "Schedule conflict" (notes field hidden)
- Select "Other", type notes, select "Time slot changed" (notes cleared)
- Submit with reason="Other" and empty notes (validation error)
```

**Acceptance Criteria**:
- [ ] Notes field hidden by default
- [ ] Notes field appears when "Other" selected
- [ ] Slide-down animation on appearance
- [ ] Notes cleared when changing from "Other" to another reason
- [ ] Validation only applies when notes visible
- [ ] Character counter shown when visible

---

## Item 106: Family Sharing Invite Modal Backdrop Dismisses

**File**: `components/family/sharing-invite-modal.tsx` ~line 56

**Problem**: Modal dismisses on backdrop tap. If user has typed email and taps outside accidentally, modal closes and email is lost. Should disable backdrop dismiss or add unsaved changes warning.

**Prompt**:
```
Add unsaved changes warning to family sharing invite modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/family/sharing-invite-modal.tsx
Lines: ~56 (Modal component)

Current behavior:
- User types email
- Accidentally taps backdrop
- Modal closes, email lost

Requirements:
1. Show alert when closing with unsaved changes (typed email not sent)
2. Allow user to cancel close or confirm discard
3. Don't warn if email field empty
4. Don't warn after successful send

Implementation: Same pattern as Item 52
- Track initial state: const [initialEmail, setInitialEmail] = useState('')
- Track changes: const hasUnsavedChanges = email.trim() !== initialEmail
- Override onRequestClose:
  ```typescript
  // Use a confirmation modal state (not Alert.alert)
  const [showDiscardInvite, setShowDiscardInvite] = useState(false);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardInvite(true);
      // Render confirmation modal: "Discard Invite?"
      // Message: "You have an unsent invite. Are you sure you want to close?"
      // Options: "Keep Editing" and "Discard" (destructive -> calls onClose())
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);
  ```
- Use handleClose for Modal onRequestClose
- After successful send: reset state and close without warning
- Reset on open: useEffect(() => { setInitialEmail(''); setEmail('') }, [visible])

Alternative approach: Disable backdrop dismiss
- Set Modal prop: onRequestClose={undefined} or presentationStyle="pageSheet" (iOS)
- Force user to tap Cancel or Send button
- Simpler but less flexible

Recommend: unsaved changes warning (better UX)

Test cases:
- Type email, tap backdrop (alert shown)
- Choose "Keep Editing" (modal stays open)
- Choose "Discard" (modal closes)
- Send invite successfully (closes without alert)
- Open modal, tap backdrop immediately (closes without alert)
```

**Acceptance Criteria**:
- [ ] Alert shown when closing with unsaved email
- [ ] "Keep Editing" and "Discard" options
- [ ] No alert after successful send
- [ ] No alert if email field empty
- [ ] Alert for backdrop tap, close button, swipe dismiss

---

## Item 107: Block Date Modal Closes Without Saving

**File**: `components/coach/block-date-modal.tsx` ~line 147

**Problem**: Same as Item 106. Backdrop tap or swipe closes modal, losing selected dates and reason. No unsaved changes warning.

**Prompt**:
```
Add unsaved changes warning to block date modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/block-date-modal.tsx
Lines: ~147 (modal dismissal)

Implementation: Same pattern as Items 52 and 106
- Track initial state: const [initialState, setInitialState] = useState({ startDate: null, endDate: null, reason: '' })
- Track changes:
  ```typescript
  const hasUnsavedChanges =
    startDate !== initialState.startDate ||
    endDate !== initialState.endDate ||
    reason !== initialState.reason ||
    (reason === 'Other' && notes !== '');
  ```
- Show alert on close with unsaved changes
- Don't warn after successful save
- Reset state on modal open

Alert text:
- Title: "Discard Block?"
- Message: "You have unsaved changes. Are you sure you want to close?"

Test cases: (same as Items 52, 106)
```

**Acceptance Criteria**:
- [ ] Alert shown when closing with unsaved changes
- [ ] Tracks date selection, reason, and notes
- [ ] No alert after successful save
- [ ] No alert if nothing entered
- [ ] Works for backdrop tap, close button, swipe

---

## Item 108: Quick Rate Modal Swipe Discards Ratings

**File**: `components/group/quick-rate-modal.tsx` ~line 114

**Problem**: Same pattern. User rates 10 athletes, accidentally swipes down, all ratings lost.

**Prompt**:
```
Add unsaved changes warning to quick rate modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/group/quick-rate-modal.tsx
Lines: ~114 (modal dismissal)

Implementation: Same pattern as Items 52, 106, 107
- Track initial ratings: const [initialRatings, setInitialRatings] = useState<Record<string, number>>({})
- Track changes:
  ```typescript
  const hasUnsavedChanges = Object.keys(ratings).some(
    athleteId => ratings[athleteId] !== initialRatings[athleteId]
  );
  ```
- Show alert on close with unsaved changes

Alert text:
- Title: "Discard Ratings?"
- Message: "You have unsaved ratings for {count} athletes. Are you sure you want to close?"

Test cases:
- Rate 5 athletes, swipe down (alert shows count=5)
- Choose "Discard" (modal closes, ratings lost)
- Save ratings, then close (no alert)
- Open modal, close immediately (no alert)
```

**Acceptance Criteria**:
- [ ] Alert shown when closing with unsaved ratings
- [ ] Alert shows count of rated athletes
- [ ] No alert after successful save
- [ ] No alert if no ratings entered
- [ ] Works for all dismiss methods

---

## Item 109: Goal Creation Toggle Discards Title

**File**: `components/progress/goals-compact.tsx` ~lines 152-160

**Problem**: Goal creation has inline toggle (collapsed/expanded form). Expanding shows title input. Collapsing toggle discards typed title. No warning.

**Prompt**:
```
Add unsaved changes warning when collapsing goal creation form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/progress/goals-compact.tsx
Lines: ~152-160 (create goal toggle)

Current behavior:
- User taps "+" to create goal
- Inline form expands
- User types title "Master rainbow flick"
- User taps "-" or taps outside
- Form collapses, title discarded

Requirements:
1. Show alert when collapsing with unsaved title
2. Allow user to cancel collapse or confirm discard
3. Don't warn if title empty
4. Don't warn after successful save

Implementation:
- Track initial title: const [initialTitle, setInitialTitle] = useState('')
- Track changes: const hasUnsavedChanges = title.trim() !== initialTitle
- In collapse handler:
  ```typescript
  // Use a confirmation modal state (not Alert.alert)
  const [showDiscardGoal, setShowDiscardGoal] = useState(false);

  const handleCollapse = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardGoal(true);
      // Render confirmation modal: "Discard Goal?"
      // Message: "You have an unsaved goal. Are you sure you want to cancel?"
      // Options: "Keep Editing" and "Discard" (destructive -> setTitle(''); setIsCreating(false))
    } else {
      setIsCreating(false);
    }
  };
  ```
- Use handleCollapse for collapse button and outside tap
- After successful save: reset state without alert

Test cases:
- Expand form, type title, tap collapse (alert shown)
- Choose "Keep Editing" (form stays open)
- Choose "Discard" (form collapses, title cleared)
- Save goal (form collapses without alert)
- Expand form, tap collapse immediately (no alert)
```

**Acceptance Criteria**:
- [ ] Alert shown when collapsing with unsaved title
- [ ] "Keep Editing" and "Discard" options
- [ ] No alert after successful save
- [ ] No alert if title empty
- [ ] Works for collapse button and outside tap

---

## Item 138: Create Session Offering No Validation

**File**: `components/bookings/CreateSessionForm.tsx` ~lines 160-169

**Problem**: Form can be submitted with missing required fields. No field-level validation, just silent failure on submit.

**Prompt**:
```
Add field-level validation to create session offering form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/bookings/CreateSessionForm.tsx
Lines: ~160-169 (submit button + validation)

Current behavior:
- Submit button always enabled
- Missing required fields cause silent failure
- No inline errors to guide user

Requirements:
1. Validate all required fields
2. Show inline errors for invalid fields
3. Disable submit when any required field missing or invalid
4. Validate on blur and on submit

Required fields:
- Session type (must be selected)
- Date (must be set, not in past)
- Start time (must be set)
- End time (must be > start time)
- Price (must be 10-200)

Implementation:
- Add validation state for each field:
  ```typescript
  const [typeError, setTypeError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  ```
- Validate each field in onChange and onBlur
- Show error text below each field when error present
- Disable submit:
  ```typescript
  disabled={
    !sessionType ||
    !date ||
    !startTime ||
    !endTime ||
    !price ||
    typeError !== null ||
    dateError !== null ||
    timeError !== null ||
    priceError !== null ||
    isSubmitting
  }
  ```
- In handleSubmit, validate all fields again (defensive)

Validation logic:
- Date: must be >= today
- Time: endTime > startTime, duration >= 30 min
- Price: 10 <= price <= 200 (see Sprint 1 Item 301)

Test cases:
- Leave session type blank (submit disabled)
- Select past date (error shown, submit disabled)
- Set end time before start time (error shown, submit disabled)
- Enter price < £10 (error shown, submit disabled)
- Fill all fields correctly (submit enabled)
```

**Acceptance Criteria**:
- [ ] Inline validation for all required fields
- [ ] Error text shown below invalid fields
- [ ] Submit disabled when any validation fails
- [ ] Validation runs on blur and submit
- [ ] Valid form submits successfully
- [ ] All validation uses design tokens

---

## Item 150: Event RSVP Guest Count No Max

**File**: `app/events/[id]/rsvp.tsx` ~lines 367-386

**Problem**: Guest count input has no validation. Can enter 999 guests, breaking event capacity logic and attendance UI.

**Prompt**:
```
Add validation to event RSVP guest count input.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/events/[id]/rsvp.tsx
Lines: ~367-386 (guest count input)

Current behavior:
- Can enter unlimited guests
- No validation against event capacity
- Breaks attendance tracking: 1 parent + 50 guests

Requirements:
1. Validate guest count: 0-10 (reasonable max)
2. Validate against available capacity: guests <= (event.maxCapacity - currentRSVPs)
3. Show inline error when invalid
4. Disable submit when guest count invalid
5. Show helper text: "Additional people attending with you"

Implementation:
- Add validation:
  ```typescript
  const validateGuestCount = (count: number) => {
    if (count < 0) {
      return 'Guest count cannot be negative';
    }
    if (count > 10) {
      return 'Maximum 10 guests per registration';
    }
    const availableCapacity = event.maxCapacity - currentRSVPs;
    const totalAttending = 1 + count; // registrant + guests
    if (totalAttending > availableCapacity) {
      return `Only ${availableCapacity} spots available`;
    }
    return null;
  };
  ```
- In onGuestCountChange:
  ```typescript
  const error = validateGuestCount(newCount);
  setGuestCountError(error);
  ```
- Show error text below input when guestCountError present
- Disable submit: disabled={guestCountError || ...}

Helper text: "Additional people attending with you (e.g., siblings, partner)"

Test cases:
- Enter -1 (error: cannot be negative)
- Enter 11 (error: max 10)
- Event capacity 5, current RSVPs 3, enter 3 guests (error: only 2 spots available)
- Event capacity 20, current RSVPs 5, enter 3 guests (valid: 4 total, 15 available)
```

**Acceptance Criteria**:
- [ ] Guest count validated: 0-10
- [ ] Validation against event capacity
- [ ] Inline error shown when invalid
- [ ] Submit disabled on validation failure
- [ ] Helper text explaining field purpose
- [ ] Error messages clear and actionable

---

## Item 158: RSVP "Can't Go" Wrong Disabled Logic

**File**: `components/event/RSVPButton-sections.tsx` ~lines 125-128

**Problem**: "Can't Go" button disabled logic incorrect. Shows disabled when it should be enabled, or vice versa. User confusion.

**Prompt**:
```
Fix "Can't Go" button disabled logic in event RSVP.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/event/RSVPButton-sections.tsx
Lines: ~125-128 (Can't Go button disabled logic)

Current behavior:
- Check current code to understand bug
- Likely: disabled={currentRSVP !== 'GOING'} (wrong: should allow when GOING or NO_RESPONSE)
- Or: disabled={currentRSVP === 'CANT_GO'} (correct, but needs clarity)

Expected behavior:
- If no RSVP yet: "Can't Go" enabled
- If already RSVP'd GOING: "Can't Go" enabled (allow changing mind)
- If already RSVP'd CANT_GO: "Can't Go" disabled (already selected)

Correct disabled logic:
```typescript
disabled={currentRSVP === 'CANT_GO' || isPastDeadline || isSubmitting}
```

Also show explanation when disabled:
```typescript
{currentRSVP === 'CANT_GO' && (
  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
    Already marked as can't attend
  </ThemedText>
)}
```

Test cases:
- No RSVP: "Can't Go" enabled
- RSVP'd GOING: "Can't Go" enabled (can change)
- RSVP'd CANT_GO: "Can't Go" disabled (already set)
- Past deadline: "Can't Go" disabled (covered by Item 15)
```

**Acceptance Criteria**:
- [ ] "Can't Go" disabled only when already CANT_GO or past deadline
- [ ] Enabled when NO_RESPONSE or GOING (allow change)
- [ ] Helper text shown when disabled due to already selected
- [ ] Consistent with "Going" button logic
- [ ] All RSVP states handled correctly

---

## Item 300: No Modal Dismisses Keyboard Before Closing

**Files**: 18+ modal components across codebase

**Problem**: Systematic gap. When modal closes with keyboard open, keyboard stays visible over next screen. Poor UX on iOS.

**Prompt**:
```
Add keyboard dismiss to all modal close handlers.

Scope: All modal components in codebase.

Implementation:
- Import Keyboard from react-native
- In modal close handler, dismiss keyboard before closing:
  ```typescript
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  ```
- Use handleClose for all dismiss methods: backdrop, close button, submit

Files to update (examples from search):
1. components/family/sharing-invite-modal.tsx
2. components/development/coach-observation-modal.tsx
3. components/coach/block-date-modal.tsx
4. components/group/quick-rate-modal.tsx
5. components/coach/session-type-modal.tsx
6. components/coach/adjust-day-modal.tsx
7. components/coach/scheduling-rules-modal.tsx
8. components/parent/decline-reason-sheet.tsx
9. components/drills/assign-drill-form.tsx (if modal)
10. components/messaging/attachment-picker.tsx (if modal)
... (find all via Grep for "Modal" component)

For EACH modal file:
- Find onClose/onDismiss handlers
- Add Keyboard.dismiss() before onClose()
- Test on iOS with keyboard open

Grep command to find modals:
grep -r "<Modal" --include="*.tsx" components/ app/

This is a LARGE task. Recommend:
- Sprint 3: High-traffic modals (session creation, observations, ratings)
- Sprint 4: Remaining modals

High-priority modals:
1. Session creation modals (coach workflow)
2. Coach observation modal (long-form text)
3. Rating modals (quick rate, review)
4. Invite modals (family sharing, session invite)
```

**Acceptance Criteria**:
- [ ] Keyboard.dismiss() called in all modal close handlers
- [ ] Applied to backdrop tap, close button, submit, swipe dismiss
- [ ] No keyboard visible after modal closes
- [ ] Works on iOS and Android
- [ ] No impact on modal animation performance

---

## Item 303: No Unsaved Changes Warning on Any Form Modal

**Files**: Covered by Items 52, 106, 107, 108, 109 in this sprint

**Status**: Systematic implementation of unsaved changes pattern across 5 modals. Additional modals to be identified and fixed using same pattern.

**Additional modals needing unsaved changes warning**:
- Session type modal (Item 306 - covered below)
- Scheduling rules modal
- Credential form modal
- Goal form modal
- Drill assignment modal

**Prompt**: Same pattern as Items 52, 106, 107, 108, 109 for each additional modal.

---

## Item 306: Modal State Not Reset When Reopened

**Files**:
- `components/coach/session-type-modal.tsx` ~lines 54-72
- `components/coach/adjust-day-modal.tsx` ~lines 53-60

**Problem**: Modal state persists from previous open. Close modal with "Advanced Shooting" name, reopen to create new session type, "Advanced Shooting" still in name field. Confusing and causes errors.

**Prompt**:
```
Reset modal state when modal opens/closes.

File 1: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/session-type-modal.tsx
Lines: ~54-72 (useEffect or modal visibility)

Current behavior:
- State persists between modal open/close cycles
- Editing session type A, closing, opening for new type → shows A's data

Requirements:
1. Reset all form fields when modal closes
2. Initialize with props data when modal opens (edit mode)
3. Clear errors on reset
4. Don't reset during current open session

Implementation:
- Add useEffect to reset on visibility change:
  ```typescript
  useEffect(() => {
    if (visible) {
      // Initialize for edit or create
      if (editingType) {
        setName(editingType.name);
        setCategory(editingType.category);
        setCapacity(editingType.capacity);
        setDuration(editingType.duration);
        setPrice(editingType.price);
      } else {
        // Create mode: reset to defaults
        resetForm();
      }
    } else {
      // Modal closing: reset all state
      resetForm();
    }
  }, [visible, editingType]);

  const resetForm = () => {
    setName('');
    setCategory('1-1');
    setCapacity(1);
    setDuration(60);
    setPrice(20);
    setNameError(null);
    setPriceError(null);
    // ... reset all error states
  };
  ```

File 2: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/adjust-day-modal.tsx
Lines: ~53-60

Same implementation: reset slots to original on close, initialize from props on open.

Test cases:
- Open modal in create mode (all fields empty)
- Open modal in edit mode (fields populated from props)
- Edit fields, close modal, reopen in create mode (fields reset)
- Close modal, reopen in edit mode for different item (correct data shown)
```

**Acceptance Criteria**:
- [ ] Modal state reset when visibility changes to false
- [ ] State initialized from props when opening in edit mode
- [ ] State cleared when opening in create mode
- [ ] Error states reset on close
- [ ] No stale data from previous modal session
- [ ] Applied to both session-type-modal and adjust-day-modal

---

## Item 310: Scheduling Rules Editable During Load

**File**: `components/coach/scheduling-rules-modal.tsx` ~lines 97-136

**Problem**: Form inputs enabled while loading existing rules. User can edit before data loads, causing race condition. Edited values overwritten when data loads.

**Prompt**:
```
Disable form inputs during data loading.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/scheduling-rules-modal.tsx
Lines: ~97-136 (form inputs)

Current behavior:
- Modal opens
- Inputs enabled immediately
- Data loads 200ms later
- User's changes overwritten by loaded data

Requirements:
1. Disable all inputs while isLoading
2. Show loading skeleton or spinner
3. Enable inputs after data loads
4. Show error state if load fails

Implementation:
- Add isLoading state: const [isLoading, setIsLoading] = useState(true)
- Load data on mount:
  ```typescript
  useEffect(() => {
    const loadRules = async () => {
      setIsLoading(true);
      const result = await SchedulingRulesService.getRules(coachId);
      if (result.success) {
        setMinNoticeHours(result.data.minNoticeHours);
        setMaxDaysAhead(result.data.maxDaysAhead);
        // ... set all fields
      }
      setIsLoading(false);
    };

    if (visible) {
      loadRules();
    }
  }, [visible, coachId]);
  ```
- Disable all inputs: editable={!isLoading}
- Show loading state:
  ```typescript
  {isLoading ? (
    <LoadingState message="Loading rules..." />
  ) : (
    <View>
      {/* form inputs */}
    </View>
  )}
  ```

Test cases:
- Open modal (loading state shown)
- After data loads (inputs enabled, data populated)
- Attempt to edit during load (inputs disabled)
- Load error (error state shown)
```

**Acceptance Criteria**:
- [ ] All inputs disabled while isLoading=true
- [ ] Loading skeleton or spinner shown during load
- [ ] Inputs enabled after data loads
- [ ] User changes not overwritten by loaded data
- [ ] Error state shown if load fails
- [ ] Loading state uses LoadingState component

---

## Item 323: Add-Child Wizard Loses All Data on Dismiss

**File**: `hooks/use-add-child.ts` ~lines 36-93

**Problem**: Multi-step wizard (Basic Info → Emergency Contact → Medical). Dismissing wizard at any step loses all entered data. No persistence between app sessions or wizard dismissals.

**Prompt**:
```
Add data persistence to add-child wizard using AsyncStorage draft.

File: /Users/tubton/Desktop/coachapplication/clubroom/hooks/use-add-child.ts
Lines: ~36-93 (wizard state)

Current behavior:
- User completes step 1 (basic info)
- Navigates to step 2 (emergency contact)
- Accidentally dismisses modal or app closes
- All data lost, must re-enter

Requirements:
1. Save wizard state to AsyncStorage as draft after each step
2. Restore draft on wizard open
3. Clear draft on successful submission
4. Show "Resume draft?" prompt if draft exists on open
5. Allow user to start fresh (discard draft)

Implementation:
- Add draft persistence:
  ```typescript
  // Use centralized storage key — verify STORAGE_KEYS.ADD_CHILD_DRAFT exists,
  // or add it to constants/storage-keys.ts if missing.
  import { STORAGE_KEYS } from '@/constants/storage-keys';
  const DRAFT_KEY = STORAGE_KEYS.ADD_CHILD_DRAFT;

  const saveDraft = async () => {
    const draft = {
      step: currentStep,
      basicInfo,
      emergencyContact,
      medicalInfo,
      timestamp: Date.now()
    };
    await apiClient.set(DRAFT_KEY, draft);
  };

  const loadDraft = async () => {
    const draft = await apiClient.get<ChildDraft>(DRAFT_KEY, null);
    if (draft) {
      // Check if draft is < 7 days old
      const age = Date.now() - draft.timestamp;
      if (age < 7 * 86400000) {
        return draft;
      }
    }
    return null;
  };

  const clearDraft = async () => {
    await apiClient.remove(DRAFT_KEY);
  };
  ```
- Save draft after each step completion
- Load draft on wizard mount:
  ```typescript
  useEffect(() => {
    const init = async () => {
      const draft = await loadDraft();
      if (draft) {
        // Use a confirmation modal state (not Alert.alert)
        setFoundDraft(draft);
        setShowResumeConfirm(true);
        // Render confirmation modal: "Resume Draft?"
        // Message: "You have an unfinished child registration. Continue where you left off?"
        // Options:
        //   "Start Fresh" -> clearDraft()
        //   "Resume" -> setCurrentStep(draft.step); setBasicInfo(draft.basicInfo);
        //               setEmergencyContact(draft.emergencyContact); setMedicalInfo(draft.medicalInfo);
      }
    };

    if (visible) {
      init();
    }
  }, [visible]);
  ```
- Clear draft on successful submission
- Clear draft if user chooses "Start Fresh"

Test cases:
- Complete step 1, dismiss wizard, reopen (prompt shown, resume works)
- Complete all steps, submit (draft cleared)
- Draft > 7 days old (not shown, treated as expired)
- Choose "Start Fresh" (draft cleared, wizard resets)
```

**Acceptance Criteria**:
- [ ] Wizard state saved to AsyncStorage after each step
- [ ] Draft restored on wizard open (with prompt)
- [ ] "Resume draft?" alert shown when draft exists
- [ ] Draft cleared on successful submission
- [ ] Drafts expire after 7 days
- [ ] User can choose to start fresh (discard draft)
- [ ] No data loss on accidental dismiss

---

## Sprint 3 Summary

**Total Items**: 16 items
**Effort**: 9 engineer-days
**Risk**: Medium (modal interaction changes affect UX, need thorough testing)

**Success Criteria**:
- [ ] All modals dismiss keyboard before closing
- [ ] Unsaved changes warnings on all long-form modals
- [ ] Modal state resets correctly on open/close
- [ ] No accidental data loss from modal dismissal
- [ ] Loading states prevent race conditions
- [ ] iOS date picker auto-closes
- [ ] Disabled button states explained with helper text

**Testing Strategy**:
1. Manual QA: Test each modal with keyboard open, unsaved changes, etc.
2. iOS-specific: Date picker auto-close, keyboard dismiss behavior
3. Edge cases: Rapid open/close, network delays during load
4. Regression: Ensure modal functionality unchanged (only UX improvements)

**Deployment**:
- Deploy by modal type (e.g., all creation modals together)
- Medium risk: Unsaved changes warnings could annoy users if too aggressive
- Monitor: User feedback on new warnings (too many alerts?)

**Dependencies**:
- Builds on Sprint 1 (validation) and Sprint 2 (input limits)
- Some fixes reference earlier items (e.g., Item 310 uses LoadingState)

**Follow-up Work**:
- Sprint 4: UX polish (defaults, helper text, remaining low-priority items)
- Item 300 continuation: Apply keyboard dismiss to remaining modals
- Item 303 continuation: Apply unsaved changes to remaining modals
