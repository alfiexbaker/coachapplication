# Forms & Modals Sprint 4: UX Polish

**Goal**: Improve form defaults, helper text, accessibility, and remaining low-priority UX issues that don't cause data corruption but create friction and confusion.

**Priority**: P2 — Post-launch polish
**Effort**: 6 engineer-days
**Dependencies**: Sprints 1, 2, 3

---

## Item 17: Session Notes Zero Focus Areas Accepted

**File**: `components/session/session-notes-form.tsx`

**Problem**: Focus areas are multi-select chips. Form accepts submission with zero focus areas selected. Session feedback with no focus areas breaks parent progress view (shows "No focus areas" which looks incomplete).

**Prompt**:
```
Require at least one focus area in session notes form.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/session-notes-form.tsx
Lines: ~100-130 (focus areas section + submit)

Current behavior:
- Focus areas chips are optional
- Can submit with zero selected
- Parent sees "No focus areas recorded"

Requirements:
1. Require at least 1 focus area selected
2. Show inline error when zero selected
3. Disable submit when zero selected
4. Show helper text: "Select 1-3 focus areas for this session"
5. Highlight section when validation fails

Implementation:
- Add validation:
  ```typescript
  const focusAreaError = focusAreas.length === 0 ? 'Select at least one focus area' : null;
  ```
- Show error text below focus area chips when focusAreaError present
- Disable submit: disabled={focusAreas.length === 0 || ...}
- Add helper text above chips (colors.muted + Typography.caption)
- Visual feedback: border color changes when error:
  ```typescript
  <View style={[
    styles.focusAreasContainer,
    {
      borderColor: focusAreaError ? colors.error : colors.border,
      borderWidth: 1,
      borderRadius: Radii.md,
      padding: Spacing.sm
    }
  ]}>
    {/* chips */}
  </View>
  ```

Recommended: Limit to 3 focus areas (prevents "selected all" behavior)
```typescript
const handleFocusAreaToggle = (area: string) => {
  if (focusAreas.includes(area)) {
    setFocusAreas(focusAreas.filter(a => a !== area));
  } else if (focusAreas.length < 3) {
    setFocusAreas([...focusAreas, area]);
  } else {
    // Optional: show toast "Maximum 3 focus areas"
  }
};
```

Test cases:
- Submit with zero focus areas (error shown, submit disabled)
- Select 1 focus area (error clears, submit enabled)
- Select 3 focus areas (valid)
- Attempt to select 4th (blocked or toast shown)
```

**Acceptance Criteria**:
- [ ] At least 1 focus area required
- [ ] Maximum 3 focus areas enforced
- [ ] Inline error shown when zero selected
- [ ] Submit disabled when validation fails
- [ ] Helper text explaining requirement
- [ ] Visual feedback (border color) when error
- [ ] Error clears when focus area selected

---

## Item 31: Cancel Reason Validation Coaches Only

**File**: `components/booking/cancel-reason-picker.tsx` ~lines 77-83

