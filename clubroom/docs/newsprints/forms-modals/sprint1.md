# Forms & Modals Sprint 1: Validation Bugs That Corrupt Data

**Goal**: Fix critical validation gaps that allow invalid data to persist in AsyncStorage and create cascading errors across the app. These are data corruption vectors that break business logic.

**Priority**: P0 — Launch blockers
**Effort**: 12 engineer-days
**Dependencies**: None

---

## Item 12: Scheduling Rules Accept Negative Hours

**File**: `components/coach/scheduling-rules-sections.tsx` ~line 291

**Problem**: Minimum notice period accepts negative values via direct text input. Negative notice periods break booking availability calculation in `AvailabilityService.getAvailableSlots()`, causing no slots to appear for coaches.

**Prompt**:
```
Fix negative notice period validation in scheduling rules form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/scheduling-rules-sections.tsx
Lines: ~291-310

Current behavior:
- TextInput with keyboardType="number-pad" allows backspace to create empty string
- parseInt('') returns NaN, which passes through to state
- On save, NaN is stored as null, breaking availability queries

Requirements:
1. Add validation: minNoticeHours must be >= 0 and <= 168 (7 days)
2. Show error text below input when invalid
3. Disable save button when any field invalid
4. Use result pattern: validate before calling apiClient.set()
5. Clear error on valid input
6. Theme: error text uses colors.error + Typography.caption

Implementation:
- Add validateNoticeHours(value: string): string | null helper
- Store error state per field
- Check all errors in save button disabled logic
- Use Input primitive with error prop (or add errorText below TextInput)

Test cases:
- Entering negative via paste
- Deleting to empty string
- Entering 0 (valid)
- Entering 169 (invalid)
- Successful save with valid value
```

**Acceptance Criteria**:
- [ ] Negative values rejected with visible error
- [ ] Empty input shows "Required" error
- [ ] Values > 168 rejected with "Maximum 7 days" error
- [ ] Save button disabled when any validation error present
- [ ] Error text uses `colors.error` and `Typography.caption`
- [ ] Valid values 0-168 save successfully
- [ ] No console warnings on valid/invalid input

---

## Item 13: Goal Form Accepts Past Target Date

**File**: `components/goals/GoalForm.tsx`

**Problem**: Goal creation allows target date in the past. This breaks progress calculation in `ProgressGoalsService.calculateProgress()`, which assumes target date > created date. Results in negative progress percentages and broken goal timeline UI.

**Prompt**:
```
Add target date validation to goal creation form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/goals/GoalForm.tsx
Lines: ~80-120 (date picker section)

Current behavior:
- DateTimePicker has no minimumDate prop
- Past dates accepted and saved
- Progress calculation breaks: (now - created) / (target - created) = negative

Requirements:
1. Set minimumDate to tomorrow (start of next day)
2. Show validation error if user attempts past date (iOS allows typing)
3. Add helper text: "Target must be in the future"
4. Validate before calling ProgressGoalsService.createGoal()
5. Show error toast if validation fails

Implementation:
- Calculate minDate: new Date(Date.now() + 86400000)
- Add minimumDate={minDate} to DateTimePicker
- Add validation in onSubmit: if (targetDate <= new Date()) return
- Use showToast('Target date must be in the future', 'error')
- Add helper text below date picker (colors.muted + Typography.caption)

Test cases:
- Selecting today (should be disabled/show error)
- Selecting yesterday
- Selecting tomorrow (valid)
- Selecting 1 year from now (valid)
- Form submission with past date (should block)
```

**Acceptance Criteria**:
- [ ] Past dates not selectable on iOS/Android date picker
- [ ] Helper text "Target must be in the future" visible below picker
- [ ] Submit blocked if targetDate <= now()
- [ ] Error toast shown on invalid submit attempt
- [ ] Future dates save successfully
- [ ] No console errors on date selection

---

## Item 14: Injury Form Allows Recovery Before Injury Date

**File**: `components/health/InjuryForm.tsx` ~line 42

**Problem**: Recovery date can be before injury date. This breaks the recovery timeline visualization in `components/health/recovery-timeline-styles.ts` and causes overlapping date ranges in injury history queries.

