# Forms & Modals Sprint 2: Input Limits and Filtering

**Goal**: Add character limits, input filtering, and length constraints to prevent data truncation, display overflow, and UX confusion. These gaps cause silently corrupted data and poor mobile UX.

**Priority**: P1 — Pre-launch polish
**Effort**: 10 engineer-days
**Dependencies**: Sprint 1 validation fixes

---

## Item 36: Session Type Name Truncates at 40 Silently

**File**: `components/coach/session-type-modal.tsx` ~line 134

**Problem**: No maxLength on name input. Long names accepted but truncated in database or UI, creating confusion. Coach sees "Advanced Ball Mastery and Technical Skills Development" but it saves as "Advanced Ball Mastery and Technical S".

**Prompt**:
```
Add character limit with counter to session type name input.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/session-type-modal.tsx
Lines: ~134 (name TextInput)

Current behavior:
- No maxLength prop
- Can enter 100+ characters
- Database or UI truncates at 40
- No warning to coach

Requirements:
1. Add maxLength={40} to TextInput
2. Show character counter: "25/40" below input
3. Counter turns red when approaching limit (>35 chars)
4. Helper text: "Short names work best for parent booking screens"
5. Trim whitespace before save

Implementation:
- Add maxLength={40} prop to TextInput
- Add character counter below input:
  ```typescript
  <ThemedText style={[
    Typography.caption,
    { color: name.length > 35 ? colors.error : colors.muted }
  ]}>
    {name.length}/40
  </ThemedText>
  ```
- Add helper text below counter (colors.muted + Typography.caption)
- In onSubmit: const trimmedName = name.trim()
- Validate trimmed length >= 3

Layout:
- Column: name input → counter (right-aligned) → helper text
- Spacing.xs between elements

Test cases:
- Entering 41st character (blocked)
- Name with 36 characters (counter turns red)
- Name with 40 characters (valid)
- Paste 60-character string (truncated to 40)
- Name with leading/trailing spaces (trimmed on save)
```

**Acceptance Criteria**:
- [ ] maxLength={40} enforced
- [ ] Character counter shown: "X/40"
- [ ] Counter turns red when > 35 characters
- [ ] Helper text explaining best practice
- [ ] Name trimmed before save
- [ ] Counter uses design tokens

---

## Item 37: Session Type Capacity Resets to 1 on Type Change

**File**: `components/coach/session-type-modal.tsx` ~lines 99-102

**Problem**: Editing existing session type, changing category (1-1 → Group) resets capacity to 1. Loss of data without warning.