**Problem**: Cancellation reason validation logic assumes coach is cancelling. Parent cancellations show wrong validation errors ("Provide notice to athlete" when parent IS the athlete's rep).

**Prompt**:
```
Fix cancel reason validation to differentiate coach vs parent cancellation.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/booking/cancel-reason-picker.tsx
Lines: ~77-83 (validation logic)

Current behavior:
- Validation assumes coach perspective
- Parent sees "Provide advance notice to athlete" (confusing)
- Reason options are same for coach/parent (should differ)

Requirements:
1. Accept userRole prop: 'coach' | 'parent'
2. Show different reason options based on role
3. Adjust validation messages for role
4. Adjust helper text for role

Reason options by role:
Coach reasons:
- "Emergency"
- "Illness"
- "Double booking"
- "Weather conditions"
- "Personal commitment"
- "Other"

Parent reasons:
- "Schedule conflict"
- "Child is unwell"
- "Family commitment"
- "No longer needed"
- "Other"

Implementation:
- Add prop: userRole: 'coach' | 'parent'
- Conditional reason list:
  ```typescript
  const reasons = userRole === 'coach'
    ? ['Emergency', 'Illness', 'Double booking', 'Weather conditions', 'Personal commitment', 'Other']
    : ['Schedule conflict', 'Child is unwell', 'Family commitment', 'No longer needed', 'Other'];
  ```
- Conditional helper text:
  ```typescript
  const helperText = userRole === 'coach'
    ? 'Frequent cancellations affect your reliability rating'
    : 'Cancellation fees may apply based on timing';
  ```
- Validation messages:
  ```typescript
  const getValidationMessage = () => {
    if (!reason) {
      return 'Please select a reason';
    }
    if (reason === 'Other' && !notes.trim()) {
      return userRole === 'coach'
        ? 'Provide details for athlete/parent'
        : 'Provide details for coach';
    }
    return null;
  };
  ```

Test cases:
- Coach cancellation: shows coach reasons and helper text
- Parent cancellation: shows parent reasons and helper text
- Select "Other" as coach: validation message for athlete/parent
- Select "Other" as parent: validation message for coach
```

**Acceptance Criteria**:
- [ ] Different reason lists for coach vs parent
- [ ] Helper text appropriate for user role
- [ ] Validation messages reference correct recipient
- [ ] userRole prop required
- [ ] Both roles tested and working

---

## Item 35: Session Notes Effort Defaults to 4

**File**: `components/session/session-notes-form.tsx`

**Problem**: Effort rating defaults to 4/5. This biases coach ratings upward and makes 4 meaningless (not a true rating if it's the default). Should default to null (unrated).

**Prompt**:
```
Change session notes effort rating default from 4 to null (unrated).

File: /Users/tubton/Desktop/coachapplication/clubroom/components/session/session-notes-form.tsx
Lines: ~60-80 (effort rating)

Current behavior:
- const [effort, setEffort] = useState(4)
- Rating bar shows 4 stars on load
- Looks pre-rated, user may not change it
- Inflates effort ratings

Requirements:
1. Default to null (unrated)
2. Show placeholder state: empty stars + helper text "Tap to rate effort (1-5)"
3. Require effort rating before submit (min 1)
4. Show validation error if left unrated

Implementation:
- Change default: const [effort, setEffort] = useState<number | null>(null)
- RatingBar component must support null value (see Sprint 1 Item 248)
- Add validation:
  ```typescript
  const effortError = effort === null ? 'Rate athlete effort' : null;
  ```
- Show error text below rating bar when effortError present
- Disable submit: disabled={effort === null || ...}
- Helper text when unrated: "How hard did the athlete work today?"

Visual states:
- null: empty stars + helper text
- 1-5: filled stars, helper text hidden

Test cases:
- Load form (effort unrated, empty stars shown)
- Attempt submit without rating (error shown, submit disabled)
- Rate effort 3 (error clears, submit enabled)
- Rate effort 1 (valid, submit enabled)
```

**Acceptance Criteria**:
- [ ] Default effort value is null
- [ ] Empty stars shown when unrated
- [ ] Helper text shown when unrated
- [ ] Validation error if submit attempted without rating
- [ ] Submit disabled when effort null
- [ ] Rating 1-5 clears error and enables submit

---

## Item 61: Tag Input Silently Rejects Duplicates

**File**: `components/family/medical-special-needs-form-sections.tsx` ~lines 46-81

**Problem**: Medical tags input (allergies, conditions) silently rejects duplicate entries. User types "Asthma", presses add, types "asthma" again (different case), presses add, nothing happens. No feedback.

**Prompt**:
```
Add user feedback when duplicate tag entered.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/family/medical-special-needs-form-sections.tsx
Lines: ~46-81 (tag input)

Current behavior:
- Duplicate check: if (tags.includes(newTag)) return
- Silent rejection
- User confusion: "Why isn't it adding?"

Requirements:
1. Show toast when duplicate detected
2. Case-insensitive duplicate check
3. Clear input field on duplicate (visual feedback)
4. Toast message: "Already added"

Implementation:
- Update handleAddTag:
  ```typescript
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    // Case-insensitive duplicate check
    const isDuplicate = tags.some(tag => tag.toLowerCase() === trimmed.toLowerCase());

    if (isDuplicate) {
      showToast(`"${trimmed}" is already in the list`, 'default');
      setTagInput(''); // Clear input
      return;
    }

    setTags([...tags, trimmed]);
    setTagInput('');
  };
  ```
- Use info toast (not error, as it's not really an error)

Optional enhancement: Highlight existing tag briefly
```typescript
if (isDuplicate) {
  const existingTagIndex = tags.findIndex(tag => tag.toLowerCase() === trimmed.toLowerCase());
  // Flash animation on existing tag
  // ...then show toast
}
```

Test cases:
- Add "Asthma", then add "asthma" (toast shown, input cleared)
- Add "Asthma", then add "ASTHMA" (toast shown)
- Add "Peanuts", then add "Peanut" (allowed, different word)
- Add "Asthma", then add "Asthma " (space trimmed, duplicate detected)
```

**Acceptance Criteria**:
- [ ] Duplicate detection is case-insensitive
- [ ] Toast shown when duplicate detected
- [ ] Toast message includes tag name
- [ ] Input field cleared on duplicate
- [ ] Info toast style (not error)
- [ ] Trimming applied before duplicate check

---

## Item 163: Attachment Picker No File Size Limit

**File**: `components/messaging/attachment-picker.tsx` ~lines 98-105

**Problem**: No file size validation. Users can attach 50MB videos, causing upload failures and poor UX (loading forever, then error). Need size limit + validation.

**Prompt**:
```
Add file size validation to attachment picker.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/messaging/attachment-picker.tsx
Lines: ~98-105 (file selection handler)

Current behavior:
- No size check
- Large files accepted
- Upload fails or takes minutes
- No user warning

Requirements:
1. Max file size: 10MB per file (platform limit)
2. Check size before adding to attachments
3. Show error toast with helpful message
4. Format size in user-friendly way (MB)

Implementation:
- Add size check in handleFilePick:
  ```typescript
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  const handleFilePick = async (result: ImagePickerResult) => {
    if (result.canceled) return;  // expo-image-picker uses American spelling (one L)

    const file = result.assets[0];
    const fileSize = file.fileSize || 0;

    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
      showToast(`File is ${sizeMB}MB. Maximum size is 10MB. Try compressing the video or image.`, 'error');
      return;
    }

    addAttachment(file);
  };
  ```
- Helper function to format size:
  ```typescript
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };
  ```
- Show file size in attachment preview (existing feature or new)

Test cases:
- Select 5MB image (accepted)
- Select 15MB video (error toast with size)
- Select 10.1MB file (error toast)
- Error message includes helpful tip (compress)
```