**Prompt**:
```
Add date validation to injury form ensuring recovery date >= injury date.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/health/InjuryForm.tsx
Lines: ~42-90 (date pickers)

Current behavior:
- Two independent DateTimePicker components
- No cross-field validation
- Recovery date can be < injury date
- Breaks timeline rendering (negative duration)

Requirements:
1. Recovery date picker minimumDate = injury date
2. If injury date changes after recovery set, validate and show error
3. Show inline error text if recovery < injury
4. Disable submit when validation fails
5. Use result pattern in onSubmit validation

Implementation:
- Add state: const [dateError, setDateError] = useState<string | null>(null)
- In onInjuryDateChange: if (recoveryDate && newDate > recoveryDate) setDateError('...')
- In onRecoveryDateChange: if (newDate < injuryDate) setDateError('...')
- Set minimumDate={injuryDate || new Date()} on recovery picker
- Show error text below recovery picker when dateError present
- Check dateError in submit disabled logic

Error message: "Recovery date must be after injury date"
Theme: colors.error + Typography.caption

Test cases:
- Setting recovery before injury (blocked)
- Setting injury after recovery (shows error)
- Valid chronological dates (no error)
- Changing injury date after recovery set
- Form submission with invalid dates (blocked)
```

**Acceptance Criteria**:
- [ ] Recovery date picker minimumDate dynamically set to injury date
- [ ] Inline error shown when recovery < injury
- [ ] Submit button disabled when date validation fails
- [ ] Changing injury date triggers revalidation
- [ ] Valid date ranges save successfully
- [ ] Error text uses design tokens

---

## Item 15: Event RSVP Submit Active After Deadline

**File**: `app/events/[id]/rsvp.tsx`

**Problem**: RSVP form allows submission after event deadline. This breaks attendance tracking in `EventAttendanceService.recordAttendance()` which assumes all RSVPs are pre-deadline. Late RSVPs don't appear in roll call.

**Prompt**:
```
Add deadline validation to event RSVP screen.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/events/[id]/rsvp.tsx
Lines: ~316-357 (submit button section)

Current behavior:
- Submit button always enabled if form valid
- No check against event.rsvpDeadline
- Late RSVPs saved but ignored by attendance tracking

Requirements:
1. Check if current time > event.rsvpDeadline
2. Disable submit button if past deadline
3. Show banner at top: "RSVP deadline has passed"
4. Replace submit button with disabled state + reason text
5. Validate in onSubmit as secondary check

Implementation:
- Add helper: const isPastDeadline = event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline)
- Render conditional banner if isPastDeadline (SurfaceCard + colors.warning background)
- Disable submit: disabled={isPastDeadline || !isFormValid}
- Add validation in handleSubmit: if (isPastDeadline) return showToast('RSVP deadline has passed', 'error')
- Update button text when disabled: "RSVP Closed"

Banner layout:
- SurfaceCard with yellow tint (withAlpha(colors.warning, 0.1))
- Icon: Ionicons "time-outline" size 20
- Text: "RSVP deadline was {formatDate(deadline)}"
- Typography.body + colors.foreground

Test cases:
- Viewing RSVP screen before deadline (submit enabled)
- Viewing after deadline (submit disabled, banner shown)
- Attempting submit after deadline (blocked with toast)
- Edge case: deadline exactly now
```

**Acceptance Criteria**:
- [ ] Submit button disabled when past deadline
- [ ] Warning banner shown at top of screen when past deadline
- [ ] Button text changes to "RSVP Closed" when disabled
- [ ] handleSubmit validates deadline even if button enabled (edge case)
- [ ] Error toast shown if submit attempted past deadline
- [ ] Banner uses warning color with alpha
- [ ] Before deadline: form works normally

---

## Item 95: Session Extras Age Min > Max Allowed

**File**: `components/bookings/create-session-extras.tsx` ~lines 70-90

**Problem**: Age range validation allows min > max. This breaks athlete filtering in `BookingSearchService.filterByAge()`, causing sessions to appear for no age groups or wrong age groups in parent discovery.

