# Safeguarding Sprint 2 — P1 Pre-Launch

**Priority**: P1 (High — must ship before public launch)
**Goal**: Secure roster data, enforce consent gates, add validation to critical flows, and fix verification bypass issues.

---

## S-03: Verification Not Enforced on Roster Access

```
TASK: Strip sensitive athlete data from roster when coach DBS expired

CONTEXT:
getRoster() returns full athlete data including medical conditions, emergency contacts, and SEN information without checking coach DBS verification status.

FILE: services/roster-service.ts
LINES: ~277-365

CURRENT CODE:
```typescript
async getRoster(coachId: string): Promise<Result<AthleteProfile[], ServiceError>> {
  const key = `${STORAGE_KEYS.ROSTER_PREFIX}${coachId}`;
  const roster = await apiClient.get<AthleteProfile[]>(key, []);
  return ok(roster);
}
```

REQUIRED CHANGES:

1. Add DBS verification check and data stripping:
```typescript
async getRoster(coachId: string): Promise<Result<AthleteProfile[], ServiceError>> {
  const key = `${STORAGE_KEYS.ROSTER_PREFIX}${coachId}`;
  const roster = await apiClient.get<AthleteProfile[]>(key, []);

  // Check coach DBS verification status
  const verificationResult = await verificationService.getVerificationStatus(coachId);
  const dbsValid = verificationResult.success &&
    verificationResult.data.dbs.status === 'verified' &&
    (!verificationResult.data.dbs.expiresAt ||
     new Date(verificationResult.data.dbs.expiresAt) > new Date());

  if (!dbsValid) {
    logger.warn('Roster accessed with expired DBS - stripping sensitive data', { coachId });

    // Strip sensitive fields when DBS invalid
    const sanitizedRoster: SanitizedAthleteProfile[] = roster.map(athlete => ({
      ...athlete,
      medicalConditions: undefined,
      allergies: undefined,
      emergencyContacts: undefined,
      specialEducationalNeeds: undefined,
      medications: undefined,
      dietaryRequirements: undefined,
      _sanitized: true as const,
    }));

    return ok(sanitizedRoster);
  }

  return ok(roster.map(athlete => ({ ...athlete, _sanitized: false as const })));
}
```

Return type uses a discriminated union so callers know whether data is stripped:
```typescript
async getRoster(coachId: string): Promise<Result<RosterResult[], ServiceError>>
```

2. Add type for sanitized athlete data with discriminated union:
```typescript
// In constants/user-types.ts or roster-types.ts
type SanitizedAthleteProfile = Omit<
  AthleteProfile,
  'medicalConditions' | 'allergies' | 'emergencyContacts' | 'specialEducationalNeeds' | 'medications' | 'dietaryRequirements'
> & { _sanitized: true };

type FullAthleteProfile = AthleteProfile & { _sanitized: false };

// Callers can check: if (athlete._sanitized) { /* data is stripped */ }
type RosterResult = SanitizedAthleteProfile | FullAthleteProfile;
```

3. Add UI warning when DBS expired:
```typescript
// In roster display components
const { colors } = useTheme();

{!dbsValid && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  }}>
    <ThemedText style={Typography.subheading} color="error">
      DBS Verification Expired
    </ThemedText>
    <ThemedText style={Typography.small} color="error">
      Sensitive athlete information hidden until verification renewed.
    </ThemedText>
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ getRoster checks DBS verification status
✅ Expired DBS strips medical, emergency, SEN fields
✅ Basic roster data (name, age, contact) still visible
✅ Warning logged when sensitive data stripped
✅ UI shows clear message when DBS expired
✅ Unit test: expired DBS returns sanitized data
✅ Unit test: valid DBS returns full data
```

---

## S-04: Credentials Submit Without File Upload

```
TASK: Disable credential submission until file uploaded

CONTEXT:
Credential verification form allows submit without file attachment, bypassing actual document verification.

FILE: app/verification/credentials.tsx
LINES: ~127-140

REQUIRED CHANGES:

1. Track upload state and disable submit:
```typescript
const [hasUploadedFile, setHasUploadedFile] = useState(false);
const [selectedFile, setSelectedFile] = useState<{ uri: string; type: string; name: string } | null>(null);

const handleFileSelect = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    copyToCacheDirectory: true,
  });

  if (result.type === 'success') {
    setSelectedFile({
      uri: result.uri,
      type: result.mimeType || 'application/octet-stream',
      name: result.name,
    });
    setHasUploadedFile(true);
  }
};

const handleSubmit = async () => {
  if (!hasUploadedFile || !selectedFile) {
    Alert.alert(
      'File Required',
      'Please upload a copy of your qualification certificate or license.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Continue with submission...
};
```

2. Update submit button UI:
```typescript
<Button
  title={hasUploadedFile ? 'Submit Credential' : 'Upload Required'}
  onPress={handleSubmit}
  disabled={!hasUploadedFile}
  variant="primary"
/>

{!hasUploadedFile && (
  <ThemedText
    style={[Typography.small, { textAlign: 'center', marginTop: Spacing.xs }]}
    color="secondary"
  >
    Upload a document to enable submission
  </ThemedText>
)}
```

3. Show file preview when uploaded:
```typescript
{selectedFile && (
  <Row style={{
    padding: Spacing.sm,
    backgroundColor: colors.successBackground,
    borderRadius: Radii.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  }}>
    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
    <Spacer width={Spacing.xs} />
    <Column style={{ flex: 1 }}>
      <ThemedText style={Typography.small}>
        {selectedFile.name}
      </ThemedText>
      <ThemedText style={Typography.caption} color="secondary">
        Ready to submit
      </ThemedText>
    </Column>
    <Clickable onPress={() => {
      setSelectedFile(null);
      setHasUploadedFile(false);
    }}>
      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
    </Clickable>
  </Row>
)}
```