**Acceptance Criteria**:
- [ ] Max file size 10MB enforced
- [ ] Error toast shown when file too large
- [ ] Toast message includes file size and limit
- [ ] Helpful tip in error message (compress)
- [ ] Size formatted in MB for readability
- [ ] File not added to attachments when oversized

---

## Item 164: Attachment Picker No Max Count

**File**: `components/messaging/attachment-picker.tsx`

**Problem**: No limit on number of attachments. Users can add 20+ photos, breaking message layout and causing performance issues.

**Prompt**:
```
Add maximum attachment count to attachment picker.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/messaging/attachment-picker.tsx
Lines: ~50-80 (attachment list + add button)

Current behavior:
- No limit on attachment count
- Can add 50+ files
- Breaks message layout, slow to send

Requirements:
1. Max attachments: 5 per message (platform standard)
2. Disable "Add" button when at limit
3. Show count indicator: "3/5"
4. Show helper text when at limit
5. Toast when attempting to add beyond limit

Implementation:
- Add MAX_ATTACHMENTS constant: const MAX_ATTACHMENTS = 5
- Disable add button:
  ```typescript
  disabled={attachments.length >= MAX_ATTACHMENTS}
  ```
- Show count indicator:
  ```typescript
  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
    {attachments.length}/{MAX_ATTACHMENTS} attachments
  </ThemedText>
  ```
- Helper text when at limit:
  ```typescript
  {attachments.length >= MAX_ATTACHMENTS && (
    <ThemedText style={[Typography.caption, { color: colors.warning }]}>
      Maximum attachments reached. Remove one to add more.
    </ThemedText>
  )}
  ```
- Toast if user taps disabled button:
  ```typescript
  const handleAddPress = () => {
    if (attachments.length >= MAX_ATTACHMENTS) {
      showToast(`Maximum ${MAX_ATTACHMENTS} attachments per message`, 'default');
      return;
    }
    openPicker();
  };
  ```

Test cases:
- Add 3 attachments (shows "3/5")
- Add 5 attachments (add button disabled, helper text shown)
- Tap add button when at 5 (toast shown)
- Remove 1 attachment (add button enabled, count updates)
```