**Prompt**:
```
Add age range validation to session extras form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/bookings/create-session-extras.tsx
Lines: ~70-90 (age range inputs)

Current behavior:
- Two independent TextInput components for minAge/maxAge
- No cross-field validation
- Can save minAge=15, maxAge=8
- Breaks discovery filters: no athletes match

Requirements:
1. Validate minAge <= maxAge on both input changes
2. Show inline error when min > max
3. Disable save button when validation fails
4. Allow both to be null (no age restriction)
5. Validate minAge >= 4, maxAge <= 18 (coaching license limits)

Implementation:
- Add state: const [ageError, setAgeError] = useState<string | null>(null)
- Validate in onMinAgeChange: if (min && max && min > max) setAgeError('Min age must be <= max age')
- Same validation in onMaxAgeChange
- Add individual validation: minAge >= 4, maxAge <= 18
- Show error text below age range section when ageError present
- Check ageError in save button disabled logic

Error messages:
- "Minimum age must be less than maximum"
- "Minimum age must be at least 4"
- "Maximum age must be under 18"

Theme: colors.error + Typography.caption

Test cases:
- Setting min=10, max=8 (error shown)
- Setting min=3 (error shown)
- Setting max=19 (error shown)
- Setting min=8, max=12 (valid)
- Setting both to null (valid)
- Submit with invalid range (blocked)
```

**Acceptance Criteria**:
- [ ] Inline error shown when minAge > maxAge
- [ ] Individual validation: minAge >= 4, maxAge <= 18
- [ ] Error text appears below age range section
- [ ] Submit button disabled when any age validation fails
- [ ] Both null allowed (no age restriction)
- [ ] Valid ranges save successfully
- [ ] Errors clear when corrected

---

## Item 96: Edit Pricing Min > Max Allowed

**File**: `components/profile/edit-pricing-section.tsx` ~lines 38-61

**Problem**: Price range validation allows minPrice > maxPrice. This breaks price filter queries in `BookingSearchService.filterByPriceRange()`, causing coaches to not appear in searches or appear incorrectly.

**Prompt**:
```
Add price range validation to profile pricing editor.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/profile/edit-pricing-section.tsx
Lines: ~38-61 (price inputs)

Current behavior:
- Independent TextInput for minPrice/maxPrice
- No cross-field validation
- Can save minPrice=£50, maxPrice=£20
- Breaks discovery: coach excluded from all price filters

Requirements:
1. Validate minPrice <= maxPrice on both input changes
2. Show inline error when min > max
3. Disable save button when validation fails
4. Validate minPrice >= 10, maxPrice <= 200 (platform limits)
5. Only accept positive integers (GBP, no decimals per platform policy)

Implementation:
- Add state: const [priceError, setPriceError] = useState<string | null>(null)
- Validate in onMinPriceChange: if (min && max && min > max) setPriceError('Minimum must be <= maximum')
- Same validation in onMaxPriceChange
- Add bounds validation: minPrice >= 10, maxPrice <= 200
- Show error text below price section when priceError present
- Check priceError in save button disabled logic
- Parse as integer: parseInt(value, 10)

Error messages:
- "Minimum price must be less than maximum"
- "Minimum price must be at least £10"
- "Maximum price must be under £200"
- "Enter whole pounds only (no pence)"

Theme: colors.error + Typography.caption

Test cases:
- Setting min=50, max=20 (error)
- Setting min=5 (error, below platform minimum)
- Setting max=250 (error, above platform maximum)
- Setting min=20, max=40 (valid)
- Entering decimal (reject or round)
- Submit with invalid range (blocked)
```

**Acceptance Criteria**:
- [ ] Inline error when minPrice > maxPrice
- [ ] Bounds validation: 10 <= minPrice, maxPrice <= 200
- [ ] Decimal input rejected (integers only)
- [ ] Error text below price section
- [ ] Save disabled when validation fails
- [ ] Valid ranges save successfully
- [ ] Currency symbol £ always shown

---

## Item 97: Drill Assignment Age Min > Max

**File**: `components/drills/assign-drill-form.tsx` ~lines 326-337

**Problem**: Same age range validation gap as session extras. Breaks drill filtering in athlete development views.