4. Apply same pattern to all verification screens:
- app/verification/background.tsx
- app/verification/id.tsx
- app/verification/insurance.tsx

ACCEPTANCE CRITERIA:
✅ Submit button disabled until file uploaded
✅ Button shows "Upload Required" when no file
✅ Alert shown if user tries to submit without file
✅ File preview appears after successful upload
✅ User can remove uploaded file
✅ All verification screens updated consistently
✅ File type validation (PDF, JPEG, PNG only)
```

---

## S-06: Consent Service Optional CoachId

```
TASK: Make coachId required in consent service methods

CONTEXT:
Consent service methods accept optional coachId, allowing consent checks without verifying coach-athlete relationship.

FILE: services/consent-service.ts
LINES: ~79-102

CURRENT CODE:
```typescript
async hasConsent(
  athleteId: string,
  consentType: ConsentType,
  coachId?: string
): Promise<boolean> {
  const consents = await this.getConsents(athleteId);
  const consent = consents.find(c => c.type === consentType);

  if (!consent) return false;
  if (consent.status !== 'granted') return false;

  // Optional coach filter
  if (coachId && consent.grantedTo !== coachId) return false;

  return true;
}
```

REQUIRED CHANGES:

1. Make coachId required and verify relationship:
```typescript
async hasConsent(
  athleteId: string,
  consentType: ConsentType,
  coachId: string // Now required
): Promise<Result<boolean, ServiceError>> {

  // Verify coach-athlete relationship
  const hasRelationship = await this.verifyCoachAthleteRelationship(coachId, athleteId);
  if (!hasRelationship) {
    logger.warn('Consent check failed - no coach-athlete relationship', {
      coachId,
      athleteId,
      consentType,
    });
    return err({
      code: 'UNAUTHORIZED',
      message: 'Coach is not authorized to check consent for this athlete',
    });
  }

  const consents = await this.getConsents(athleteId);
  const consent = consents.find(c =>
    c.type === consentType &&
    c.grantedTo === coachId
  );

  if (!consent) return ok(false);
  if (consent.status !== 'granted') return ok(false);

  // Check expiry
  if (consent.expiryAt && new Date(consent.expiryAt) < new Date()) {
    logger.info('Consent expired', { athleteId, consentType, coachId });
    return ok(false);
  }

  return ok(true);
}

private async verifyCoachAthleteRelationship(
  coachId: string,
  athleteId: string
): Promise<boolean> {
  const rosterResult = await rosterService.getRoster(coachId);
  if (!rosterResult.success) return false;

  const isOnRoster = rosterResult.data.some(a => a.id === athleteId);
  return isOnRoster;
}
```

2. Update ALL call sites to handle Result type (breaking change). Enumerate call sites:
   - `components/consent/ConsentBadge.tsx`
   - `components/consent/ConsentCard.tsx`
   - `components/social/create-post-form.tsx`
   - `components/video/video-upload-sections.tsx`
   - `services/media-service.ts`
   - `hooks/use-safety-gate.ts` (if created)
   - Any other file calling `consentService.hasConsent()`

```typescript
// Before:
const hasConsent = await consentService.hasConsent(athleteId, 'PHOTO_VIDEO');

// After:
const consentResult = await consentService.hasConsent(athleteId, 'PHOTO_VIDEO', coachId);
if (!consentResult.success) {
  // Handle error
  return;
}
const hasConsent = consentResult.data;
```

3. Update grantConsent to verify relationship:
```typescript
async grantConsent(params: GrantConsentParams): Promise<Result<Consent, ServiceError>> {
  const { athleteId, coachId, consentType, grantedBy } = params;

  // Verify coach-athlete relationship
  const hasRelationship = await this.verifyCoachAthleteRelationship(coachId, athleteId);
  if (!hasRelationship) {
    return err({
      code: 'UNAUTHORIZED',
      message: 'Cannot grant consent - no active coaching relationship',
    });
  }

  // Continue with existing consent creation logic...
}
```

ACCEPTANCE CRITERIA:
✅ hasConsent requires coachId parameter
✅ Consent check verifies coach-athlete relationship
✅ Returns Result<boolean, ServiceError>
✅ Unauthorized checks return UNAUTHORIZED error
✅ All call sites updated to pass coachId
✅ All call sites handle Result type
✅ Unit test: consent check fails without relationship
✅ Unit test: consent check succeeds with relationship
```

---

## S-07: Any Parent Can View Any Child's Progress

```
TASK: Verify child ownership in parent development screens

CONTEXT:
useParentDevelopment hook loads progress for selectedChildId without verifying it belongs to current user's family.

FILE: hooks/use-parent-development.ts
LINES: ~381-402

REQUIRED CHANGES:

1. Add family membership verification:
```typescript
const loadChildProgress = useCallback(async () => {
  if (!selectedChildId || !currentUserId) return;

  setLoading(true);
  setError(null);

  try {
    // Verify child belongs to current user's family
    const familyResult = await familyService.getFamilyMembers(currentUserId);
    if (!familyResult.success) {
      setError('Unable to load family information');
      setLoading(false);
      return;
    }

    const isOwnChild = familyResult.data.some(member =>
      member.id === selectedChildId && member.relationship === 'child'
    );

    if (!isOwnChild) {
      logger.warn('Unauthorized child progress access attempt', {
        parentId: currentUserId,
        attemptedChildId: selectedChildId,
      });
      setError('You do not have permission to view this child\'s progress');
      setLoading(false);
      return;
    }

    // Load progress data
    const progressResult = await progressService.getChildProgress(selectedChildId);
    if (progressResult.success) {
      setProgressData(progressResult.data);
    } else {
      setError(progressResult.error.message);
    }
  } catch (caughtError: unknown) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
    logger.error('Error loading child progress', { message });
    setError('Unable to load progress data');
  } finally {
    setLoading(false);
  }
}, [selectedChildId, currentUserId]);
```