**Acceptance Criteria**:
- [ ] Max 5 attachments enforced
- [ ] Add button disabled at limit
- [ ] Count indicator shows X/5
- [ ] Helper text when at limit
- [ ] Toast shown when tapping disabled add button
- [ ] Removing attachment re-enables add button

---

## Item 187: Body Part Selector No Search

**File**: `components/health/BodyPartSelector.tsx` ~lines 56-70

**Problem**: Body part list is 40+ items (shoulders, left/right knee, ankle, etc.). No search or filter. User scrolls through entire list to find "Left Achilles". Poor UX for quick injury logging.

**Prompt**:
```
Add search functionality to body part selector.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/health/BodyPartSelector.tsx
Lines: ~56-70 (body part list)

Current behavior:
- FlatList of 40+ body parts
- No search
- Must scroll to find part

Requirements:
1. Add search input at top
2. Filter body parts by search term
3. Highlight matching text (optional)
4. Show "No results" when no match
5. Clear search button

Implementation:
- Add search state: const [searchTerm, setSearchTerm] = useState('')
- Filter body parts:
  ```typescript
  const filteredParts = bodyParts.filter(part =>
    part.toLowerCase().includes(searchTerm.toLowerCase())
  );
  ```
- Search input UI:
  ```typescript
  <View style={{ padding: Spacing.sm, borderBottomWidth: 1, borderColor: colors.border }}>
    <TextInput
      value={searchTerm}
      onChangeText={setSearchTerm}
      placeholder="Search body parts..."
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      style={[/* input styles */]}
    />
    {searchTerm.length > 0 && (
      <Clickable onPress={() => setSearchTerm('')} style={styles.clearButton} accessibilityLabel="Clear search">
        <Ionicons name="close-circle" size={20} color={colors.muted} />
      </Clickable>
    )}
  </View>
  ```
- Update FlatList data: data={filteredParts}
- Empty state:
  ```typescript
  ListEmptyComponent={
    <ThemedText style={[Typography.body, { color: colors.muted, textAlign: 'center', padding: Spacing.lg }]}>
      No body parts match "{searchTerm}"
    </ThemedText>
  }
  ```

Optional: Group by region (Head, Upper Body, Lower Body, etc.) with section headers

Test cases:
- Search "knee" (shows Left Knee, Right Knee)
- Search "achilles" (shows Left Achilles, Right Achilles)
- Search "xyz" (shows "No results")
- Clear search (shows all parts)
- Search is case-insensitive
```

**Acceptance Criteria**:
- [ ] Search input at top of list
- [ ] Body parts filtered by search term
- [ ] Case-insensitive search
- [ ] Clear button shown when search active
- [ ] Empty state shown when no matches
- [ ] Search placeholder text helpful
- [ ] Performance: instant filtering (no lag)

---

## Item 188: Social Links No URL Validation

**File**: `components/profile/social-links-editor.tsx` ~lines 38-140