**Prompt**:
```
Preserve capacity value when changing session type category.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/coach/session-type-modal.tsx
Lines: ~99-102 (type category selector + capacity input)

Current behavior:
- When type changes from Group → 1-1, capacity resets to 1
- When type changes from 1-1 → Group, capacity stays 1 (should suggest default)
- No warning about data loss

Requirements:
1. Preserve capacity value when changing category
2. Show warning if changing from Group (capacity > 1) to 1-1 (capacity must = 1)
3. Auto-adjust capacity when switching to 1-1 (set to 1)
4. Suggest smart default when switching to Group (e.g., 8)
5. Don't reset if user manually set a value

Implementation:
- Remove capacity reset in onTypeChange handler
- Add conditional logic:
  ```typescript
  // Use a confirmation modal state (not Alert.alert — consistent with project pattern)
  const [showCapacityConfirm, setShowCapacityConfirm] = useState(false);
  const [pendingNewType, setPendingNewType] = useState<SessionType | null>(null);

  const handleTypeChange = useCallback((newType: SessionType) => {
    if (newType === '1-1' && capacity > 1) {
      // Show confirmation modal: "Changing to 1-1 will set capacity to 1 player. Continue?"
      // Options: "Cancel" and "Change"
      setPendingNewType(newType);
      setShowCapacityConfirm(true);
    } else if (newType === 'Group' && capacity === 1) {
      setType(newType);
      // Suggest default, but don't override if user manually set to 1
      if (!capacityManuallySet) {
        setCapacity(8);
      }
    } else {
      setType(newType);
    }
  };
  ```
- Track if capacity was manually changed: const [capacityManuallySet, setCapacityManuallySet] = useState(false)
- Set true in onCapacityChange handler

Test cases:
- Edit Group session (capacity=10), change to 1-1 (warning shown, capacity → 1)
- Edit 1-1 session, change to Group (capacity → 8 suggested)
- Edit 1-1 session with manually set capacity=1, change to Group (stays 1)
- Create new Group session (default capacity=8)
```

**Acceptance Criteria**:
- [ ] Capacity preserved when changing category (unless invalid)
- [ ] Warning shown when Group → 1-1 with capacity > 1
- [ ] Smart default (8) suggested when 1-1 → Group (if not manually set)
- [ ] User-set capacity values respected
- [ ] No silent data resets

---

## Item 94: Guardian Invite Email No Validation

**File**: `components/family/sharing-invite-modal.tsx` ~lines 74-82

**Problem**: Email input has no validation. Can send invites to invalid emails, wasting invite quota and creating support tickets.

**Prompt**:
```
Add email validation to guardian invite modal.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/family/sharing-invite-modal.tsx
Lines: ~74-82 (email input + send button)

Requirements: Same as Item 191 (onboarding email validation)
1. Use strict email regex: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
2. Show inline error on invalid format
3. Validate on blur and before send
4. Disable send button when email invalid
5. Check for duplicate: don't allow inviting already-invited email

Implementation:
- Validate in onEmailChange: const isValid = emailRegex.test(value)
- Store error state: const [emailError, setEmailError] = useState<string | null>(null)
- Check duplicates: if (existingInvites.some(inv => inv.email === email)) setEmailError('Already invited')
- Show error text below email input
- Disable send button: disabled={!email || emailError || isSending}
- Trim email before validation and send

Error messages:
- "Enter a valid email address"
- "This email has already been invited"

Theme: colors.error + Typography.caption

Test cases:
- Enter "invalid@" (error shown)
- Enter "test@example.com" (valid)
- Enter already-invited email (error: duplicate)
- Send with invalid email (blocked)
```

**Acceptance Criteria**:
- [ ] Same email validation as Item 191
- [ ] Inline error shown for invalid email
- [ ] Duplicate check before send
- [ ] Send button disabled when validation fails
- [ ] Valid, unique emails send successfully

---

## Item 98: Drill Assignment Accepts 99 Reps

**File**: `components/drills/assign-drill-form.tsx` ~lines 326-337

**Problem**: Reps input accepts 1-999. Unrealistic assignments (50+ reps) create athlete frustration. Need UX limit.

**Prompt**:
```
Add maxLength and validation to drill reps input.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/drills/assign-drill-form.tsx
Lines: ~326-337 (reps TextInput)

Current behavior:
- Can enter 999 reps
- Unrealistic for youth athletes (fatigue, injury risk)
- No upper bound guidance

Requirements:
1. Add maxLength={2} (max 99 reps)
2. Validate range: 1-50 reps (youth athlete limit)
3. Show inline error if > 50
4. Show helper text: "Recommended: 10-20 reps per drill"
5. Parse as integer (no decimals)

Implementation:
- Add maxLength={2} to TextInput
- In onRepsChange:
  ```typescript
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    setRepsError('Minimum 1 rep');
  } else if (parsed > 50) {
    setRepsError('Maximum 50 reps recommended for youth athletes');
  } else {
    setRepsError(null);
  }
  ```
- Show error text below reps input when repsError present
- Add helper text below input (colors.muted + Typography.caption)
- Disable submit: disabled={repsError || ...}

Test cases:
- Enter "0" (error: minimum 1)
- Enter "51" (error: max 50)
- Enter "99" (blocked by maxLength={2}, but if entered, shows error)
- Enter "20" (valid, helper text shown)
```

**Acceptance Criteria**:
- [ ] maxLength={2} enforced
- [ ] Range validation: 1-50 reps
- [ ] Inline error for out-of-range values
- [ ] Helper text with recommendation
- [ ] Submit disabled on validation failure
- [ ] Valid values 1-50 save successfully

---

## Item 100: Session Notes Unlimited Length

**File**: `components/session/session-notes-form.tsx`

**Problem**: Notes TextInput has no maxLength. Coaches write essays (500+ words), breaking layout in parent progress view where notes are displayed in cards.