2. Add error state UI component:
```typescript
// In components/parent/development-screen.tsx
if (error) {
  return (
    <Center style={{ flex: 1, padding: Spacing.xl }}>
      <Ionicons name="lock-closed" size={48} color={colors.error} />
      <Spacer height={Spacing.md} />
      <ThemedText style={Typography.heading} color="error">
        Access Denied
      </ThemedText>
      <ThemedText
        style={[Typography.body, { textAlign: 'center', marginTop: Spacing.sm }]}
        color="secondary"
      >
        {error}
      </ThemedText>
      <Spacer height={Spacing.lg} />
      <Button
        title="Return to Dashboard"
        onPress={() => router.back()}
        variant="primary"
      />
    </Center>
  );
}
```

3. Add same verification to related hooks:
- hooks/use-athlete-progress.ts
- hooks/use-session-completion.ts
- Any hook that loads child-specific data

ACCEPTANCE CRITERIA:
✅ Family membership verified before loading progress
✅ Unauthorized access blocked with clear error
✅ Error logged with parent and child IDs
✅ User sees "Access Denied" UI
✅ Same verification added to all child data hooks
✅ Unit test: own child data loads successfully
✅ Unit test: other parent's child blocked
```

---

## S-10: Roster Not Filtered at Data Layer

```
TASK: Add roster cross-coach isolation unit test

CONTEXT:
Roster filtering happens in service but there's no test verifying coaches can't see each other's rosters.

FILE: services/roster-service.ts
LINES: ~277-330

REQUIRED CHANGES:

1. Create test file if it doesn't exist:
```bash
touch __tests__/services/roster-service.test.ts
```

2. Add cross-coach isolation test:
```typescript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { rosterService } from '@/services/roster-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('RosterService - Cross-Coach Isolation', () => {
  beforeEach(async () => {
    // Clear storage
    await apiClient.removeItem(`${STORAGE_KEYS.ROSTER_PREFIX}coach1`);
    await apiClient.removeItem(`${STORAGE_KEYS.ROSTER_PREFIX}coach2`);
  });

  it('should not return other coach\'s roster data', async () => {
    // Setup: Coach 1 has athlete A, Coach 2 has athlete B
    const coach1Roster = [{
      id: 'athlete-a',
      name: 'Athlete A',
      parentId: 'parent1',
      medicalConditions: ['asthma'],
      emergencyContacts: [{ name: 'Parent 1', phone: '07700900000' }],
    }];

    const coach2Roster = [{
      id: 'athlete-b',
      name: 'Athlete B',
      parentId: 'parent2',
      medicalConditions: ['diabetes'],
      emergencyContacts: [{ name: 'Parent 2', phone: '07700900001' }],
    }];

    await apiClient.set(`${STORAGE_KEYS.ROSTER_PREFIX}coach1`, coach1Roster);
    await apiClient.set(`${STORAGE_KEYS.ROSTER_PREFIX}coach2`, coach2Roster);

    // Test: Coach 1 gets only their roster
    const result1 = await rosterService.getRoster('coach1');
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.data.length, 1);
    assert.strictEqual(result1.data[0].id, 'athlete-a');

    // Test: Coach 2 gets only their roster
    const result2 = await rosterService.getRoster('coach2');
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.data.length, 1);
    assert.strictEqual(result2.data[0].id, 'athlete-b');

    // Test: Coach 1 cannot see Athlete B
    const coach1Athletes = result1.data.map(a => a.id);
    assert.strictEqual(coach1Athletes.includes('athlete-b'), false);
  });

  it('should warn if unfiltered data contains other coaches\' entries', async () => {
    // This tests for accidental data leakage
    const mixedRoster = [
      { id: 'athlete-a', name: 'Athlete A', coachId: 'coach1' },
      { id: 'athlete-b', name: 'Athlete B', coachId: 'coach2' }, // Wrong coach!
    ];

    await apiClient.set(`${STORAGE_KEYS.ROSTER_PREFIX}coach1`, mixedRoster);

    // Should filter out athlete-b and log warning
    const result = await rosterService.getRoster('coach1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.length, 1);
    assert.strictEqual(result.data[0].id, 'athlete-a');

    // Check logs for warning (implementation needed in service)
  });
});
```

3. Add warning log to getRoster if data contains other coaches' athletes:
```typescript
async getRoster(coachId: string): Promise<Result<AthleteProfile[], ServiceError>> {
  const key = `${STORAGE_KEYS.ROSTER_PREFIX}${coachId}`;
  const roster = await apiClient.get<AthleteProfile[]>(key, []);

  // Safeguarding check: warn if data contains athletes assigned to other coaches
  const incorrectlyFilteredAthletes = roster.filter(athlete =>
    athlete.coachId && athlete.coachId !== coachId
  );

  if (incorrectlyFilteredAthletes.length > 0) {
    logger.warn('Roster data contains athletes from other coaches - possible data leak', {
      coachId,
      incorrectAthletes: incorrectlyFilteredAthletes.map(a => ({
        athleteId: a.id,
        assignedCoachId: a.coachId,
      })),
    });
  }

  // Filter out any incorrectly assigned athletes as safeguard
  const filteredRoster = roster.filter(athlete =>
    !athlete.coachId || athlete.coachId === coachId
  );

  return ok(filteredRoster);
}
```

ACCEPTANCE CRITERIA:
✅ Test file created at __tests__/services/roster-service.test.ts
✅ Test verifies coach A cannot see coach B's roster
✅ Test verifies each coach sees only their athletes
✅ getRoster logs warning if data contains wrong coach's athletes
✅ Service filters out incorrectly assigned athletes as safeguard
✅ Tests pass: `npm test roster-service.test.ts`
```

---

## S-16: Medical Consent Toggle No Confirmation

```
TASK: Add confirmation dialog when toggling off EMERGENCY_TREATMENT consent