**Problem**: Social link inputs accept any text. No URL format validation. Coaches enter "instagram.com/myhandle" (missing https://), links don't work in profile.

**Prompt**:
```
Add URL validation and auto-formatting to social links editor.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/profile/social-links-editor.tsx
Lines: ~38-140 (social link inputs)

Current behavior:
- Accepts any text
- No validation
- Broken links in profile

Requirements:
1. Validate URL format
2. Auto-add https:// if missing
3. Validate domain matches platform (instagram.com for Instagram, etc.)
4. Show inline error for invalid URLs
5. Show helper text with example

Implementation:
- URL validation regex: /^https?:\/\/.+/
- Platform-specific validation:
  ```typescript
  const validateSocialLink = (platform: string, value: string): string | null => {
    if (!value.trim()) return null; // Optional field

    let url = value.trim();

    // Auto-add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    // Validate URL format
    const urlRegex = /^https?:\/\/.+\..+/;
    if (!urlRegex.test(url)) {
      return 'Enter a valid URL';
    }

    // Platform-specific validation
    const platformDomains = {
      instagram: 'instagram.com',
      twitter: 'twitter.com',
      facebook: 'facebook.com',
      youtube: 'youtube.com',
      linkedin: 'linkedin.com',
      tiktok: 'tiktok.com'
    };

    const expectedDomain = platformDomains[platform.toLowerCase()];
    if (expectedDomain && !url.includes(expectedDomain)) {
      return `Must be a ${platform} URL (${expectedDomain})`;
    }

    return null;
  };
  ```
- In onChangeText:
  ```typescript
  const handleLinkChange = (platform: string, value: string) => {
    setLinks({ ...links, [platform]: value });

    const error = validateSocialLink(platform, value);
    setErrors({ ...errors, [platform]: error });
  };
  ```
- Auto-format on blur:
  ```typescript
  const handleLinkBlur = (platform: string) => {
    let url = links[platform].trim();
    if (url && !url.startsWith('http')) {
      url = `https://${url}`;
      setLinks({ ...links, [platform]: url });
    }
  };
  ```
- Show error text below each input when error present
- Helper text: "e.g., https://instagram.com/yourhandle"

Test cases:
- Enter "instagram.com/user" (auto-formats to "https://instagram.com/user")
- Enter "https://facebook.com/user" for Instagram field (error: wrong platform)
- Enter "not a url" (error: invalid URL)
- Enter valid URL (no error)
- Leave field empty (no error, optional)
```

**Acceptance Criteria**:
- [ ] URL format validated
- [ ] Auto-add https:// if missing
- [ ] Platform-specific domain validation
- [ ] Inline error for invalid URLs
- [ ] Helper text with example per platform
- [ ] Auto-format on blur
- [ ] Empty fields allowed (optional)

---

## Item 189: Goal Form Category Wraps Poorly

**File**: `components/goals/GoalForm.tsx` ~lines 154-183

**Problem**: Goal category selector uses chips in a Row. Long category names ("Technical Skills Development") wrap awkwardly or overflow on small screens. Need better layout.

**Prompt**:
```
Fix goal category selector layout for small screens.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/goals/GoalForm.tsx
Lines: ~154-183 (category chips)

Current behavior:
- Chips in horizontal Row with flexWrap
- Long labels break to multiple lines within chip
- Poor layout on iPhone SE (small screen)

Requirements:
1. Use FlexWrap layout with proper spacing
2. Shorter category labels
3. Ensure chips fit on small screens (320px width)
4. Consistent chip sizing

Implementation:
- Shorten category labels:
  ```typescript
  const categories = [
    { id: 'technical', label: 'Technical' },  // was "Technical Skills"
    { id: 'tactical', label: 'Tactical' },
    { id: 'physical', label: 'Physical' },
    { id: 'mental', label: 'Mental' },
    { id: 'other', label: 'Other' }
  ];
  ```
- Use `Row` primitive with `flexWrap` (never raw `View` with `flexDirection: 'row'`):
  ```typescript
  <Row style={{
    flexWrap: 'wrap',
    gap: Spacing.xs,  // If gap supported, otherwise use margin on chips
    marginBottom: Spacing.sm
  }}>
    {categories.map(cat => (
      <Chip
        key={cat.id}
        label={cat.label}
        selected={category === cat.id}
        onPress={() => setCategory(cat.id)}
        style={{ marginRight: Spacing.xs, marginBottom: Spacing.xs }}  // Fallback if gap not supported
      />
    ))}
  </Row>
  ```
- Ensure Chip component has:
  - paddingHorizontal: Spacing.sm (consistent width)
  - No hardcoded width (let content determine width)
  - numberOfLines={1} on label text

Test cases:
- iPhone SE (320px width): all chips visible, no overflow
- iPad (large screen): chips fit comfortably
- Selecting each category (visual feedback works)
- Long labels don't break chip layout
```

**Acceptance Criteria**:
- [ ] Shorter category labels used
- [ ] FlexWrap layout with consistent spacing
- [ ] All chips fit on iPhone SE screen
- [ ] No text overflow within chips
- [ ] Spacing consistent between chips
- [ ] Layout works on all screen sizes

---

## Item 190: Price Range Slider Dead When Min=Max

**File**: `components/discover/PriceRangeSlider.tsx` ~lines 37-54

**Problem**: Price range slider uses two thumbs. If user drags min to equal max (e.g., both at £50), slider becomes unresponsive. Thumbs overlap, can't adjust either value.

**Prompt**:
```
Fix price range slider when min equals max.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/discover/PriceRangeSlider.tsx
Lines: ~37-54 (slider logic)

Current behavior:
- User drags min to £50
- User drags max to £50
- Thumbs overlap
- Can't drag either thumb (hit detection fails)

Requirements:
1. Prevent min from equaling max (maintain £5 gap minimum)
2. If user drags to overlap, snap to gap
3. Visual feedback: thumbs never fully overlap
4. Haptic feedback when hitting boundary

Implementation:
- Add MIN_GAP constant: const MIN_GAP = 5 (£5)
- Update min thumb handler (guard Haptics for non-web):
  ```typescript
  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, max - MIN_GAP);
    setMin(newMin);

    if (value >= max - MIN_GAP && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  ```
- Update max thumb handler (guard Haptics for non-web):
  ```typescript
  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, min + MIN_GAP);
    setMax(newMax);

    if (value <= min + MIN_GAP && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  ```
- Show gap indicator (optional):
  ```typescript
  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
    Minimum £{MIN_GAP} range
  </ThemedText>
  ```

Alternative: Allow min=max but fix hit detection
- Offset thumb positions slightly when overlapping
- Detect which thumb user intends to drag (gesture direction)

Recommend: Enforce gap (simpler, clearer UX)

Test cases:
- Drag min to £50, drag max to £50 (max snaps to £55)
- Drag max to £50, drag min to £50 (min snaps to £45)
- Haptic feedback fires when hitting boundary
- Slider remains usable in all states
```

**Acceptance Criteria**:
- [ ] Minimum £5 gap enforced between min and max
- [ ] Thumbs snap when user attempts to overlap
- [ ] Haptic feedback when hitting boundary
- [ ] Slider remains functional in all states
- [ ] Visual feedback: thumbs visibly separated
- [ ] Helper text explaining minimum range (optional)

---

## Item 193: Filter Bar No Count on Individual Chips

**File**: `components/discover/FilterBar.tsx` ~lines 77-111

**Problem**: Filter bar shows total results count but not count per filter chip. User doesn't know if "Under 12" filter will return 0 results before tapping.

**Prompt**:
```
Add result counts to individual filter chips.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/discover/FilterBar.tsx
Lines: ~77-111 (filter chips)

Current behavior:
- Chips show label only: "Under 12", "Certified", etc.
- No indication of result count per filter
- User taps, sees 0 results, backs out

Requirements:
1. Show count on each chip: "Under 12 (5)"
2. Update counts when other filters change
3. Disable/dim chips with 0 results
4. Show loading state while counting

Implementation:
- Calculate counts per filter:
  ```typescript
  const calculateFilterCounts = () => {
    const counts: Record<string, number> = {};

    filters.forEach(filter => {
      // Apply all OTHER filters, count results with THIS filter
      const filteredResults = applyFilters(allCoaches, {
        ...activeFilters,
        [filter.id]: filter.value
      });
      counts[filter.id] = filteredResults.length;
    });

    return counts;
  };

  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});
  const [isCountingFilters, setIsCountingFilters] = useState(false);

  useEffect(() => {
    const updateCounts = async () => {
      setIsCountingFilters(true);
      const counts = calculateFilterCounts();
      setFilterCounts(counts);
      setIsCountingFilters(false);
    };

    updateCounts();
  }, [activeFilters, allCoaches]);
  ```
- Update chip labels:
  ```typescript
  <Chip
    label={`${filter.label} (${filterCounts[filter.id] || 0})`}
    selected={activeFilters[filter.id]}
    onPress={() => handleFilterToggle(filter.id)}
    disabled={filterCounts[filter.id] === 0}
    style={{
      opacity: filterCounts[filter.id] === 0 ? 0.5 : 1
    }}
  />
  ```
- Loading state: show skeleton chips while isCountingFilters

Performance optimization:
- Debounce count calculation (don't recalculate on every keystroke in search)
- Cache counts for 30 seconds

Test cases:
- Load filter bar (counts calculated and shown)
- Select filter (counts update for remaining filters)
- Filter with 0 results (chip disabled and dimmed)
- Multiple filters active (counts reflect combined filters)
```