**Prompt**:
```
Add age range validation to drill assignment form (identical to session extras).

File: /Users/tubton/Desktop/coachapplication/clubroom/components/drills/assign-drill-form.tsx
Lines: ~326-337 (age range section)

Implementation: Use same validation logic as Item 95:
- Validate minAge <= maxAge
- Bounds: minAge >= 4, maxAge <= 18
- Show inline error text below age range
- Disable submit when validation fails
- Allow both null (no age restriction)

Error messages:
- "Minimum age must be less than maximum"
- "Minimum age must be at least 4"
- "Maximum age must be under 18"

Theme: colors.error + Typography.caption

Test cases: (same as Item 95)
- min=10, max=8 (error)
- min=3 (error)
- max=19 (error)
- min=8, max=12 (valid)
- both null (valid)
```

**Acceptance Criteria**:
- [ ] Same validation as session extras (Item 95)
- [ ] Inline error text shown
- [ ] Submit disabled on validation failure
- [ ] Valid ranges work correctly

---

## Item 191: Onboarding Email Accepts "@@@@"

**File**: `components/auth/onboarding-step-basic-info.tsx` ~lines 130-142

**Problem**: Email validation regex allows multiple @ symbols and invalid formats. Creates accounts that can't receive notifications. Breaks `NotificationSenderService.sendEmail()` which assumes valid email format.

**Prompt**:
```
Fix email validation in onboarding basic info step.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/auth/onboarding-step-basic-info.tsx
Lines: ~130-142 (email input + validation)

Current behavior:
- Weak regex or no validation
- Accepts: "@@@@", "test@", "@domain.com", "test..test@domain.com"
- Invalid emails saved to AsyncStorage
- Notifications fail silently

Requirements:
1. Use strict email validation regex
2. Show inline error on invalid format
3. Validate on blur and on submit
4. Error persists until valid email entered
5. Disable "Continue" button when email invalid

Implementation:
- Use regex: /^(?!\.)(?!.*\.\.)([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  (Rejects leading dots and consecutive dots like `test..test@domain.com`)
- Validate in onEmailChange: const isValid = emailRegex.test(value)
- Store error state: const [emailError, setEmailError] = useState<string | null>(null)
- Show error text below email input when emailError present
- Disable continue button: disabled={!email || emailError || !name || ...}

Error message: "Enter a valid email address"
Theme: colors.error + Typography.caption

Edge cases:
- Multiple @ symbols
- Missing domain
- Missing TLD
- Consecutive dots
- Leading/trailing dots
- Spaces in email

Test cases:
- "test@example.com" (valid)
- "@@@@" (invalid)
- "test@" (invalid)
- "@domain.com" (invalid)
- "test..test@domain.com" (invalid)
- "test test@domain.com" (invalid, space)
```

**Acceptance Criteria**:
- [ ] Strict email regex rejects common invalid patterns
- [ ] Inline error shown for invalid email
- [ ] Continue button disabled when email invalid
- [ ] Validation runs on blur and on submit
- [ ] Valid emails pass without error
- [ ] Error text uses design tokens

---

## Item 243: Camp Daily Times Invalid Range Doesn't Block Submit

**File**: `components/session/create-schedule-step.tsx` ~lines 354-356

**Problem**: Camp session type allows daily start time > end time. No validation before submit. Breaks calendar rendering in parent booking flow, causing overlapping time slots.

**Prompt**:
```
Add time range validation for camp session daily schedule.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx
Lines: ~354-356 (camp daily time pickers)

Current behavior:
- Two DateTimePicker components (mode="time")
- No cross-field validation
- Can save startTime="14:00", endTime="09:00"
- Breaks calendar grid: negative duration

Requirements:
1. Validate startTime < endTime
2. Minimum duration: 30 minutes
3. Maximum duration: 8 hours (camp limit)
4. Show inline error when validation fails
5. Disable submit when time validation fails

Implementation:
- Add helper: validateTimeRange(start: Date, end: Date): string | null
- Calculate duration: (end - start) in minutes
- Validate: duration >= 30 && duration <= 480
- Store error state: const [timeError, setTimeError] = useState<string | null>(null)
- Validate in both onStartTimeChange and onEndTimeChange
- Show error text below time pickers section
- Check timeError in submit disabled logic

Error messages:
- "End time must be after start time"
- "Minimum duration is 30 minutes"
- "Maximum duration is 8 hours"

Theme: colors.error + Typography.caption

Test cases:
- start=14:00, end=09:00 (error: end before start)
- start=10:00, end=10:20 (error: < 30 min)
- start=09:00, end=18:00 (error: > 8 hours)
- start=10:00, end=12:00 (valid: 2 hours)
- Submit with invalid times (blocked)
```