CONTEXT:
Medical consent toggle allows parents to disable emergency treatment permission without any warning about the implications.

FILE: components/child/medical-consent-toggle.tsx
LINES: ~26-59

REQUIRED CHANGES:

1. Add confirmation dialog for toggle-off:
```typescript
import { Alert } from 'react-native';

const handleToggle = async (newValue: boolean) => {
  // If toggling OFF, show confirmation
  if (!newValue && consentType === 'EMERGENCY_TREATMENT') {
    Alert.alert(
      'Remove Emergency Treatment Consent',
      'Are you sure you want to remove permission for emergency medical treatment?\n\nWithout this consent, coaches cannot authorize emergency medical care for your child during sessions. This may limit their ability to respond to urgent medical situations.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove Consent',
          style: 'destructive',
          onPress: () => performToggle(newValue),
        },
      ]
    );
    return;
  }

  // For toggle-on or other consent types, proceed directly
  performToggle(newValue);
};

const performToggle = async (newValue: boolean) => {
  setIsEnabled(newValue);

  try {
    if (newValue) {
      await consentService.grantConsent({
        athleteId,
        coachId,
        consentType,
        grantedBy: parentId,
      });
    } else {
      await consentService.revokeConsent({
        athleteId,
        coachId,
        consentType,
        revokedBy: parentId,
      });
    }

    onToggle?.(newValue);
  } catch (error) {
    logger.error('Failed to update consent', error);
    setIsEnabled(!newValue); // Revert on error
    Alert.alert('Error', 'Failed to update consent. Please try again.');
  }
};
```

2. Add visual warning for disabled emergency consent:
```typescript
{consentType === 'EMERGENCY_TREATMENT' && !isEnabled && (
  <Column style={{
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons name="alert-circle" size={16} color={colors.error} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.small} color="error">
        Emergency treatment permission not granted
      </ThemedText>
    </Row>
    <ThemedText style={[Typography.caption, { marginTop: Spacing.xxs }]} color="error">
      Coaches cannot authorize emergency medical care
    </ThemedText>
  </Column>
)}
```

3. Add similar confirmation for PHOTO_VIDEO when content exists:
```typescript
const handleToggle = async (newValue: boolean) => {
  // Check if removing photo/video consent when content already exists
  if (!newValue && consentType === 'PHOTO_VIDEO') {
    const hasContent = await checkForExistingContent(athleteId);
    if (hasContent) {
      Alert.alert(
        'Remove Photo/Video Consent',
        'This athlete already has photos or videos posted. Removing consent will hide existing content from public view.\n\nDo you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove Consent', style: 'destructive', onPress: () => performToggle(newValue) },
        ]
      );
      return;
    }
  }

  // Other consent types...
};
```

ACCEPTANCE CRITERIA:
✅ Toggling off EMERGENCY_TREATMENT shows confirmation dialog
✅ Dialog explains implications clearly
✅ "Cancel" button reverts toggle
✅ "Remove Consent" button proceeds with revocation
✅ Visual warning shown when emergency consent disabled
✅ PHOTO_VIDEO toggle checks for existing content
✅ Toggle reverts on API error
✅ Haptic feedback on toggle (iOS/Android only)
```

---

## S-20: Consent Gating Not Enforced

```
TASK: Enforce consent checks in post creation flow

CONTEXT:
ConsentBadge displays consent status but hasContentPostingConsent() is never called to actually gate content creation.

FILE: components/social/create-post-form.tsx

REQUIRED CHANGES:

1. Add consent check before allowing media selection:
```typescript
import { consentService } from '@/services/consent-service';

const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
const [consentWarnings, setConsentWarnings] = useState<Record<string, string>>({});

const handleMediaSelect = async () => {
  // Check consent for all selected athletes
  if (selectedAthletes.length > 0) {
    const warnings: Record<string, string> = {};

    for (const athleteId of selectedAthletes) {
      const consentResult = await consentService.hasConsent(
        athleteId,
        'PHOTO_VIDEO',
        currentUserId
      );

      if (!consentResult.success || !consentResult.data) {
        const athlete = await userService.getUser(athleteId);
        warnings[athleteId] = athlete.success ? athlete.data.name : 'Athlete';
      }
    }

    setConsentWarnings(warnings);

    if (Object.keys(warnings).length > 0) {
      const athleteNames = Object.values(warnings).join(', ');
      Alert.alert(
        'Missing Photo/Video Consent',
        `You don't have photo/video consent for: ${athleteNames}\n\nYou cannot post photos or videos featuring these athletes. Please remove them from the post or request consent from their parents.`,
        [{ text: 'OK' }]
      );
      return;
    }
  }

  // Proceed with media selection
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    setMediaAttachments(result.assets);
  }
};
```

2. Block post submission when consent missing:
```typescript
const handleSubmit = async () => {
  // Validate consent before submission
  if (mediaAttachments.length > 0 && selectedAthletes.length > 0) {
    const consentChecks = await Promise.all(
      selectedAthletes.map(athleteId =>
        consentService.hasConsent(athleteId, 'PHOTO_VIDEO', currentUserId)
      )
    );

    const allHaveConsent = consentChecks.every(result => result.success && result.data);

    if (!allHaveConsent) {
      Alert.alert(
        'Cannot Post',
        'Photo/video consent is required for all tagged athletes. Please remove media or athletes without consent.',
        [{ text: 'OK' }]
      );
      return;
    }
  }

  // Submit post
  const postResult = await socialFeedService.createPost({
    authorId: currentUserId,
    content,
    mediaAttachments,
    taggedAthletes: selectedAthletes,
    createdAt: new Date().toISOString(),
  });

  if (postResult.success) {
    router.back();
  }
};
```

3. Show consent status in athlete selector:
```typescript
// In athlete selection UI
{athletes.map(athlete => {
  const hasWarning = consentWarnings[athlete.id];

  return (
    <Clickable
      key={athlete.id}
      onPress={() => toggleAthleteSelection(athlete.id)}
    >
      <Row style={{
        padding: Spacing.sm,
        backgroundColor: hasWarning ? colors.errorBackground : colors.surface,
        borderRadius: Radii.sm,
      }}>
        <Avatar uri={athlete.profileImage} size={32} />
        <Spacer width={Spacing.sm} />
        <Column style={{ flex: 1 }}>
          <ThemedText style={Typography.body}>
            {athlete.name}
          </ThemedText>
          {hasWarning && (
            <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
              <Ionicons name="alert-circle" size={12} color={colors.error} />
              <Spacer width={Spacing.xxs} />
              <ThemedText style={Typography.caption} color="error">
                No photo/video consent
              </ThemedText>
            </Row>
          )}
        </Column>
        {selectedAthletes.includes(athlete.id) && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </Row>
    </Clickable>
  );
})}
```

ACCEPTANCE CRITERIA:
✅ Media selection blocked when athletes lack consent
✅ Post submission blocked when consent missing
✅ Alert shows athlete names without consent
✅ Athlete selector shows consent status
✅ Athletes without consent visually highlighted
✅ Consent checked at both selection and submission
✅ Unit test: post blocked when consent missing
✅ Unit test: post succeeds when consent granted
```

---

## S-21: Media Service Saves Without Consent Check

```
TASK: Add consent verification to media save operations

CONTEXT:
saveMedia() stores photos/videos without checking PHOTO_VIDEO consent from athlete's parent.

FILE: services/media-service.ts
LINES: ~26-57

REQUIRED CHANGES:

1. Add consent check before saving media:
```typescript
async saveMedia(params: SaveMediaParams): Promise<Result<MediaItem, ServiceError>> {
  const { coachId, athleteId, uri, type, caption, sessionId } = params;

  // SAFEGUARDING: Check photo/video consent
  if (athleteId) {
    const consentResult = await consentService.hasConsent(
      athleteId,
      'PHOTO_VIDEO',
      coachId
    );

    if (!consentResult.success) {
      logger.error('Failed to check media consent', consentResult.error);
      return err({
        code: 'UNKNOWN',
        message: 'Unable to verify photo/video consent',
      });
    }

    if (!consentResult.data) {
      logger.warn('Media upload blocked - no photo/video consent', {
        coachId,
        athleteId,
        sessionId,
      });
      return err({
        code: 'UNAUTHORIZED',
        message: 'Photo/video consent required from athlete\'s parent before uploading media',
      });
    }
  }

  // Create media item
  const mediaItem: MediaItem = {
    id: generateId(),
    coachId,
    athleteId,
    uri,
    type,
    caption,
    sessionId,
    uploadedAt: new Date().toISOString(),
    isVisible: true,
  };

  // Save to storage
  const key = `${STORAGE_KEYS.MEDIA_PREFIX}${mediaItem.id}`;
  await apiClient.set(key, mediaItem);

  // Emit event
  emitTyped('MEDIA_UPLOADED', {
    mediaId: mediaItem.id,
    athleteId: athleteId || '',
    coachId,
    type,
  });

  logger.info('Media saved with consent verification', {
    mediaId: mediaItem.id,
    athleteId,
  });

  return ok(mediaItem);
}
```

2. Add batch consent check for multiple media:
```typescript
async saveMediaBatch(params: SaveMediaParams[]): Promise<Result<MediaItem[], ServiceError>> {
  // Pre-check consent for all athletes
  const uniqueAthletes = [...new Set(params.map(p => p.athleteId).filter(Boolean))];
  const consentChecks = await Promise.all(
    uniqueAthletes.map(async athleteId => {
      const result = await consentService.hasConsent(
        athleteId!,
        'PHOTO_VIDEO',
        params[0].coachId
      );
      return { athleteId, hasConsent: result.success && result.data };
    })
  );

  const athletesWithoutConsent = consentChecks
    .filter(check => !check.hasConsent)
    .map(check => check.athleteId);

  if (athletesWithoutConsent.length > 0) {
    return err({
      code: 'UNAUTHORIZED',
      message: `Photo/video consent required for ${athletesWithoutConsent.length} athlete(s)`,
      details: { athletesWithoutConsent },
    });
  }

  // Save all media items
  const results = await Promise.all(
    params.map(p => this.saveMedia(p))
  );

  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    return err(errors[0].error);
  }

  return ok(results.filter(r => r.success).map(r => r.data));
}
```

3. Update upload screens to show consent status:

**IMPORTANT**: Do NOT use `useState` inside `.map()` — this violates Rules of Hooks.
Pre-compute consent status in a `useEffect` with `Promise.all`, store in a `Map`.

```typescript
// In components/video/video-upload-sections.tsx
// Pre-compute consent status for all athletes (NOT inside .map())
const [consentMap, setConsentMap] = useState<Map<string, boolean>>(new Map());

useEffect(() => {
  if (selectedAthletes.length === 0) return;

  const checkAllConsents = async () => {
    const entries = await Promise.all(
      selectedAthletes.map(async (athleteId) => {
        const result = await consentService.hasConsent(athleteId, 'PHOTO_VIDEO', coachId);
        return [athleteId, result.success && result.data] as const;
      })
    );
    setConsentMap(new Map(entries));
  };

  checkAllConsents();
}, [selectedAthletes, coachId]);