**Prompt**:
```
Add character limit with counter to session notes textarea.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/session-notes-form.tsx
Lines: ~50-80 (notes TextInput)

Current behavior:
- No maxLength
- Can enter 10,000+ characters
- Breaks progress card layout (overflow, performance)

Requirements:
1. Add maxLength={500}
2. Show character counter with progress bar
3. Counter turns red when > 450 chars
4. Show helper text: "Brief notes help parents. Focus on key observations."
5. Trim whitespace before save

Implementation:
- Add maxLength={500} to TextInput
- Character counter with progress bar:
  ```typescript
  <Row style={{ alignItems: 'center', gap: Spacing.xs }}>
    <View style={{
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: Radii.pill
    }}>
      <View style={{
        width: `${(notes.length / 500) * 100}%`,
        height: '100%',
        backgroundColor: notes.length > 450 ? colors.error : colors.primary,
        borderRadius: Radii.pill
      }} />
    </View>
    <ThemedText style={[
      Typography.caption,
      { color: notes.length > 450 ? colors.error : colors.muted }
    ]}>
      {notes.length}/500
    </ThemedText>
  </Row>
  ```
- Add helper text above input (colors.muted + Typography.caption)
- Trim before save: const trimmedNotes = notes.trim()

Test cases:
- Enter 501 characters (blocked)
- Enter 460 characters (counter red)
- Enter 250 characters (counter normal, progress bar ~50%)
- Paste 1000-character text (truncated to 500)
```

**Acceptance Criteria**:
- [ ] maxLength={500} enforced
- [ ] Visual progress bar shows character usage
- [ ] Counter turns red when > 450 chars
- [ ] Helper text explaining brevity
- [ ] Notes trimmed before save
- [ ] Progress bar and counter use design tokens

---

## Item 101: Athlete Notes Unlimited

**File**: `components/athlete/athlete-notes-tab.tsx` ~lines 111-121

**Problem**: Same as Item 100. Athlete notes have no character limit, breaking roster grid layout.

**Prompt**:
```
Add character limit to athlete notes (identical to session notes).

File: /Users/tubton/Desktop/coachapplication/clubroom/components/athlete/athlete-notes-tab.tsx
Lines: ~111-121 (notes TextInput)

Implementation: Same as Item 100:
- maxLength={500}
- Character counter with progress bar
- Counter red when > 450
- Helper text: "Quick notes for coaching reference"
- Trim before save

Test cases: (same as Item 100)
```

**Acceptance Criteria**:
- [ ] Same implementation as Item 100
- [ ] maxLength={500} enforced
- [ ] Visual feedback consistent with session notes
- [ ] Helper text appropriate for athlete context

---

## Item 102: Goal Title No Char Limit

**File**: `components/progress/goals-compact.tsx` ~lines 165-177

**Problem**: Goal title input has no maxLength. Long titles break goal card layout in parent progress view and athlete dashboard.

**Prompt**:
```
Add character limit with counter to goal title input.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/progress/goals-compact.tsx
Lines: ~165-177 (title TextInput)

Current behavior:
- No maxLength
- Can enter 200+ characters
- Breaks goal card: title overflows, card height excessive

Requirements:
1. Add maxLength={60}
2. Show character counter: "35/60"
3. Counter turns red when > 55 chars
4. Helper text: "Short, specific goals are more motivating"
5. Trim before save

Implementation:
- Add maxLength={60} to TextInput
- Character counter below input:
  ```typescript
  <ThemedText style={[
    Typography.caption,
    {
      color: title.length > 55 ? colors.error : colors.muted,
      textAlign: 'right'
    }
  ]}>
    {title.length}/60
  </ThemedText>
  ```
- Add helper text below counter
- Trim in onSubmit: const trimmedTitle = title.trim()

Test cases:
- Enter 61 characters (blocked)
- Enter 58 characters (counter red)
- Enter "Master step-over move with both feet consistently" (valid, 51 chars)
- Paste 100-character string (truncated to 60)
```

**Acceptance Criteria**:
- [ ] maxLength={60} enforced
- [ ] Character counter shown
- [ ] Counter red when > 55 chars
- [ ] Helper text about specificity
- [ ] Title trimmed before save
- [ ] Counter right-aligned

---