**Acceptance Criteria**:
- [ ] Inline error when end time <= start time
- [ ] Minimum duration 30 minutes enforced
- [ ] Maximum duration 8 hours enforced
- [ ] Error text below time pickers section
- [ ] Submit disabled when time validation fails
- [ ] Valid time ranges save successfully

---

## Item 247: Date Pickers No Max Date, Can Create 2099 Sessions

**File**: `components/session/create-schedule-step.tsx` ~line 252

**Problem**: No maximumDate prop on date pickers. Coaches can create sessions decades in the future, cluttering availability queries and breaking pagination in booking search.

**Prompt**:
```
Add maximum date constraint to all session date pickers.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx
Lines: ~252 (date picker)
Also check: components/bookings/create-session-date-picker.tsx ~88-101

Current behavior:
- DateTimePicker with no maximumDate prop
- Can select years 2030, 2050, 2099
- Breaks availability query performance (unbounded date range)
- Clutters coach availability calendar

Requirements:
1. Set maximumDate to 1 year from today
2. Apply to ALL session creation date pickers
3. Show helper text: "Sessions can be scheduled up to 1 year in advance"
4. Add validation in onSubmit as secondary check

Implementation:
- Calculate maxDate: new Date(Date.now() + 365 * 86400000)
- Add maximumDate={maxDate} to DateTimePicker
- In onSubmit: if (selectedDate > maxDate) return showToast('Date must be within 1 year', 'error')
- Add helper text below date picker (colors.muted + Typography.caption)

Files to update:
1. /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx ~252
2. /Users/tubton/Desktop/coachapplication/clubroom/components/bookings/create-session-date-picker.tsx ~88-101

Test cases:
- Selecting date 13 months from now (blocked)
- Selecting date 6 months from now (valid)
- Selecting date 1 year from today (valid)
- Attempting submit with date > 1 year (error toast)
```

**Acceptance Criteria**:
- [ ] maximumDate set to 1 year from today on all session date pickers
- [ ] Helper text explaining 1-year limit
- [ ] Submit validation as secondary check
- [ ] Error toast if validation bypassed
- [ ] Valid dates within 1 year save successfully
- [ ] Applied to both create-schedule-step and create-session-date-picker

---

## Item 248: Rating Bar Accepts 0, Looks Unrated

**File**: `components/session/rating-bar.tsx` ~lines 19-27

**Problem**: Rating component allows value=0, which renders as empty stars but is stored as rated. This breaks rating averages in coach profiles and creates ambiguity in review data.

**Prompt**:
```
Fix rating bar to enforce minimum rating of 1 star.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/rating-bar.tsx
Lines: ~19-27 (rating logic)

Current behavior:
- value prop accepts 0
- Renders as empty stars (looks unrated)
- Stored as 0 in database
- Breaks average calculation: sum includes 0s, lowering coach rating unfairly

Requirements:
1. Minimum rating must be 1
2. If value < 1, treat as null (unrated)
3. onValueChange should not fire for value < 1
4. Show helper text: "Tap to rate (1-5 stars)"
5. Initial state: null (unrated) not 0

Implementation:
- Add prop validation: value must be null or 1-5
- In onPress handler: const newValue = Math.max(1, pressedStar)
- Don't allow clearing to 0 (tap star 1 when rating is 1 = stays 1)
- If need to clear rating, add separate "Clear rating" button
- Update type: value?: number | null (not defaulting to 0)

Visual states:
- null: empty stars + helper text
- 1-5: filled stars up to value

Test cases:
- Initial render with value=undefined (shows helper text)
- Tapping star 1 (sets value=1, star fills)
- Tapping star 1 again when rating=1 (stays 1, doesn't clear)
- Tapping star 5 (sets value=5)
- Prop value=0 passed (treated as null/unrated)
```

**Acceptance Criteria**:
- [ ] Minimum rating enforced: value >= 1 or null
- [ ] value=0 treated as null (unrated state)
- [ ] Helper text shown in unrated state
- [ ] Cannot clear to 0 by tapping current star
- [ ] Rating 1-5 works correctly
- [ ] Type updated to number | null