**Acceptance Criteria**:
- [ ] Each filter chip shows result count: "Label (X)"
- [ ] Counts update when filters change
- [ ] Chips with 0 results disabled and dimmed
- [ ] Loading state while calculating counts
- [ ] Counts accurate for all filter combinations
- [ ] Performance: counts calculated efficiently

---

## Item 217: Discover Postcode No UK Format Hint

**File**: `components/parent/discover-header.tsx` ~lines 42-52

**Problem**: Postcode input has no format hint. Users enter "SW1A1AA" (no space), "sw1a 1aa" (lowercase), or US zip codes. Need UK postcode validation and formatting.

**Prompt**:
```
Add UK postcode validation and auto-formatting to discover search.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/parent/discover-header.tsx
Lines: ~42-52 (postcode input)

Current behavior:
- Accepts any text
- No format guidance
- Inconsistent postcode format in database

Requirements:
1. Auto-format to UK standard: "SW1A 1AA" (space before last 3 chars)
2. Auto-uppercase input
3. Validate UK postcode format
4. Show placeholder with example: "e.g., SW1A 1AA"
5. Show inline error for invalid format

Implementation:
- UK postcode regex: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i
- Auto-format on change:
  ```typescript
  const formatPostcode = (input: string): string => {
    // Remove spaces, uppercase
    const cleaned = input.replace(/\s/g, '').toUpperCase();

    // Add space before last 3 characters
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
    }

    return cleaned;
  };

  const handlePostcodeChange = (value: string) => {
    const formatted = formatPostcode(value);
    setPostcode(formatted);

    // Validate if input seems complete (6+ chars)
    if (formatted.length >= 6) {
      const isValid = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(formatted);
      setPostcodeError(isValid ? null : 'Enter a valid UK postcode');
    } else {
      setPostcodeError(null);
    }
  };
  ```
- Input props:
  ```typescript
  <TextInput
    value={postcode}
    onChangeText={handlePostcodeChange}
    placeholder="e.g., SW1A 1AA"
    autoCapitalize="characters"
    autoCorrect={false}
    maxLength={8}  // "SW1A 1AA" = 8 chars
    style={[/* styles */]}
  />
  ```
- Show error text below input when postcodeError present
- Don't block search if invalid (allow partial postcode search)

Test cases:
- Enter "sw1a1aa" (formatted to "SW1A 1AA")
- Enter "SW1A 1AA" (already formatted, no change)
- Enter "12345" (error: invalid UK format)
- Enter "SW1" (partial, no error yet)
- Search with valid postcode (works)
- Search with invalid postcode (works, but shows validation warning)
```