## Item 103: Create Post Whitespace-Only Accepted

**File**: `components/social/create-post-form.tsx` ~lines 191-202

**Problem**: Post body accepts whitespace-only strings. Creates empty posts in feed, breaking social feed layout.

**Prompt**:
```
Add whitespace validation and character limit to post body.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/social/create-post-form.tsx
Lines: ~191-202 (body TextInput + submit button)

Current behavior:
- No trim on validation
- "   " (spaces) accepted
- Empty post appears in feed

Requirements:
1. Trim input on blur and before submit
2. Validate trimmed length >= 10 characters
3. Add maxLength={1000} for post body
4. Show character counter with progress bar (similar to Item 100)
5. Show inline error for whitespace-only
6. Disable submit when body invalid

Implementation:
- Add maxLength={1000} to TextInput
- Add onBlur: setBody(body.trim())
- Validation: const trimmedBody = body.trim()
- Check: if (trimmedBody.length < 10) setBodyError('Post must be at least 10 characters')
- Character counter with progress bar (see Item 100 implementation)
- Disable submit: disabled={!body.trim() || body.trim().length < 10 || isPosting}

Error message: "Post cannot be empty or spaces only"
Helper text: "Share updates, tips, or celebration with your club"

Test cases:
- Input "     " (error: whitespace only)
- Input "Test" (error: < 10 chars)
- Input "Looking forward to training this weekend!" (valid, 46 chars)
- Input 1001 characters (blocked by maxLength)
```

**Acceptance Criteria**:
- [ ] Body trimmed on blur and before submit
- [ ] Minimum 10 characters (trimmed)
- [ ] maxLength={1000} enforced
- [ ] Character counter with progress bar shown
- [ ] Inline error for invalid input
- [ ] Submit disabled when validation fails
- [ ] Valid posts submit successfully

---

## Item 104: Credential Blank "Other" Name Accepted

**File**: `components/verification/credential-form.tsx` ~lines 93-103

**Problem**: When credential type is "Other", name field accepts empty/whitespace string. Creates credentials with no visible title in profile.

**Prompt**:
```
Add validation for "Other" credential name field.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/verification/credential-form.tsx
Lines: ~93-103 (conditional "Other" name input)

Current behavior:
- "Other" type shows name TextInput
- No validation on name field
- Can save blank name
- Credential appears with no title in coach profile

Requirements:
1. Require name when type="Other"
2. Validate trimmed length >= 3
3. Add maxLength={50} to name input
4. Show character counter
5. Show inline error when invalid
6. Disable submit when Other selected and name invalid

Implementation:
- Add conditional validation:
  ```typescript
  if (credentialType === 'Other') {
    const trimmedName = otherName.trim();
    if (trimmedName.length < 3) {
      setNameError('Credential name must be at least 3 characters');
    } else {
      setNameError(null);
    }
  }
  ```
- Add maxLength={50} to TextInput
- Character counter: "{otherName.length}/50"
- Show error text below name input when nameError present
- Disable submit: disabled={credentialType === 'Other' && (!otherName.trim() || nameError) || ...}

Error message: "Enter a credential name"
Helper text: "e.g., 'Grassroots Coach Award', 'First Aid Certificate'"

Test cases:
- Select "Other", leave name blank (error, submit disabled)
- Enter "AB" (error: < 3 chars)
- Enter "Advanced Coaching Diploma" (valid)
- Enter 51 characters (blocked by maxLength)
```

**Acceptance Criteria**:
- [ ] Name required when type="Other"
- [ ] Trimmed length >= 3 enforced
- [ ] maxLength={50} with character counter
- [ ] Inline error shown when invalid
- [ ] Submit disabled when Other selected and name invalid
- [ ] Helper text with examples shown

---

## Item 105: Block Date Empty Reason for "Other"

**File**: `components/availability/block-date-form.tsx` ~lines 127-136

**Problem**: When reason is "Other", notes field accepts empty string. Creates blocked dates with no explanation, confusing athletes when they see no available slots.