---

## Item 254: Drill Assignment 0 Reps Via parseInt

**File**: `hooks/use-drill-assign.ts` ~line 119

**Problem**: parseInt returns 0 for invalid input like "abc". 0 reps assignments saved, breaking drill completion tracking.

**Prompt**:
```
Fix drill assignment reps validation in hook.

File: /Users/tubton/Desktop/coachapplication/clubroom/hooks/use-drill-assign.ts
Lines: ~119 (reps parsing)

Current behavior:
- parseInt("abc", 10) returns NaN
- parseInt("", 10) returns NaN
- NaN coerced to 0 in some contexts
- 0 reps assignments saved, break completion %

Requirements:
1. Validate reps >= 1 and <= 100
2. Return Result<T, ServiceError> with validation error
3. Show error in form UI (pass error up)
4. Default to null/undefined, not 0

Implementation:
- In assignDrill function, before apiClient.set():
  ```typescript
  const reps = parseInt(repsInput, 10);
  if (isNaN(reps) || reps < 1 || reps > 100) {
    return err({
      code: 'VALIDATION',
      message: 'Reps must be between 1 and 100'
    });
  }
  ```
- Update type: reps: number (not number | undefined, because validated)
- Form component must handle error result and show inline error

Test cases:
- Input "abc" (validation error)
- Input "" (validation error)
- Input "0" (validation error)
- Input "101" (validation error)
- Input "10" (valid)
```

**Acceptance Criteria**:
- [ ] parseInt result validated before use
- [ ] Returns error result for NaN, < 1, > 100
- [ ] Form shows inline error from hook result
- [ ] Valid reps 1-100 save successfully
- [ ] No 0-rep assignments possible

---

## Item 288: Club Create Whitespace Name Passes

**File**: `app/club/create.tsx` ~line 249

**Problem**: Club name field accepts whitespace-only strings. Creates clubs with invisible names, breaking club list rendering and search.

**Prompt**:
```
Add whitespace validation to club name input.

File: /Users/tubton/Desktop/coachapplication/clubroom/app/club/create.tsx
Lines: ~249 (name input + validation)

Current behavior:
- name.trim() not called before validation
- "   " (spaces) passes length check
- Club saved with empty/whitespace name
- Breaks club list: renders blank card

Requirements:
1. Trim input on blur and before submit
2. Validate trimmed length >= 3
3. Show inline error for whitespace-only
4. Disable submit when name invalid

Implementation:
- Add onBlur to name input: setName(name.trim())
- In validation: const trimmedName = name.trim()
- Check: if (trimmedName.length < 3) setNameError('Club name must be at least 3 characters')
- In handleSubmit: validate trimmed name before calling ClubService.createClub()
- Show error text below name input when nameError present
- Disable submit: disabled={!name.trim() || nameError || ...}

Error message: "Club name cannot be empty or spaces only"
Theme: colors.error + Typography.caption

Test cases:
- Input "   " (3 spaces) (error)
- Input "  AB  " (trims to "AB") (error: < 3 chars)
- Input "  ABC  " (trims to "ABC") (valid)
- Input "Real Madrid" (valid)
- Submit with whitespace-only name (blocked)
```

**Acceptance Criteria**:
- [ ] Name trimmed on blur and before submit
- [ ] Whitespace-only strings rejected
- [ ] Inline error shown below input
- [ ] Submit disabled when name invalid
- [ ] Valid names (trimmed length >= 3) save successfully

---

## Item 301: Price Inputs Accept Negative/Letters

**Files**:
- `components/bookings/create-session-extras.tsx`
- `components/session/create-schedule-step.tsx` ~line 421
- `components/invite/create-details-step.tsx` ~line 99

**Problem**: Price TextInput uses keyboardType="number-pad" but doesn't validate input. Allows negative via paste, letters via external keyboard. Breaks payment calculations.