**Acceptance Criteria**:
- [ ] Auto-uppercase input
- [ ] Auto-format with space before last 3 chars
- [ ] Validation for UK postcode format
- [ ] Inline error for invalid postcodes
- [ ] Placeholder shows example format
- [ ] maxLength={8} enforced
- [ ] Partial postcodes allowed (for search)

---

## Item 250: Chip State No Debounce (from Accessibility)

**File**: `components/primitives/chip.tsx` ~line 36

**Problem**: Chip toggles state on every press without debounce. Rapid taps cause multiple state changes and potential race conditions. Need debounce to prevent accidental double-taps.

**Prompt**:
```
Add debounce to chip onPress handler.

File: /Users/tubton/Desktop/coachapplication/clubroom/components/primitives/chip.tsx
Lines: ~36 (onPress handler)

Current behavior:
- onPress fires immediately on every tap
- Rapid taps → multiple state changes
- Race condition in async handlers

Requirements:
1. Debounce onPress with 300ms delay
2. Provide haptic feedback on valid press
3. Ignore taps during debounce period
4. Visual feedback: pressed state

Implementation:
- Use leading-edge debounce: fire immediately on first tap, ignore subsequent taps for 300ms.
  Do NOT use lodash — write a 3-line inline utility.
- Add ref-based debounce:
  ```typescript
  const lastPressRef = useRef(0);

  const handlePress = useCallback(() => {
    if (disabled) return;

    const now = Date.now();
    if (now - lastPressRef.current < 300) return; // Ignore taps within 300ms
    lastPressRef.current = now;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Fire immediately (leading edge)
    onPress?.();
  }, [onPress, disabled]);
  ```
- Update Clickable (use `Clickable` primitive, not `Pressable`):
  ```typescript
  <Clickable
    onPress={handlePress}
    disabled={disabled}
    accessibilityLabel={label}
    accessibilityRole="button"
    style={[
      styles.chip,
      selected && styles.chipSelected,
      disabled && styles.chipDisabled
    ]}
  >
  ```

**Note**: No lodash imports in this codebase. The ref-based approach is zero-dependency, leading-edge (fires immediately), and prevents rapid re-fires.

Test cases:
- Single tap (fires once, 300ms debounce)
- Rapid 5 taps in 1 second (fires once)
- Tap, wait 400ms, tap (fires twice)
- Haptic feedback on first tap only
```