**Prompt**:
```
Add validation for "Other" reason notes field in block date form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/availability/block-date-form.tsx
Lines: ~127-136 (conditional notes TextInput)

Current behavior:
- "Other" reason shows notes TextInput
- No validation on notes field
- Can save blank notes
- Athletes see blocked date with no reason (UX: "Why can't I book?")

Requirements:
1. Require notes when reason="Other"
2. Validate trimmed length >= 10 characters
3. Add maxLength={200} to notes input
4. Show character counter
5. Show inline error when invalid
6. Disable submit when Other selected and notes invalid

Implementation:
- Add conditional validation:
  ```typescript
  if (reason === 'Other') {
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length < 10) {
      setNotesError('Please provide a reason (at least 10 characters)');
    } else {
      setNotesError(null);
    }
  }
  ```
- Add maxLength={200} to TextInput
- Character counter: "{notes.length}/200"
- Show error text below notes input when notesError present
- Disable submit: disabled={reason === 'Other' && (!notes.trim() || notesError) || ...}

Error message: "Please provide a brief reason"
Helper text: "This helps athletes understand your availability"

Test cases:
- Select "Other", leave notes blank (error, submit disabled)
- Enter "Test" (error: < 10 chars)
- Enter "Family holiday in Spain" (valid, 25 chars)
- Enter 201 characters (blocked by maxLength)
```

**Acceptance Criteria**:
- [ ] Notes required when reason="Other"
- [ ] Trimmed length >= 10 enforced
- [ ] maxLength={200} with character counter
- [ ] Inline error shown when invalid
- [ ] Submit disabled when Other selected and notes invalid
- [ ] Helper text explaining purpose

---

## Item 147: Join Club Empty Invite Code Accepted

**File**: `components/club/JoinClubCard.tsx` ~lines 64-71

**Problem**: Invite code input has no validation. Accepts empty string or whitespace, making API call that always fails. Wastes network and creates confusion.

**Prompt**:
```
Add validation to club invite code input.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/club/JoinClubCard.tsx
Lines: ~64-71 (invite code TextInput + join button)

Current behavior:
- No validation on invite code
- Join button always enabled
- Empty code makes API call → fails
- No explanation to user

Requirements:
1. Invite code format: 6 alphanumeric characters (platform standard)
2. Convert input to uppercase automatically
3. Validate format: /^[A-Z0-9]{6}$/
4. Show inline error on invalid format
5. Disable join button when code invalid
6. Trim and uppercase before submit

Implementation:
- Add onChangeText with auto-uppercase:
  ```typescript
  const handleCodeChange = (value: string) => {
    const sanitized = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setInviteCode(sanitized);

    if (sanitized.length === 6) {
      setCodeError(null);
    } else if (sanitized.length > 0) {
      setCodeError('Code must be 6 characters');
    }
  };
  ```
- Add maxLength={6} to TextInput
- Show error text below input when codeError present
- Disable join: disabled={inviteCode.length !== 6 || codeError || isJoining}

Helper text: "Enter the 6-character code from your coach"
Error message: "Code must be 6 characters (letters and numbers)"

Test cases:
- Enter "abc" (shows "3/6", join disabled)
- Enter "abc123" (valid, join enabled)
- Enter "abc-123" (sanitized to "ABC123")
- Enter lowercase "abc123" (converted to "ABC123")
- Enter 7 characters (blocked by maxLength)
```

**Acceptance Criteria**:
- [ ] maxLength={6} enforced
- [ ] Auto-uppercase on input
- [ ] Non-alphanumeric characters stripped
- [ ] Validation: exactly 6 chars
- [ ] Inline error for invalid format
- [ ] Join disabled until valid code entered
- [ ] Helper text explaining source of code

---

## Item 160: Message Send Active for Whitespace

**File**: `components/messaging/message-composer.tsx` ~line 51

**Problem**: Send button enabled when message is whitespace-only. Creates empty message bubbles in chat.

**Prompt**:
```
Add whitespace validation to message send button.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/messaging/message-composer.tsx
Lines: ~51 (send button disabled logic)

Current behavior:
- Send button: disabled={!message.trim()}
- Wait, that should work... let me check actual code
- If currently: disabled={!message} (no trim), that's the bug

Requirements:
1. Trim message before checking if empty
2. Validate minimum length (optional: >= 1 after trim)
3. Show helper text when message is whitespace-only
4. Trim before sending

Implementation:
- Update send button disabled logic:
  ```typescript
  disabled={!message.trim() || isSending || attachments.length > 5}
  ```
- In handleSend:
  ```typescript
  const trimmedMessage = message.trim();
  if (!trimmedMessage && attachments.length === 0) {
    return; // Don't send empty messages without attachments
  }
  // Send trimmedMessage, not message
  ```
- Allow empty message if attachments present (send photo-only message)

Test cases:
- Type "    " (4 spaces) (send button disabled)
- Type "Hello" (send button enabled)
- Type "  " and add photo (send button enabled, sends photo with no text)
- Send message with leading/trailing spaces (trimmed before send)
```