**Prompt**:
```
Add strict validation to all price input fields across 3 files.

Files:
1. /Users/tubton/Desktop/coachapplication/clubroom/components/bookings/create-session-extras.tsx
2. /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx ~421
3. /Users/tubton/Desktop/coachapplication/clubroom/components/invite/create-details-step.tsx ~99

Current behavior:
- keyboardType="number-pad" on iOS/Android doesn't prevent paste
- External keyboard can enter letters
- No input sanitization
- Can save negative prices, breaking payment flow

Requirements:
1. Sanitize input: only allow digits (0-9)
2. Parse as positive integer (GBP, no decimals)
3. Validate range: 10 <= price <= 200 (platform limits)
4. Show inline error on invalid input
5. Disable submit when price invalid

Implementation for EACH file:
- In onChangeText handler:
  ```typescript
  const sanitized = value.replace(/[^0-9]/g, ''); // only digits
  const parsed = parseInt(sanitized, 10);
  if (isNaN(parsed) || parsed < 10 || parsed > 200) {
    setPriceError('Price must be between £10 and £200');
  } else {
    setPriceError(null);
  }
  setPrice(sanitized); // store string to preserve input
  ```
- Show error text below price input when priceError present
- Disable submit: disabled={priceError || ...}

Error message: "Price must be between £10 and £200 (whole pounds only)"
Theme: colors.error + Typography.caption

Test cases:
- Paste "-50" (sanitized to "50")
- Type "abc" via external keyboard (blocked)
- Enter "5" (error: < £10)
- Enter "250" (error: > £200)
- Enter "20" (valid)
```

**Acceptance Criteria**:
- [ ] All 3 files updated with same validation logic
- [ ] Input sanitized: only digits 0-9 allowed
- [ ] Range validation: 10-200 enforced
- [ ] Inline error text shown per field
- [ ] Submit disabled when any price invalid
- [ ] Valid prices save successfully
- [ ] Paste and external keyboard handled

---

## Item 304: Camp Date Picker End Before Start

**File**: `components/session/create-schedule-step.tsx`

**Problem**: Camp session type has separate date pickers for start/end date with no validation. Can create camp ending before it starts, breaking multi-day session logic.

**Prompt**:
```
Add date range validation for camp session type.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx
Lines: ~200-250 (camp date pickers)

Current behavior:
- Two DateTimePicker components (startDate, endDate)
- No cross-field validation
- Can save: startDate="2026-06-15", endDate="2026-06-10"
- Breaks: camp duration calculation, calendar rendering, booking slots

Requirements:
1. endDate must be >= startDate
2. Minimum camp duration: 1 day (start = end is valid for single-day camp)
3. Maximum camp duration: 14 days (policy limit)
4. Show inline error when validation fails
5. Disable submit when date validation fails

Implementation:
- Add helper: validateCampDateRange(start: Date, end: Date): string | null
- Calculate duration: Math.ceil((end - start) / 86400000) in days
- Validate: end >= start && duration <= 14
- Store error state: const [dateRangeError, setDateRangeError] = useState<string | null>(null)
- Validate in both onStartDateChange and onEndDateChange
- Show error text below date pickers section
- Check dateRangeError in submit disabled logic

Error messages:
- "End date must be same day or after start date"
- "Maximum camp duration is 14 days"

Theme: colors.error + Typography.caption

Test cases:
- start=2026-06-15, end=2026-06-10 (error: end before start)
- start=2026-06-15, end=2026-06-15 (valid: single-day camp)
- start=2026-06-01, end=2026-06-20 (error: > 14 days)
- start=2026-07-01, end=2026-07-05 (valid: 5-day camp)
- Submit with invalid range (blocked)
```

**Acceptance Criteria**:
- [ ] endDate >= startDate enforced
- [ ] Single-day camps allowed (start = end)
- [ ] Maximum 14-day duration enforced
- [ ] Inline error shown below date pickers
- [ ] Submit disabled when validation fails
- [ ] Valid date ranges save successfully

---

## Item 305: Session Time Validation Error Doesn't Block Submit

**File**: `components/session/create-schedule-step.tsx` ~lines 336-343

**Problem**: Time validation shows error text but submit button remains enabled. Broken sessions created, causing booking failures.