// Now render using the pre-computed map (no hooks inside .map())
{selectedAthletes.map(athleteId => {
  const hasConsent = consentMap.get(athleteId) ?? null;

  return (
    <Row key={athleteId} style={{ alignItems: 'center' }}>
      <Avatar athleteId={athleteId} size={32} />
      <Spacer width={Spacing.sm} />
      <ThemedText style={Typography.body}>{athleteName}</ThemedText>
      {hasConsent === false && (
        <>
          <Spacer width={Spacing.xs} />
          <Badge text="No Consent" variant="error" />
        </>
      )}
    </Row>
  );
})}
```

ACCEPTANCE CRITERIA:
✅ saveMedia checks PHOTO_VIDEO consent before saving
✅ Returns UNAUTHORIZED error when consent missing
✅ saveMediaBatch checks all athletes before batch save
✅ Upload screens show consent status per athlete
✅ Error includes helpful message about requesting consent
✅ Event emitted on successful upload
✅ Unit test: media blocked without consent
✅ Unit test: media saved with consent
```

---

## S-31: Safety Checklist Doesn't Block Session Start

```
TASK: Integrate SafetyChecklist as mandatory gate before session start

CONTEXT:
SafetyChecklist component exists but isn't integrated into session start flow. Emergency contacts and medical consent should be verified before allowing coach to begin session.

FILE: components/safety/SafetyChecklist.tsx (lines ~27-169)
FILES TO MODIFY: Session start screens, session-completion hooks

REQUIRED CHANGES:

1. Create safety gate hook:
```typescript
// hooks/use-safety-gate.ts
import { useState, useEffect } from 'react';
import { safetyService } from '@/services/safety-service';
import { consentService } from '@/services/consent-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SafetyGate');

/** Medical review must be repeated every 24 hours */
const MEDICAL_REVIEW_EXPIRY_MS = 86_400_000; // 24 * 60 * 60 * 1000

export interface SafetyCheckResult {
  passed: boolean;
  checks: {
    emergencyContact: boolean;
    medicalConsent: boolean;
    allergiesReviewed: boolean;
    medicalConditionsReviewed: boolean;
  };
  blockers: string[];
}

export function useSafetyGate(athleteId: string, coachId: string) {
  const [result, setResult] = useState<SafetyCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSafety();
  }, [athleteId, coachId]);

  const checkSafety = async () => {
    setLoading(true);

    const checks = {
      emergencyContact: false,
      medicalConsent: false,
      allergiesReviewed: false,
      medicalConditionsReviewed: false,
    };
    const blockers: string[] = [];

    // Check emergency contact exists
    const emergencyResult = await safetyService.getEmergencyInfo(athleteId, coachId, 'coach');
    if (emergencyResult.success && emergencyResult.data.contacts.length > 0) {
      checks.emergencyContact = true;
    } else {
      blockers.push('Emergency contact information missing');
    }

    // Check medical consent granted
    const consentResult = await consentService.hasConsent(athleteId, 'EMERGENCY_TREATMENT', coachId);
    if (consentResult.success && consentResult.data) {
      checks.medicalConsent = true;
    } else {
      blockers.push('Emergency treatment consent not granted');
    }

    // Check medical info reviewed (from session prep)
    const sessionPrepKey = `session_prep_${coachId}_${athleteId}`;
    const sessionPrep = await apiClient.get<{ reviewedAt?: string }>(sessionPrepKey, {});
    const reviewedRecently = sessionPrep.reviewedAt &&
      new Date(sessionPrep.reviewedAt) > new Date(Date.now() - MEDICAL_REVIEW_EXPIRY_MS);

    if (reviewedRecently) {
      checks.allergiesReviewed = true;
      checks.medicalConditionsReviewed = true;
    } else {
      blockers.push('Medical information not reviewed in last 24 hours');
    }

    const passed = blockers.length === 0;

    setResult({ passed, checks, blockers });
    setLoading(false);

    logger.info('Safety gate check completed', {
      athleteId,
      coachId,
      passed,
      blockerCount: blockers.length,
    });
  };

  return { result, loading, recheckSafety: checkSafety };
}
```

2. Integrate gate into session start:
```typescript
// In session start screen or modal
import { useSafetyGate } from '@/hooks/use-safety-gate';

const SessionStartGate = ({ sessionId, athleteId, coachId, onProceed }) => {
  const { result, loading, recheckSafety } = useSafetyGate(athleteId, coachId);
  const { colors } = useTheme();

  if (loading) {
    return <LoadingState message="Checking safety requirements..." />;
  }

  if (!result?.passed) {
    return (
      <Column style={{ padding: Spacing.lg }}>
        <Row style={{ alignItems: 'center', marginBottom: Spacing.md }}>
          <Ionicons name="shield-checkmark" size={32} color={colors.error} />
          <Spacer width={Spacing.sm} />
          <ThemedText style={Typography.heading}>
            Safety Check Required
          </ThemedText>
        </Row>

        <ThemedText style={Typography.body} color="secondary">
          Please complete the following before starting this session:
        </ThemedText>

        <Spacer height={Spacing.md} />

        {result?.blockers.map((blocker, index) => (
          <Row key={index} style={{
            alignItems: 'center',
            marginBottom: Spacing.sm,
            padding: Spacing.sm,
            backgroundColor: colors.errorBackground,
            borderRadius: Radii.sm,
          }}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Spacer width={Spacing.xs} />
            <ThemedText style={Typography.body} color="error">
              {blocker}
            </ThemedText>
          </Row>
        ))}

        <Spacer height={Spacing.lg} />

        <Button
          title="Review Safety Information"
          onPress={() => router.push(`/safety/${athleteId}`)}
          variant="primary"
        />

        <Spacer height={Spacing.sm} />

        <Button
          title="Check Again"
          onPress={recheckSafety}
          variant="secondary"
        />
      </Column>
    );
  }

  // Safety checks passed
  return (
    <Column style={{ padding: Spacing.lg }}>
      <Row style={{ alignItems: 'center', marginBottom: Spacing.md }}>
        <Ionicons name="shield-checkmark" size={32} color={colors.success} />
        <Spacer width={Spacing.sm} />
        <ThemedText style={Typography.heading}>
          Safety Checks Passed
        </ThemedText>
      </Row>

      <SafetyChecklist
        athleteId={athleteId}
        sessionId={sessionId}
        onComplete={() => onProceed()}
      />
    </Column>
  );
};
```

3. Block session start in service:
```typescript
// In services/session-service.ts or booking-service.ts
async startSession(sessionId: string, coachId: string): Promise<Result<Session, ServiceError>> {
  const session = await this.getSession(sessionId);
  if (!session.success) return err(session.error);

  // Safety gate check
  const safetyResult = await this.checkSafetyGate(session.data.athleteId, coachId);
  if (!safetyResult.passed) {
    return err({
      code: 'VALIDATION',
      message: 'Safety requirements not met. Please complete safety checklist.',
      details: { blockers: safetyResult.blockers },
    });
  }

  // Proceed with session start...
}
```

ACCEPTANCE CRITERIA:
✅ useSafetyGate hook checks emergency contact + consent
✅ Session start blocked when checks fail
✅ Clear UI shows which checks failed
✅ "Review Safety Information" button navigates to safety screen
✅ "Check Again" button re-runs verification
✅ Session start proceeds when all checks pass
✅ SafetyChecklist integrated after gate passes
✅ Medical info review expires after 24 hours
```