**Acceptance Criteria**:
- [ ] Send button disabled when message is whitespace-only
- [ ] Message trimmed before sending
- [ ] Empty message allowed if attachments present
- [ ] No empty message bubbles in chat
- [ ] Leading/trailing spaces removed from sent messages

---

## Item 161: Comment Input Whitespace Accepted

**File**: `components/social/comment-input.tsx` ~line 39

**Problem**: Same as Item 160. Comment submit allows whitespace-only, creating empty comments on posts.

**Prompt**:
```
Add whitespace validation to comment submit (identical to message send).

File: /Users/tubton/Desktop/coachapplication/clubroom/components/social/comment-input.tsx
Lines: ~39 (submit button disabled logic)

Implementation: Same as Item 160:
- Disabled logic: disabled={!comment.trim() || isSubmitting}
- In handleSubmit: const trimmedComment = comment.trim()
- Don't submit if trimmedComment is empty

Test cases: (same as Item 160)
```

**Acceptance Criteria**:
- [ ] Same implementation as Item 160
- [ ] Submit disabled for whitespace-only comments
- [ ] Comments trimmed before sending
- [ ] No empty comment bubbles in feed

---

## Item 166: Comment Char Limit Invisible

**File**: `components/social/comment-input.tsx` ~line 90

**Problem**: Comments have maxLength but no character counter. Users hit limit and don't know why input stops.

**Prompt**:
```
Add character counter to comment input.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/social/comment-input.tsx
Lines: ~90 (TextInput)

Current behavior:
- Has maxLength prop (check actual value, assume 500)
- No visual feedback
- User hits limit, confused why typing stops

Requirements:
1. Show character counter: "250/500"
2. Counter turns red when > 450 chars
3. Small, non-intrusive (caption text)
4. Right-aligned below input

Implementation:
- Find current maxLength value (or add if missing: maxLength={500})
- Add counter below input:
  ```typescript
  <ThemedText style={[
    Typography.caption,
    {
      color: comment.length > 450 ? colors.error : colors.muted,
      textAlign: 'right',
      marginTop: Spacing.xxs
    }
  ]}>
    {comment.length}/500
  </ThemedText>
  ```

Test cases:
- Enter 451 characters (counter turns red)
- Enter 500 characters (counter red, at limit)
- Enter 501 characters (blocked by maxLength)
```

**Acceptance Criteria**:
- [ ] Character counter shown below input
- [ ] Counter turns red when > 450 chars
- [ ] Right-aligned, caption text size
- [ ] Counter uses design tokens
- [ ] maxLength enforced (500 or existing value)

---

## Item 186: Injury Form Recovery Date (Duplicate of Item 14)

**Status**: Covered by Sprint 1 Item 14. No additional work.

---

## Item 302: 20+ Text Fields No maxLength

**Files**: Multiple across codebase

**Problem**: Systematic gap. Many TextInput components have no maxLength, risking database truncation and layout overflow.

**Prompt**:
```
Audit and add maxLength to all TextInput components without it.

Scope: Search codebase for TextInput without maxLength prop.

Recommended limits by field type:
- Name fields: 50
- Short descriptions: 100
- Notes/comments: 500
- Long-form text: 1000
- Email: 100
- Phone: 20
- Postcode: 10
- Address line: 100

Implementation plan:
1. Run Grep to find all TextInput components:
   grep -r "TextInput" --include="*.tsx" app/ components/
2. For each file, check if maxLength is present
3. Add maxLength based on field semantic meaning
4. Add character counter for long-form fields (>100 chars)
5. Test each updated field

Files likely needing updates (examples):
- components/coach/coach-detail-about.tsx (bio field)
- components/club/create-club-form.tsx (description)
- components/athlete/athlete-notes-tab.tsx (covered in Item 101)
- components/profile/edit-profile-sections.tsx (bio, tagline)
- components/family/add-child-basic-step-sections.tsx (name, notes)
- app/club/create.tsx (covered in Item 288 for validation)

For EACH file:
- Add maxLength prop with appropriate limit
- Add character counter for fields > 100 char limit
- Test copy/paste of oversized text (should truncate)
- Test typing at limit (should block)

This is a LARGE task. Recommend:
- Sprint 2: Priority fields (coach bio, club description, child notes)
- Sprint 4: Remaining fields (low-risk)
```