**Prompt**:
```
Connect time validation error state to submit button disabled logic.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx
Lines: ~336-343 (time validation + submit button)

Current behavior:
- validateTimes() function exists and sets error state
- Error text renders below time pickers
- Submit button doesn't check error state
- Can submit with startTime > endTime

Requirements:
1. Find all validation error state variables
2. Add to submit button disabled logic
3. Ensure validation runs before submit attempt
4. Show toast if submit attempted with errors (defensive)

Implementation:
- Identify error state: timeError, dateRangeError, etc.
- Update submit button disabled prop:
  ```typescript
  disabled={
    !sessionType ||
    !date ||
    !startTime ||
    !endTime ||
    timeError !== null ||
    dateRangeError !== null ||
    priceError !== null ||
    isSubmitting
  }
  ```
- In handleSubmit, add validation check:
  ```typescript
  if (timeError || dateRangeError || priceError) {
    showToast('Please fix errors before submitting', 'error');
    return;
  }
  ```

Test cases:
- Set invalid time range (submit disabled)
- Set invalid date range (submit disabled)
- Fix errors (submit enabled)
- Attempt submit with hidden errors (toast shown, blocked)
```

**Acceptance Criteria**:
- [ ] Submit button disabled when any validation error present
- [ ] All validation error states checked in disabled logic
- [ ] handleSubmit validates before proceeding
- [ ] Error toast shown if submit attempted with errors
- [ ] Valid form submits successfully

---

## Item 308: Decimal Price Allows Multiple Dots

**File**: `components/session/create-schedule-step.tsx` ~line 421

**Problem**: Price input validation doesn't block multiple decimal points. Can enter "20..50" or "2.0.0", breaking payment parsing.

**Prompt**:
```
Fix price input to reject multiple decimal points (NOTE: platform policy is integers only).

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/create-schedule-step.tsx
Lines: ~421 (price input)

Context: Platform policy is GBP integers only (no pence). But if decimal allowed, must validate.

Current behavior:
- Can enter "20..50"
- parseFloat("20..50") = 20 (loses data)
- Or NaN in some cases

Solution 1 (Recommended): Enforce integers only
- Sanitize: value.replace(/[^0-9]/g, '')
- Show helper text: "Enter whole pounds (no pence)"
- See Item 301 implementation

Solution 2 (If decimals needed): Validate single dot
- Sanitize: value.replace(/[^0-9.]/g, '')
- Check: (value.match(/\./g) || []).length <= 1
- Limit to 2 decimal places: value.match(/^\d+(\.\d{0,2})?$/)

Implementation (Solution 1 - integers):
Same as Item 301:
- In onChangeText: const sanitized = value.replace(/[^0-9]/g, '')
- Parse as integer: parseInt(sanitized, 10)
- Validate range: 10-200
- Show error if invalid

Test cases:
- Input "20..50" (sanitized to "2050")
- Input "20.50" (sanitized to "2050")
- Input "20.5.0" (sanitized to "2050")
- Input "20" (valid)
```

**Acceptance Criteria**:
- [ ] Multiple decimal points blocked
- [ ] If integers-only policy: all non-digits rejected
- [ ] If decimals allowed: max 1 dot, 2 decimal places
- [ ] Helper text explains format
- [ ] Valid prices save correctly

---

## Sprint 1 Summary

**Total Items**: 17
**Effort**: 12 engineer-days
**Risk**: Low (localized changes, no API dependencies)

**Success Criteria**:
- [ ] Zero validation bypasses in production
- [ ] All forms show inline errors with design tokens
- [ ] Submit buttons disabled when any validation fails
- [ ] AsyncStorage contains no invalid data (audit via /settings/debug)
- [ ] No console errors or warnings on form interaction

**Testing Strategy**:
1. Automated: Add validation tests to existing test files (use node:test)
2. Manual: QA checklist per form (valid/invalid/edge cases)
3. Regression: Ensure valid flows still work

**Deployment**:
- Can deploy individually (each fix is isolated)
- Recommend batching by file (e.g., all session-create-schedule-step fixes together)
- Monitor AsyncStorage for invalid data post-deploy

**Dependencies**:
- None (all fixes are component-level)

**Follow-up Work**:
- Sprint 2: Input limits (maxLength, character filtering)
- Sprint 3: Modal interaction (keyboard dismiss, unsaved changes)
- Sprint 4: UX polish (defaults, helper text, accessibility)