---

## S-35: Bulk Invites to Non-Rostered Athletes

```
TASK: Verify coach-athlete relationship before bulk invite

CONTEXT:
sendBulkInvites() allows sending invites to any athlete IDs without verifying they're on the coach's roster.

FILE: services/invite/bulk-invite-service.ts
LINES: ~242-330

REQUIRED CHANGES:

1. Add roster verification to sendBulkInvites:
```typescript
async sendBulkInvites(params: BulkInviteParams): Promise<Result<BulkInviteResult, ServiceError>> {
  const { coachId, athleteIds, inviteType, sessionId, eventId } = params;

  // Verify all athletes are on coach's roster
  const rosterResult = await rosterService.getRoster(coachId);
  if (!rosterResult.success) {
    return err({
      code: 'UNKNOWN',
      message: 'Unable to verify roster',
    });
  }

  const rosterAthleteIds = new Set(rosterResult.data.map(a => a.id));
  const unauthorizedAthletes = athleteIds.filter(id => !rosterAthleteIds.has(id));

  if (unauthorizedAthletes.length > 0) {
    logger.warn('Bulk invite blocked - athletes not on roster', {
      coachId,
      unauthorizedAthletes,
      attemptedCount: athleteIds.length,
    });

    return err({
      code: 'UNAUTHORIZED',
      message: `Cannot invite ${unauthorizedAthletes.length} athlete(s) - not on your roster`,
      details: { unauthorizedAthletes },
    });
  }

  // Proceed with bulk invite
  const results = await Promise.all(
    athleteIds.map(athleteId =>
      inviteService.sendInvite({
        coachId,
        athleteId,
        inviteType,
        sessionId,
        eventId,
      })
    )
  );

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  logger.info('Bulk invite completed', {
    coachId,
    total: athleteIds.length,
    successful,
    failed,
  });

  return ok({
    total: athleteIds.length,
    successful,
    failed,
    results,
  });
}
```

2. Add similar check to squad invites:
```typescript
// In services/squad-service.ts
async addMembersToSquad(squadId: string, coachId: string, athleteIds: string[]): Promise<Result<Squad, ServiceError>> {
  // Verify all athletes are on roster
  const rosterResult = await rosterService.getRoster(coachId);
  if (!rosterResult.success) {
    return err({ code: 'UNKNOWN', message: 'Unable to verify roster' });
  }

  const rosterAthleteIds = new Set(rosterResult.data.map(a => a.id));
  const unauthorizedAthletes = athleteIds.filter(id => !rosterAthleteIds.has(id));

  if (unauthorizedAthletes.length > 0) {
    return err({
      code: 'UNAUTHORIZED',
      message: `Cannot add ${unauthorizedAthletes.length} athlete(s) - not on your roster`,
      details: { unauthorizedAthletes },
    });
  }

  // Continue with adding members...
}
```

3. Update UI to show roster-only selection:
```typescript
// In bulk invite athlete selector
const [availableAthletes, setAvailableAthletes] = useState<Athlete[]>([]);

useEffect(() => {
  loadRosterAthletes();
}, [coachId]);

const loadRosterAthletes = async () => {
  const result = await rosterService.getRoster(coachId);
  if (result.success) {
    setAvailableAthletes(result.data);
  }
};

// Show message if roster empty
{availableAthletes.length === 0 && (
  <EmptyState
    icon="people"
    title="No Athletes on Roster"
    message="Add athletes to your roster before sending bulk invites"
    actionLabel="Add Athletes"
    onAction={() => router.push('/roster/add')}
  />
)}
```

ACCEPTANCE CRITERIA:
✅ sendBulkInvites verifies all athletes on roster
✅ Returns error with count of unauthorized athletes
✅ Error includes unauthorizedAthletes metadata
✅ Squad member addition has same verification
✅ Athlete selector shows only roster athletes
✅ Empty roster shows helpful message
✅ Unit test: invite succeeds when all on roster
✅ Unit test: invite blocked when any not on roster
```

---

## S-44: Add Child Steps Passable With No Data