**Acceptance Criteria**:
- [ ] All TextInput components audited
- [ ] maxLength added to 20+ fields
- [ ] Character counters added to long-form fields
- [ ] Limits appropriate for field semantics
- [ ] No database truncation possible
- [ ] Copy/paste truncates gracefully

---

## Item 307: Phone/Email Fields Accept Emoji

**Files**:
- `components/child/emergency-contact-form.tsx` ~line 84
- `components/family/sharing-invite-modal.tsx` (email - covered in Item 94)

**Problem**: Phone and email inputs don't sanitize emoji and special characters. Can save "07700 😊 900123" as phone number, breaking SMS/calling functionality.

**Prompt**:
```
Add input sanitization to phone and email fields.

File 1: /Users/tubton/Desktop/coachapplication/clubroom/components/child/emergency-contact-form.tsx
Lines: ~84 (phone TextInput)

Implementation for phone:
- Sanitize to digits, spaces, +, (, ), - only: /^[0-9\s+()-]*$/
- In onChangeText:
  ```typescript
  const sanitized = value.replace(/[^0-9\s+()-]/g, '');
  setPhone(sanitized);
  ```
- Add maxLength={20} (UK: +44 7700 900123 = 17 chars with spaces)
- Show helper text: "UK mobile: 07700 900123"

Implementation for email:
- See Item 94 (already covered for sharing-invite-modal)
- For emergency contact email, same sanitization:
  ```typescript
  const sanitized = value.toLowerCase().trim();
  setEmail(sanitized);
  ```
- No emoji possible in email with proper validation regex

Test cases (phone):
- Enter "07700😊900123" (emoji stripped → "07700900123")
- Enter "07700 900 123" (valid, spaces allowed)
- Enter "+44 7700 900123" (valid, + allowed)
- Paste phone with emoji (sanitized)

Test cases (email):
- Covered by Item 94
```

**Acceptance Criteria**:
- [ ] Phone input sanitizes to digits, spaces, +, (, ), - only
- [ ] Email input covered by Item 94 validation
- [ ] maxLength={20} on phone fields
- [ ] Emoji and special characters stripped on input
- [ ] Helper text showing UK format example
- [ ] Copy/paste of invalid characters sanitized

---

## Sprint 2 Summary

**Total Items**: 17 items (excluding duplicates)
**Effort**: 10 engineer-days
**Risk**: Low (UI-only changes, no business logic impact)

**Success Criteria**:
- [ ] All text inputs have maxLength appropriate to field purpose
- [ ] Character counters shown for long-form fields (>100 char limit)
- [ ] Whitespace validation prevents empty submissions
- [ ] Input sanitization prevents emoji/special chars in structured fields
- [ ] No UI layout breakage from oversized text
- [ ] No database truncation possible

**Testing Strategy**:
1. Automated: Add maxLength tests to component test files
2. Manual: QA checklist per input type (name, email, phone, long-form)
3. Edge cases: Copy/paste oversized text, emoji input, whitespace-only

**Deployment**:
- Can deploy by component (e.g., all session-type-modal fixes together)
- Low risk: maxLength is additive, doesn't break existing valid data
- Monitor: Check AsyncStorage for truncated data post-deploy (shouldn't happen)

**Dependencies**:
- Builds on Sprint 1 validation fixes
- Some items reference Sprint 1 implementations (e.g., Item 94 uses Item 191 pattern)

**Follow-up Work**:
- Sprint 3: Modal interaction bugs (keyboard dismiss, unsaved changes)
- Sprint 4: Remaining low-priority fields without maxLength (Item 302 continued)