**Acceptance Criteria**:
- [ ] onPress debounced with 300ms delay
- [ ] Rapid taps ignored during debounce
- [ ] Haptic feedback on valid press
- [ ] Visual feedback (pressed state) during debounce
- [ ] No race conditions from multiple rapid presses
- [ ] Disabled state checked before processing

---

## Sprint 4 Summary

**Total Items**: 14 items
**Effort**: 6 engineer-days
**Risk**: Low (UX improvements, no data corruption risk)

**Success Criteria**:
- [ ] All forms have helpful defaults and helper text
- [ ] User feedback for edge cases (duplicates, limits, validation)
- [ ] No silent failures or confusing behavior
- [ ] Accessibility improvements (debounce, helper text, examples)
- [ ] Mobile-optimized layouts (chip wrapping, small screens)
- [ ] UK-specific formatting (postcodes) correct

**Testing Strategy**:
1. Manual QA: Test each UX improvement on real devices
2. Small screens: Test on iPhone SE (320px width)
3. Edge cases: Max limits, duplicates, overlapping values
4. Accessibility: VoiceOver, helper text clarity

**Deployment**:
- Low risk: All UX polish, no breaking changes
- Can deploy incrementally
- Monitor: User feedback on new helper text (too verbose?)

**Dependencies**:
- Builds on Sprints 1-3 (validation, limits, modal interactions)
- Some items reference earlier fixes (e.g., Item 35 uses Item 248 pattern)

**Follow-up Work**:
- Gather user feedback on helper text verbosity
- Consider A/B testing some UX changes (e.g., required focus areas vs optional)
- Monitor analytics for form completion rates (improvements expected)