```
TASK: Add per-step validation to add-child wizard

CONTEXT:
Add child modal allows progressing through steps without filling required fields, leading to incomplete athlete profiles.

FILE: app/(modal)/add-child.tsx
LINES: ~96-118

REQUIRED CHANGES:

1. Add step validation functions:
```typescript
const validateBasicInfo = (): boolean => {
  const errors: string[] = [];

  if (!childData.name?.trim()) {
    errors.push('Name is required');
  }

  if (!childData.dateOfBirth) {
    errors.push('Date of birth is required');
  } else {
    const age = calculateAge(new Date(childData.dateOfBirth));
    if (age < 3 || age > 18) {
      errors.push('Age must be between 3 and 18');
    }
  }

  if (!childData.gender) {
    errors.push('Gender is required');
  }

  if (errors.length > 0) {
    setValidationErrors(errors);
    return false;
  }

  setValidationErrors([]);
  return true;
};

const validateEmergencyInfo = (): boolean => {
  const errors: string[] = [];

  if (!childData.emergencyContacts || childData.emergencyContacts.length === 0) {
    errors.push('At least one emergency contact is required');
  } else {
    childData.emergencyContacts.forEach((contact, index) => {
      if (!contact.name?.trim()) {
        errors.push(`Contact ${index + 1}: Name is required`);
      }
      if (!contact.phone?.trim()) {
        errors.push(`Contact ${index + 1}: Phone number is required`);
      } else if (!validateUKPhone(contact.phone)) {
        errors.push(`Contact ${index + 1}: Invalid UK phone number`);
      }
      if (!contact.relationship?.trim()) {
        errors.push(`Contact ${index + 1}: Relationship is required`);
      }
    });
  }

  if (errors.length > 0) {
    setValidationErrors(errors);
    return false;
  }

  setValidationErrors([]);
  return true;
};

const validateMedicalInfo = (): boolean => {
  // Medical/SEN info is optional, but if provided must be valid
  const errors: string[] = [];

  // Validate allergies format if provided
  if (childData.allergies) {
    const allergyList = childData.allergies.split(',').map(a => a.trim());
    if (allergyList.some(a => a.length > 50)) {
      errors.push('Allergy descriptions must be under 50 characters');
    }
  }

  if (errors.length > 0) {
    setValidationErrors(errors);
    return false;
  }

  setValidationErrors([]);
  return true;
};

const validateUKPhone = (phone: string): boolean => {
  // UK phone regex: 07xxx xxxxxx or +44 7xxx xxxxxx
  const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/;
  return ukPhoneRegex.test(phone.replace(/\s/g, ''));
};
```

2. Update step navigation to validate:
```typescript
const handleNext = () => {
  let isValid = false;

  switch (currentStep) {
    case 0:
      isValid = validateBasicInfo();
      break;
    case 1:
      isValid = validateEmergencyInfo();
      break;
    case 2:
      isValid = validateMedicalInfo();
      break;
    default:
      isValid = true;
  }

  if (isValid) {
    setCurrentStep(prev => prev + 1);
  } else {
    // Show error toast
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

const handleSubmit = async () => {
  // Re-validate all steps before final submission
  if (!validateBasicInfo() || !validateEmergencyInfo() || !validateMedicalInfo()) {
    Alert.alert(
      'Incomplete Information',
      'Please complete all required fields before submitting.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Proceed with submission...
};
```

3. Show validation errors in UI:
```typescript
const [validationErrors, setValidationErrors] = useState<string[]>([]);

{validationErrors.length > 0 && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.xs }}>
      <Ionicons name="alert-circle" size={20} color={colors.error} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.subheading} color="error">
        Please fix the following:
      </ThemedText>
    </Row>
    {validationErrors.map((error, index) => (
      <ThemedText key={index} style={[Typography.small, { marginLeft: Spacing.md }]} color="error">
        • {error}
      </ThemedText>
    ))}
  </Column>
)}
```

4. Disable next button until valid:
```typescript
const [isStepValid, setIsStepValid] = useState(false);

useEffect(() => {
  // Check validity when data changes
  let valid = false;
  switch (currentStep) {
    case 0:
      valid = childData.name && childData.dateOfBirth && childData.gender;
      break;
    case 1:
      valid = childData.emergencyContacts && childData.emergencyContacts.length > 0;
      break;
    case 2:
      valid = true; // Medical info optional
      break;
  }
  setIsStepValid(valid);
}, [childData, currentStep]);

<Button
  title="Next"
  onPress={handleNext}
  disabled={!isStepValid}
  variant="primary"
/>
```

ACCEPTANCE CRITERIA:
✅ Basic info step requires name, DOB, gender
✅ Age validated (3-18 years)
✅ Emergency step requires at least 1 contact
✅ Emergency contact requires name, phone, relationship
✅ UK phone number format validated
✅ Validation errors shown clearly in UI
✅ Next button disabled until step valid
✅ All steps re-validated on final submit
✅ Haptic feedback on validation error
```

---

## Sprint 2 Summary

**Total Items**: 11 high-priority safeguarding issues
**Estimated Effort**: 4-5 days (1 senior engineer)
**Priority**: P1 — Must ship before public launch

**Breakdown by Type**:
- Access Control: 3 items (S-03, S-06, S-07)
- Consent Enforcement: 4 items (S-16, S-20, S-21, S-31)
- Validation: 2 items (S-04, S-44)
- Testing: 1 item (S-10)
- Bulk Operations: 1 item (S-35)

**Dependencies**:
- S-20, S-21, S-31 require consent-service.ts
- S-03, S-06, S-35 require roster-service.ts
- S-07 requires family-service.ts
- S-10 requires test infrastructure

**Risk**: MEDIUM-HIGH — These issues could lead to consent violations, unauthorized data access, and incomplete safety records.

**Success Criteria**:
- Expired DBS strips sensitive roster data
- All consent checks enforced at point of action
- Validation prevents incomplete athlete profiles
- Cross-coach isolation verified by tests
- Emergency consent toggle requires confirmation
