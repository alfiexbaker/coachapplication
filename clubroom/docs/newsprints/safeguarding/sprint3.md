# Safeguarding Sprint 3 — P2 First Quarter

**Priority**: P2 (Medium — ship in first quarter post-launch)
**Goal**: Add encryption, expiry tracking, emergency features, data sync, and remove misleading UI claims.

---

## S-08: Session Feedback Filtering Client-Side Only

```
TASK: Filter coach_only notes at data layer, not after load

CONTEXT:
getSessionFeedback() loads all feedback then filters on client, potentially exposing coach_only notes in network/storage inspection.

FILE: services/progress/progress-feedback-service.ts
LINES: ~195-211

CURRENT CODE:
```typescript
async getSessionFeedback(sessionId: string, viewerId: string): Promise<Result<SessionFeedback[], ServiceError>> {
  const allFeedback = await this.loadAllFeedback();
  const sessionFeedback = allFeedback.filter(f => f.sessionId === sessionId);

  // Client-side filtering
  return ok(sessionFeedback.filter(f => {
    if (f.visibility === 'coach_only' && f.coachId !== viewerId) {
      return false;
    }
    return true;
  }));
}
```

REQUIRED CHANGES:

1. Add storage layer that never returns coach_only to parents:
```typescript
async getSessionFeedback(
  sessionId: string,
  viewerId: string,
  viewerRole: 'coach' | 'parent' | 'athlete'
): Promise<Result<SessionFeedback[], ServiceError>> {

  // Load feedback from storage with role-based key
  let key: string;

  if (viewerRole === 'coach') {
    // Coaches get all feedback including coach_only
    key = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_full`;
  } else {
    // Parents/athletes get filtered version
    key = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_public`;
  }

  const feedback = await apiClient.get<SessionFeedback[]>(key, []);

  logger.info('Session feedback retrieved', {
    sessionId,
    viewerId,
    viewerRole,
    count: feedback.length,
  });

  return ok(feedback);
}
```

2. Update saveFeedback to store in both filtered and full versions:
```typescript
async saveFeedback(feedback: SessionFeedback): Promise<Result<SessionFeedback, ServiceError>> {
  const { sessionId, visibility } = feedback;

  // Save individual feedback item
  const itemKey = `${STORAGE_KEYS.FEEDBACK_PREFIX}${feedback.id}`;
  await apiClient.set(itemKey, feedback);

  // Update full version (all feedback)
  const fullKey = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_full`;
  const allFeedback = await apiClient.get<SessionFeedback[]>(fullKey, []);
  const updatedFull = [...allFeedback.filter(f => f.id !== feedback.id), feedback];
  await apiClient.set(fullKey, updatedFull);

  // Update public version (exclude coach_only)
  if (visibility !== 'coach_only') {
    const publicKey = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_public`;
    const publicFeedback = await apiClient.get<SessionFeedback[]>(publicKey, []);
    const updatedPublic = [...publicFeedback.filter(f => f.id !== feedback.id), feedback];
    await apiClient.set(publicKey, updatedPublic);
  }

  logger.info('Feedback saved with visibility filtering', {
    feedbackId: feedback.id,
    sessionId,
    visibility,
  });

  return ok(feedback);
}
```

3. Add storage keys:
```typescript
// In constants/storage-keys.ts
SESSION_FEEDBACK_FULL_PREFIX: 'session_feedback_full_',
SESSION_FEEDBACK_PUBLIC_PREFIX: 'session_feedback_public_',
```

4. Add data migration for existing feedback:
```typescript
async migrateToFilteredStorage(): Promise<void> {
  logger.info('Migrating feedback to filtered storage');

  // Get all feedback items
  const allKeys = await apiClient.getAllKeys();
  const feedbackKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.FEEDBACK_PREFIX));

  const feedbackBySession = new Map<string, SessionFeedback[]>();

  // Group by session
  for (const key of feedbackKeys) {
    const feedback = await apiClient.get<SessionFeedback>(key);
    if (feedback) {
      const existing = feedbackBySession.get(feedback.sessionId) || [];
      feedbackBySession.set(feedback.sessionId, [...existing, feedback]);
    }
  }

  // Create filtered versions
  for (const [sessionId, feedbackList] of feedbackBySession) {
    // Full version (all feedback)
    const fullKey = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_full`;
    await apiClient.set(fullKey, feedbackList);

    // Public version (exclude coach_only)
    const publicFeedback = feedbackList.filter(f => f.visibility !== 'coach_only');
    const publicKey = `${STORAGE_KEYS.SESSION_FEEDBACK_PREFIX}${sessionId}_public`;
    await apiClient.set(publicKey, publicFeedback);
  }

  logger.info('Feedback migration complete', {
    sessionsProcessed: feedbackBySession.size,
  });
}
```

ACCEPTANCE CRITERIA:
✅ Parents never receive coach_only notes in any response
✅ Storage has separate _full and _public versions
✅ saveFeedback updates both versions
✅ Migration function creates filtered versions from existing data
✅ getSessionFeedback requires viewerRole parameter
✅ Unit test: parent gets only public feedback
✅ Unit test: coach gets all feedback including coach_only
```

---

## S-12: Private Notes Stored Plain Text

```
TASK: Encrypt privateNotes field at rest

CONTEXT:
Progress feedback privateNotes are stored as plain text in AsyncStorage, readable by anyone with device access.

FILE: services/progress/progress-feedback-service.ts
LINES: ~44-46

REQUIRED CHANGES:

1. Create encryption utility:

**IMPORTANT**: Do NOT use `EXPO_PUBLIC_*` env vars for secrets -- these are compiled into
the JS bundle and visible in plain text. Use `expo-secure-store` for the encryption key.

```typescript
// utils/encryption.ts
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { createLogger } from '@/utils/logger';
import { ok, err, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('Encryption');

const SECURE_STORE_KEY = 'clubroom_encryption_key';

async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (!key) {
    // Generate a random key on first use
    key = CryptoJS.lib.WordArray.random(32).toString();
    await SecureStore.setItemAsync(SECURE_STORE_KEY, key);
    logger.info('Encryption key generated and stored in secure store');
  }
  return key;
}

export async function encryptText(plainText: string): Promise<Result<string, ServiceError>> {
  try {
    const key = await getOrCreateEncryptionKey();
    const encrypted = CryptoJS.AES.encrypt(plainText, key).toString();
    return ok(encrypted);
  } catch (caughtError: unknown) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
    logger.error('Encryption failed', { message });
    return err({ code: 'STORAGE', message: 'Failed to encrypt sensitive data' });
  }
}

export async function decryptText(encryptedText: string): Promise<Result<string, ServiceError>> {
  try {
    const key = await getOrCreateEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      return err({ code: 'STORAGE', message: 'Decryption produced empty result' });
    }

    return ok(decrypted);
  } catch (caughtError: unknown) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown error';
    logger.error('Decryption failed', { message });
    return err({ code: 'STORAGE', message: 'Failed to decrypt sensitive data' });
  }
}
```

2. Update feedback service to encrypt private notes:
```typescript
async saveFeedback(params: SaveFeedbackParams): Promise<Result<SessionFeedback, ServiceError>> {
  const { sessionId, athleteId, coachId, privateNotes, publicNotes, visibility } = params;

  // Encrypt private notes before storage
  let encryptedPrivateNotes: string | undefined;
  if (privateNotes) {
    const encryptResult = await encryptText(privateNotes);
    if (!encryptResult.success) {
      logger.error('Failed to encrypt private notes', encryptResult.error);
      return err({
        code: 'STORAGE',
        message: 'Unable to secure private notes',
      });
    }
    encryptedPrivateNotes = encryptResult.data;
    logger.info('Private notes encrypted', { feedbackId: params.id });
  }

  const feedback: SessionFeedback = {
    id: params.id || generateId(),
    sessionId,
    athleteId,
    coachId,
    privateNotes: encryptedPrivateNotes, // Store encrypted
    publicNotes,
    visibility,
    createdAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.FEEDBACK_PREFIX}${feedback.id}`;
  await apiClient.set(key, feedback);

  return ok(feedback);
}
```

3. Decrypt when reading:
```typescript
async getFeedback(feedbackId: string): Promise<Result<SessionFeedback, ServiceError>> {
  const key = `${STORAGE_KEYS.FEEDBACK_PREFIX}${feedbackId}`;
  const feedback = await apiClient.get<SessionFeedback>(key);

  if (!feedback) {
    return err({
      code: 'NOT_FOUND',
      message: 'Feedback not found',
    });
  }

  // Decrypt private notes
  if (feedback.privateNotes) {
    const decryptResult = await decryptText(feedback.privateNotes);
    if (!decryptResult.success) {
      logger.error('Failed to decrypt private notes', { feedbackId });
      // Don't fail completely - just omit private notes
      feedback.privateNotes = undefined;
    } else {
      feedback.privateNotes = decryptResult.data;
    }
  }

  return ok(feedback);
}
```

4. Add package.json dependencies:
```json
{
  "dependencies": {
    "crypto-js": "^4.2.0",
    "expo-secure-store": "~14.0.0"
  },
  "devDependencies": {
    "@types/crypto-js": "^4.2.1"
  }
}
```

**NOTE**: `expo-secure-store` stores the encryption key in the iOS Keychain / Android Keystore.
The key is generated once on first use and never leaves secure hardware.
No environment variables needed -- this removes the `EXPO_PUBLIC_*` security risk entirely.

ACCEPTANCE CRITERIA:
✅ privateNotes encrypted before storage
✅ privateNotes decrypted when retrieved
✅ Encryption failure returns clear error
✅ Decryption failure doesn't crash, logs error
✅ crypto-js and expo-secure-store packages installed
✅ Encryption key stored in device secure store (not env vars)
✅ Key auto-generated on first use, never leaves secure hardware
✅ Unit test: notes encrypted in storage
✅ Unit test: notes decrypted correctly on read
```

---

## S-17: Consent No Expiry

```
TASK: Add expiry field to consents with 12-month default

CONTEXT:
Consent records have no expiry date, allowing permissions to persist indefinitely even when circumstances change.

FILE: services/consent-service.ts

REQUIRED CHANGES:

1. Add expiryAt field to Consent type:
```typescript
// In types/consent-types.ts or wherever Consent is defined
interface Consent {
  id: string;
  athleteId: string;
  grantedTo: string; // coachId
  grantedBy: string; // parentId
  type: ConsentType;
  status: 'granted' | 'revoked' | 'expired';
  grantedAt: string;
  revokedAt?: string;
  expiryAt: string; // New field
  createdAt: string;
  updatedAt: string;
}
```

2. Update grantConsent to set expiry:
```typescript
async grantConsent(params: GrantConsentParams): Promise<Result<Consent, ServiceError>> {
  const { athleteId, coachId, consentType, grantedBy, durationMonths = 12 } = params;

  // Calculate expiry date (default 12 months)
  // IMPORTANT: setDate(1) first to avoid month-end overflow
  // e.g., Jan 31 + 1 month would become Mar 3 without this
  const expiryDate = new Date();
  expiryDate.setDate(1);
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const consent: Consent = {
    id: generateId(),
    athleteId,
    grantedTo: coachId,
    grantedBy,
    type: consentType,
    status: 'granted',
    grantedAt: new Date().toISOString(),
    expiryAt: expiryDate.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.CONSENT_PREFIX}${consent.id}`;
  await apiClient.set(key, consent);

  logger.info('Consent granted with expiry', {
    consentId: consent.id,
    athleteId,
    coachId,
    consentType,
    expiryAt: consent.expiryAt,
  });

  emitTyped('CONSENT_GRANTED', {
    consentId: consent.id,
    athleteId,
    coachId,
    consentType,
    expiryAt: consent.expiryAt,
  });

  return ok(consent);
}
```

3. Check expiry in hasConsent:
```typescript
async hasConsent(
  athleteId: string,
  consentType: ConsentType,
  coachId: string
): Promise<Result<boolean, ServiceError>> {

  const consents = await this.getConsents(athleteId);
  const consent = consents.find(c =>
    c.type === consentType &&
    c.grantedTo === coachId
  );

  if (!consent) return ok(false);
  if (consent.status === 'revoked') return ok(false);

  // Check expiry
  const now = new Date();
  const expiryDate = new Date(consent.expiryAt);

  if (expiryDate <= now) {
    // Auto-mark as expired
    await this.markConsentExpired(consent.id);

    logger.info('Consent expired', {
      consentId: consent.id,
      athleteId,
      coachId,
      consentType,
      expiryAt: consent.expiryAt,
    });

    emitTyped('CONSENT_EXPIRED', {
      consentId: consent.id,
      athleteId,
      coachId,
      consentType,
    });

    return ok(false);
  }

  return ok(true);
}

private async markConsentExpired(consentId: string): Promise<void> {
  const key = `${STORAGE_KEYS.CONSENT_PREFIX}${consentId}`;
  const consent = await apiClient.get<Consent>(key);

  if (consent) {
    consent.status = 'expired';
    consent.updatedAt = new Date().toISOString();
    await apiClient.set(key, consent);
  }
}
```

4. Add renewal function:
```typescript
async renewConsent(consentId: string, durationMonths: number = 12): Promise<Result<Consent, ServiceError>> {
  const key = `${STORAGE_KEYS.CONSENT_PREFIX}${consentId}`;
  const consent = await apiClient.get<Consent>(key);

  if (!consent) {
    return err({
      code: 'NOT_FOUND',
      message: 'Consent not found',
    });
  }

  // Extend expiry from current date (setDate(1) to avoid month-end overflow)
  const newExpiryDate = new Date();
  newExpiryDate.setDate(1);
  newExpiryDate.setMonth(newExpiryDate.getMonth() + durationMonths);

  consent.expiryAt = newExpiryDate.toISOString();
  consent.status = 'granted';
  consent.updatedAt = new Date().toISOString();

  await apiClient.set(key, consent);

  logger.info('Consent renewed', {
    consentId,
    athleteId: consent.athleteId,
    newExpiryAt: consent.expiryAt,
  });

  emitTyped('CONSENT_RENEWED', {
    consentId,
    athleteId: consent.athleteId,
    coachId: consent.grantedTo,
    consentType: consent.type,
    newExpiryAt: consent.expiryAt,
  });

  return ok(consent);
}
```

5. Add event types:
```typescript
// In services/event-bus.ts
CONSENT_EXPIRED: {
  consentId: string;
  athleteId: string;
  coachId: string;
  consentType: ConsentType;
};
CONSENT_RENEWED: {
  consentId: string;
  athleteId: string;
  coachId: string;
  consentType: ConsentType;
  newExpiryAt: string;
};
```

ACCEPTANCE CRITERIA:
✅ Consent type includes expiryAt field
✅ grantConsent sets 12-month expiry by default
✅ Custom duration supported via durationMonths parameter
✅ hasConsent checks expiry date
✅ Expired consents auto-marked with status='expired'
✅ renewConsent function extends expiry
✅ CONSENT_EXPIRED event emitted on expiry
✅ CONSENT_RENEWED event emitted on renewal
✅ Unit test: consent expires after duration
✅ Unit test: renewal extends expiry correctly
```

---

## S-18: Consent Expiry No Proactive Alert

```
TASK: Add "Expiring Soon" section to consent roster screen

CONTEXT:
Parents aren't notified when consents are about to expire, leading to unexpected permission denials.

FILE: app/roster/consents.tsx
LINES: ~155-174

REQUIRED CHANGES:

1. Add expiring consents query:
```typescript
const { colors } = useTheme();
const [expiringConsents, setExpiringConsents] = useState<Consent[]>([]);
const [expiredConsents, setExpiredConsents] = useState<Consent[]>([]);

useEffect(() => {
  loadConsentsWithExpiry();
}, []);

const loadConsentsWithExpiry = async () => {
  const result = await consentService.getAllConsents(userId);

  if (result.success) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiring = result.data.filter(c => {
      const expiryDate = new Date(c.expiryAt);
      return expiryDate > now && expiryDate <= thirtyDaysFromNow && c.status === 'granted';
    });

    const expired = result.data.filter(c => {
      const expiryDate = new Date(c.expiryAt);
      return expiryDate <= now || c.status === 'expired';
    });

    setExpiringConsents(expiring);
    setExpiredConsents(expired);
  }
};
```

2. Add expiring section UI:
```typescript
{expiringConsents.length > 0 && (
  <Column style={{ marginBottom: Spacing.lg }}>
    <SectionHeader
      title="Expiring Soon"
      subtitle={`${expiringConsents.length} consent${expiringConsents.length === 1 ? '' : 's'} expiring in next 30 days`}
      icon="time"
      iconColor={colors.warning}
    />

    <Column style={{
      padding: Spacing.md,
      backgroundColor: colors.warningBackground,
      borderRadius: Radii.card,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
    }}>
      <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
        <Ionicons name="alert-circle" size={20} color={colors.warning} />
        <Spacer width={Spacing.xs} />
        <ThemedText style={Typography.subheading} color="warning">
          Action Required
        </ThemedText>
      </Row>

      {expiringConsents.map(consent => (
        <ExpiringConsentCard
          key={consent.id}
          consent={consent}
          onRenew={() => handleRenewConsent(consent.id)}
        />
      ))}
    </Column>
  </Column>
)}
```

3. Create ExpiringConsentCard component:
```typescript
interface ExpiringConsentCardProps {
  consent: Consent;
  onRenew: () => void;
}

const ExpiringConsentCard = ({ consent, onRenew }: ExpiringConsentCardProps) => {
  const { colors } = useTheme();
  const daysUntilExpiry = Math.ceil(
    (new Date(consent.expiryAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Row style={{
      padding: Spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: Radii.sm,
      marginBottom: Spacing.xs,
      alignItems: 'center',
    }}>
      <Column style={{ flex: 1 }}>
        <ThemedText style={Typography.body}>
          {formatConsentType(consent.type)}
        </ThemedText>
        <ThemedText style={Typography.small} color="secondary">
          Expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}
        </ThemedText>
      </Column>

      <Button
        title="Renew"
        onPress={onRenew}
        variant="secondary"
        size="compact"
      />
    </Row>
  );
};
```

4. Add renewal handler:
```typescript
const handleRenewConsent = async (consentId: string) => {
  Alert.alert(
    'Renew Consent',
    'Renew this consent for another 12 months?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Renew',
        onPress: async () => {
          const result = await consentService.renewConsent(consentId);

          if (result.success) {
            Alert.alert('Success', 'Consent renewed for 12 months');
            loadConsentsWithExpiry(); // Refresh
          } else {
            Alert.alert('Error', 'Failed to renew consent');
          }
        },
      },
    ]
  );
};
```

5. Add expired section:
```typescript
{expiredConsents.length > 0 && (
  <Column style={{ marginBottom: Spacing.lg }}>
    <SectionHeader
      title="Expired Consents"
      subtitle={`${expiredConsents.length} expired`}
      icon="close-circle"
      iconColor={colors.error}
    />

    {expiredConsents.map(consent => (
      <Row
        key={consent.id}
        style={{
          padding: Spacing.md,
          backgroundColor: colors.errorBackground,
          borderRadius: Radii.sm,
          marginBottom: Spacing.xs,
          alignItems: 'center',
        }}
      >
        <Column style={{ flex: 1 }}>
          <ThemedText style={Typography.body} color="error">
            {formatConsentType(consent.type)}
          </ThemedText>
          <ThemedText style={Typography.small} color="error">
            Expired {formatDate(consent.expiryAt)}
          </ThemedText>
        </Column>
        <Button
          title="Renew"
          onPress={() => handleRenewConsent(consent.id)}
          variant="primary"
          size="compact"
        />
      </Row>
    ))}
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ "Expiring Soon" section shows consents expiring in 30 days
✅ Days until expiry calculated and displayed
✅ "Renew" button on each expiring consent
✅ Renewal confirmation dialog
✅ Expired section shows already-expired consents
✅ List refreshes after renewal
✅ Visual distinction: warning for expiring, error for expired
✅ Empty state when no expiring/expired consents
```

---

## S-19: Consent Cards Show Raw IDs

```
TASK: Resolve athlete and parent IDs to names in consent cards

CONTEXT:
ConsentCard shows raw IDs instead of human-readable names, making it hard for parents to understand what they're consenting to.

FILES: components/consent/ConsentCard.tsx (lines ~21, ~53)

REQUIRED CHANGES:

1. Add data resolution to ConsentCard:
```typescript
import { useState, useEffect } from 'react';
import { userService } from '@/services/user-service';

interface ConsentCardProps {
  consent: Consent;
  onRevoke?: () => void;
}

export const ConsentCard = ({ consent, onRevoke }: ConsentCardProps) => {
  const { colors } = useTheme();
  const [athleteName, setAthleteName] = useState<string>('');
  const [parentName, setParentName] = useState<string>('');
  const [coachName, setCoachName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveNames();
  }, [consent]);

  const resolveNames = async () => {
    const [athleteResult, parentResult, coachResult] = await Promise.all([
      userService.getUser(consent.athleteId),
      userService.getUser(consent.grantedBy),
      userService.getUser(consent.grantedTo),
    ]);

    if (athleteResult.success) setAthleteName(athleteResult.data.name);
    if (parentResult.success) setParentName(parentResult.data.name);
    if (coachResult.success) setCoachName(coachResult.data.name);

    setLoading(false);
  };

  if (loading) {
    return <Skeleton width="100%" height={80} />;
  }

  return (
    <SurfaceCard>
      <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Column style={{ flex: 1 }}>
          <ThemedText style={Typography.subheading}>
            {formatConsentType(consent.type)}
          </ThemedText>

          <Spacer height={Spacing.xs} />

          <ThemedText style={Typography.small} color="secondary">
            Athlete: {athleteName || 'Unknown'}
          </ThemedText>

          <ThemedText style={Typography.small} color="secondary">
            Coach: {coachName || 'Unknown'}
          </ThemedText>

          <ThemedText style={Typography.small} color="secondary">
            Granted by: {parentName || 'Unknown'}
          </ThemedText>

          <Spacer height={Spacing.xs} />

          <Row style={{ alignItems: 'center' }}>
            <ThemedText style={Typography.caption} color="secondary">
              Granted {formatDate(consent.grantedAt)}
            </ThemedText>
            {consent.expiryAt && (
              <>
                <ThemedText style={Typography.caption} color="secondary">
                  {' • '}
                </ThemedText>
                <ThemedText style={Typography.caption} color="secondary">
                  Expires {formatDate(consent.expiryAt)}
                </ThemedText>
              </>
            )}
          </Row>
        </Column>

        <ConsentBadge status={consent.status} />
      </Row>

      {onRevoke && consent.status === 'granted' && (
        <>
          <Spacer height={Spacing.sm} />
          <Button
            title="Revoke Consent"
            onPress={onRevoke}
            variant="destructive"
            size="compact"
          />
        </>
      )}
    </SurfaceCard>
  );
};
```

2. Add helper function for consent type formatting:
```typescript
const formatConsentType = (type: ConsentType): string => {
  const labels: Record<ConsentType, string> = {
    PHOTO_VIDEO: 'Photos & Videos',
    EMERGENCY_TREATMENT: 'Emergency Medical Treatment',
    SOCIAL_MEDIA: 'Social Media Sharing',
    DATA_PROCESSING: 'Data Processing',
    CONTENT_POSTING: 'Content Posting',
  };

  return labels[type] || type;
};
```

3. Add caching to avoid repeated lookups:
```typescript
// In ConsentCard or use a shared hook
const useUserNames = (userIds: string[]) => {
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNames();
  }, [userIds]);

  const loadNames = async () => {
    const results = await Promise.all(
      userIds.map(id => userService.getUser(id))
    );

    const nameMap: Record<string, string> = {};
    results.forEach((result, index) => {
      if (result.success) {
        nameMap[userIds[index]] = result.data.name;
      }
    });

    setNames(nameMap);
    setLoading(false);
  };

  return { names, loading };
};

// Usage in ConsentCard:
const { names, loading } = useUserNames([
  consent.athleteId,
  consent.grantedBy,
  consent.grantedTo,
]);

const athleteName = names[consent.athleteId] || 'Unknown Athlete';
const parentName = names[consent.grantedBy] || 'Unknown Parent';
const coachName = names[consent.grantedTo] || 'Unknown Coach';
```

ACCEPTANCE CRITERIA:
✅ Athlete ID resolved to name
✅ Parent ID resolved to name (not "Parent")
✅ Coach ID resolved to name
✅ Consent type shown as human-readable label
✅ Loading skeleton while resolving names
✅ Graceful fallback to "Unknown" if resolution fails
✅ Names cached to avoid repeated lookups
✅ Expiry date shown if present
```

---

## S-23: Post Creation Allows Child Photos Without Consent

```
TASK: Add athlete tagging and consent verification to post creation

CONTEXT:
create-post-form allows uploading photos of children without tagging them or checking consent.

FILE: components/social/create-post-form.tsx
LINE: ~259-261

REQUIRED CHANGES:

1. Add athlete tagging UI:
```typescript
const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
const [showAthleteSelector, setShowAthleteSelector] = useState(false);

// After media selection
{mediaAttachments.length > 0 && (
  <Column style={{ marginTop: Spacing.md }}>
    <SectionHeader
      title="Tag Athletes"
      subtitle="Required for photos/videos"
      icon="people"
    />

    <Button
      title={`${selectedAthletes.length > 0 ? `${selectedAthletes.length} athlete(s) tagged` : 'Tag Athletes'}`}
      onPress={() => setShowAthleteSelector(true)}
      variant="secondary"
      leftIcon="add"
    />

    {selectedAthletes.length > 0 && (
      <Column style={{ marginTop: Spacing.sm }}>
        {selectedAthletes.map(athleteId => (
          <AthleteTagChip
            key={athleteId}
            athleteId={athleteId}
            onRemove={() => setSelectedAthletes(prev => prev.filter(id => id !== athleteId))}
          />
        ))}
      </Column>
    )}
  </Column>
)}
```

2. Create AthleteSelector modal:
```typescript
const AthleteSelector = ({ onSelect, onClose, preSelected = [] }) => {
  const [roster, setRoster] = useState<Athlete[]>([]);
  const [selected, setSelected] = useState<string[]>(preSelected);
  const [consentStatus, setConsentStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    const result = await rosterService.getRoster(currentUserId);
    if (result.success) {
      setRoster(result.data);
      checkConsents(result.data.map(a => a.id));
    }
  };

  const checkConsents = async (athleteIds: string[]) => {
    const checks = await Promise.all(
      athleteIds.map(async (id) => {
        const result = await consentService.hasConsent(id, 'PHOTO_VIDEO', currentUserId);
        return { id, hasConsent: result.success && result.data };
      })
    );

    const statusMap: Record<string, boolean> = {};
    checks.forEach(check => {
      statusMap[check.id] = check.hasConsent;
    });
    setConsentStatus(statusMap);
  };

  return (
    <Modal visible onClose={onClose}>
      <Column style={{ padding: Spacing.lg }}>
        <ThemedText style={Typography.heading}>Tag Athletes</ThemedText>
        <Spacer height={Spacing.md} />

        {roster.map(athlete => {
          const hasConsent = consentStatus[athlete.id];
          const isSelected = selected.includes(athlete.id);

          return (
            <Clickable
              key={athlete.id}
              onPress={() => {
                if (!hasConsent) {
                  Alert.alert(
                    'Consent Required',
                    `You don't have photo/video consent for ${athlete.name}. Please request consent from their parent before tagging them in posts.`,
                    [{ text: 'OK' }]
                  );
                  return;
                }

                setSelected(prev =>
                  isSelected ? prev.filter(id => id !== athlete.id) : [...prev, athlete.id]
                );
              }}
              disabled={!hasConsent}
            >
              <Row style={{
                padding: Spacing.sm,
                backgroundColor: !hasConsent ? colors.disabled : isSelected ? colors.primaryBackground : colors.surface,
                borderRadius: Radii.sm,
                marginBottom: Spacing.xs,
                alignItems: 'center',
                opacity: !hasConsent ? 0.5 : 1,
              }}>
                <Avatar uri={athlete.profileImage} size={40} />
                <Spacer width={Spacing.sm} />
                <Column style={{ flex: 1 }}>
                  <ThemedText style={Typography.body}>{athlete.name}</ThemedText>
                  {!hasConsent && (
                    <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
                      <Ionicons name="alert-circle" size={12} color={colors.error} />
                      <Spacer width={Spacing.xxs} />
                      <ThemedText style={Typography.caption} color="error">
                        No photo/video consent
                      </ThemedText>
                    </Row>
                  )}
                </Column>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </Row>
            </Clickable>
          );
        })}

        <Spacer height={Spacing.md} />

        <Button
          title={`Select ${selected.length} athlete(s)`}
          onPress={() => {
            onSelect(selected);
            onClose();
          }}
          variant="primary"
          disabled={selected.length === 0}
        />
      </Column>
    </Modal>
  );
};
```

3. Enforce tagging before post submission:
```typescript
const handleSubmit = async () => {
  // Validate athlete tagging for media posts
  if (mediaAttachments.length > 0 && selectedAthletes.length === 0) {
    Alert.alert(
      'Athletes Required',
      'Please tag all athletes appearing in photos or videos before posting.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Submit post with athlete tags
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

ACCEPTANCE CRITERIA:
✅ Media uploads require athlete tagging
✅ Athlete selector shows roster athletes only
✅ Athletes without consent shown as disabled
✅ Tapping disabled athlete shows consent explanation
✅ Selected athletes shown as chips with remove button
✅ Post submission blocked if media but no athletes
✅ Consent checked for each athlete before allowing selection
✅ Tagged athletes stored with post
```

---

## S-24: Emergency Phone No Validation

```
TASK: Add UK phone validation to emergency contact form

CONTEXT:
Emergency phone field accepts any text, potentially saving invalid numbers that won't work in emergencies.

FILE: components/child/emergency-contact-form.tsx
LINES: ~82-92

REQUIRED CHANGES:

1. Add UK phone validation utility:
```typescript
// utils/phone-validation.ts
export const validateUKPhone = (phone: string): boolean => {
  // Remove all whitespace and formatting
  const cleaned = phone.replace(/\s/g, '');

  // UK mobile: 07xxx xxxxxx
  const ukMobileRegex = /^(\+44\s?7\d{3}|07\d{3})\d{6}$/;

  // UK landline: 01xxx xxxxxx, 02x xxxx xxxx, 03xxx xxxxxx
  const ukLandlineRegex = /^(\+44\s?[1-3]|0[1-3])\d{8,9}$/;

  return ukMobileRegex.test(cleaned) || ukLandlineRegex.test(cleaned);
};

export const formatUKPhone = (phone: string): string => {
  const cleaned = phone.replace(/\s/g, '');

  // Format mobile: 07xxx xxxxxx -> 07xxx xxx xxx
  if (cleaned.startsWith('07') && cleaned.length === 11) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  // Format international mobile: +447xxx xxxxxx -> +44 7xxx xxx xxx
  if (cleaned.startsWith('+447') && cleaned.length === 13) {
    return `+44 ${cleaned.slice(3, 7)} ${cleaned.slice(7, 10)} ${cleaned.slice(10)}`;
  }

  return phone; // Return as-is if doesn't match known formats
};
```

2. Update emergency contact form with validation:
```typescript
import { validateUKPhone, formatUKPhone } from '@/utils/phone-validation';

const [phoneError, setPhoneError] = useState<string>();

const handlePhoneChange = (text: string) => {
  setPhone(text);

  // Clear error as user types
  if (phoneError) setPhoneError(undefined);
};

const handlePhoneBlur = () => {
  // Validate on blur
  if (phone && !validateUKPhone(phone)) {
    setPhoneError('Please enter a valid UK phone number');
  } else if (phone) {
    // Auto-format valid numbers
    const formatted = formatUKPhone(phone);
    setPhone(formatted);
  }
};

<TextInput
  label="Phone Number *"
  value={phone}
  onChangeText={handlePhoneChange}
  onBlur={handlePhoneBlur}
  keyboardType="phone-pad"
  placeholder="07xxx xxx xxx"
  error={phoneError}
  leftIcon="call"
/>

{phoneError && (
  <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
    <Ionicons name="alert-circle" size={16} color={colors.error} />
    <Spacer width={Spacing.xxs} />
    <ThemedText style={Typography.small} color="error">
      {phoneError}
    </ThemedText>
  </Row>
)}
```

3. Add submit validation:
```typescript
const handleSubmit = () => {
  const errors: string[] = [];

  if (!name?.trim()) errors.push('Name is required');
  if (!phone?.trim()) errors.push('Phone number is required');
  else if (!validateUKPhone(phone)) errors.push('Phone number is invalid');
  if (!relationship?.trim()) errors.push('Relationship is required');

  if (errors.length > 0) {
    Alert.alert('Validation Error', errors.join('\n'), [{ text: 'OK' }]);
    return;
  }

  onSubmit({ name, phone, relationship });
};
```

4. Add helpful hints:
```typescript
<Column style={{
  padding: Spacing.sm,
  backgroundColor: colors.infoBackground,
  borderRadius: Radii.sm,
  marginTop: Spacing.xs,
}}>
  <ThemedText style={Typography.caption} color="secondary">
    Accepted formats:
  </ThemedText>
  <ThemedText style={Typography.caption} color="secondary">
    • Mobile: 07xxx xxx xxx
  </ThemedText>
  <ThemedText style={Typography.caption} color="secondary">
    • Landline: 01xxx xxx xxx
  </ThemedText>
  <ThemedText style={Typography.caption} color="secondary">
    • International: +44 7xxx xxx xxx
  </ThemedText>
</Column>
```

ACCEPTANCE CRITERIA:
✅ Phone input has keyboardType="phone-pad"
✅ UK phone regex validates mobile and landline
✅ Validation error shown on blur
✅ Error clears as user types
✅ Valid numbers auto-formatted on blur
✅ Submit blocked if phone invalid
✅ Helpful format hints shown
✅ International +44 format supported
```

---

## S-25: Emergency Email No Validation

```
TASK: Add email validation to emergency contact form

CONTEXT:
Emergency email field accepts any text without validation.

FILE: components/child/emergency-contact-form.tsx
LINES: ~94-105

REQUIRED CHANGES:

1. Add email validation utility:
```typescript
// utils/email-validation.ts
export const validateEmail = (email: string): boolean => {
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Additional checks
  if (!email || email.length > 254) return false;
  if (!emailRegex.test(email)) return false;

  // Check for common typos
  const commonTLDs = ['com', 'co.uk', 'org', 'net', 'edu', 'gov', 'ac.uk'];
  const domain = email.split('@')[1];
  const tld = domain?.split('.').slice(-2).join('.');

  // Warn about uncommon TLDs but don't block
  return true;
};

export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};
```

2. Update form with email validation:
```typescript
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState<string>();

const handleEmailChange = (text: string) => {
  setEmail(text);
  if (emailError) setEmailError(undefined);
};

const handleEmailBlur = () => {
  if (email && !validateEmail(email)) {
    setEmailError('Please enter a valid email address');
  } else if (email) {
    // Normalize email
    setEmail(normalizeEmail(email));
  }
};

<TextInput
  label="Email"
  value={email}
  onChangeText={handleEmailChange}
  onBlur={handleEmailBlur}
  keyboardType="email-address"
  autoCapitalize="none"
  autoCorrect={false}
  placeholder="name@example.com"
  error={emailError}
  leftIcon="mail"
/>

{emailError && (
  <Row style={{ alignItems: 'center', marginTop: Spacing.xxs }}>
    <Ionicons name="alert-circle" size={16} color={colors.error} />
    <Spacer width={Spacing.xxs} />
    <ThemedText style={Typography.small} color="error">
      {emailError}
    </ThemedText>
  </Row>
)}
```

3. Update EmergencyContact type to include email:
```typescript
// In types or wherever EmergencyContact is defined
interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string; // Optional but validated if provided
  relationship: string;
  isPrimary?: boolean;
}
```

ACCEPTANCE CRITERIA:
✅ Email input has keyboardType="email-address"
✅ autoCapitalize="none" and autoCorrect={false}
✅ Email regex validation on blur
✅ Email normalized (lowercased, trimmed) on blur
✅ Validation error shown if invalid
✅ Email optional but validated if provided
✅ Unit test: common email formats accepted
✅ Unit test: invalid formats rejected
```

---

## S-26: Emergency Card No Quick-Dial

```
TASK: Add red "Call Now" button with tel: link to emergency card

CONTEXT:
Emergency contact card displays phone numbers but doesn't provide quick-dial functionality for urgent situations.

FILE: components/athlete/athlete-emergency-card.tsx
LINES: ~38-46, ~82-89

REQUIRED CHANGES:

1. Add quick-dial buttons:
```typescript
import { Linking, Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

const handleCallContact = async (contact: EmergencyContact) => {
  const phoneNumber = contact.phone.replace(/\s/g, ''); // Remove spaces
  const telUrl = `tel:${phoneNumber}`;

  // Haptic feedback
  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  // Check if device can make calls
  const canOpen = await Linking.canOpenURL(telUrl);

  if (canOpen) {
    await Linking.openURL(telUrl);
    logger.info('Emergency contact called', { contactId: contact.id });
  } else {
    Alert.alert('Cannot Make Call', 'This device cannot make phone calls', [{ text: 'OK' }]);
  }
};

// In render:
{emergencyContacts.map(contact => (
  <SurfaceCard key={contact.id} style={{ marginBottom: Spacing.sm }}>
    <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Column style={{ flex: 1 }}>
        <ThemedText style={Typography.subheading}>
          {contact.name}
        </ThemedText>
        <ThemedText style={Typography.small} color="secondary">
          {contact.relationship}
        </ThemedText>
        <ThemedText style={Typography.small} color="secondary">
          {contact.phone}
        </ThemedText>
        {contact.email && (
          <ThemedText style={Typography.small} color="secondary">
            {contact.email}
          </ThemedText>
        )}
      </Column>

      <Button
        title="Call Now"
        onPress={() => handleCallContact(contact)}
        variant="destructive" // Red button for urgency
        leftIcon="call"
        size="compact"
      />
    </Row>
  </SurfaceCard>
))}
```

2. Add primary contact prominent display:
```typescript
{primaryContact && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.errorBackground,
    borderRadius: Radii.card,
    borderWidth: 2,
    borderColor: colors.error,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
      <Ionicons name="alert-circle" size={24} color={colors.error} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.heading} color="error">
        Primary Emergency Contact
      </ThemedText>
    </Row>

    <ThemedText style={Typography.title}>
      {primaryContact.name}
    </ThemedText>
    <ThemedText style={Typography.body} color="secondary">
      {primaryContact.relationship}
    </ThemedText>

    <Spacer height={Spacing.md} />

    <Button
      title={`Call ${primaryContact.name}`}
      onPress={() => handleCallContact(primaryContact)}
      variant="destructive"
      leftIcon="call"
      style={{ minHeight: Components.button.height + Spacing.xs }} // Larger tap target (44 + 8 = 52)
    />

    <Spacer height={Spacing.xs} />

    <ThemedText style={[Typography.caption, { textAlign: 'center' }]} color="secondary">
      Tap to call immediately
    </ThemedText>
  </Column>
)}
```

3. Add call confirmation for non-emergency screens:
```typescript
const handleCallContact = async (contact: EmergencyContact, skipConfirmation = false) => {
  if (!skipConfirmation && !isActiveSession) {
    Alert.alert(
      'Call Emergency Contact',
      `Call ${contact.name} at ${contact.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => initiateCall(contact),
          style: 'destructive',
        },
      ]
    );
    return;
  }

  await initiateCall(contact);
};

const initiateCall = async (contact: EmergencyContact) => {
  const phoneNumber = contact.phone.replace(/\s/g, '');
  const telUrl = `tel:${phoneNumber}`;

  if (Platform.OS !== 'web') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  const canOpen = await Linking.canOpenURL(telUrl);
  if (canOpen) {
    await Linking.openURL(telUrl);
    logger.info('Emergency contact called', { contactId: contact.id });

    // Log to audit trail
    emitTyped('EMERGENCY_CONTACT_CALLED', {
      contactId: contact.id,
      athleteId,
      calledBy: currentUserId,
      timestamp: new Date().toISOString(),
    });
  } else {
    Alert.alert('Cannot Make Call', 'This device cannot make phone calls');
  }
};
```

ACCEPTANCE CRITERIA:
✅ "Call Now" button on each emergency contact
✅ Red/destructive styling for urgency
✅ tel: URL opens phone dialer
✅ Primary contact shown prominently
✅ Larger tap target for primary contact button
✅ Haptic feedback before call (mobile only)
✅ Graceful fallback on web/devices without phone
✅ EMERGENCY_CONTACT_CALLED event emitted
```

---

## S-29: Mock Emergency Contacts

```
TASK: Label mock emergency data and remove fallback in production

CONTEXT:
MOCK_EMERGENCY_INFO serves as fallback data, making it impossible to detect missing emergency contacts.

FILE: services/safety-service.ts (MOCK_EMERGENCY_INFO constant)

REQUIRED CHANGES:

1. Gate mock data behind __DEV__:
```typescript
// Remove or gate MOCK_EMERGENCY_INFO
const MOCK_EMERGENCY_INFO = __DEV__ ? {
  athleteId: 'demo-athlete',
  contacts: [
    {
      id: 'mock-contact-1',
      name: 'DEMO CONTACT (DEV ONLY)',
      phone: '07700 900000',
      email: 'demo@example.com',
      relationship: 'Demo Parent',
      isPrimary: true,
    },
  ],
  medicalConditions: ['DEMO DATA'],
  allergies: ['DEMO DATA'],
  medications: [],
} : null;
```

2. Update getEmergencyInfo to not fallback to mock:
```typescript
async getEmergencyInfo(
  athleteId: string,
  requestorId: string,
  requestorRole: 'coach' | 'parent' | 'admin'
): Promise<Result<EmergencyInfo, ServiceError>> {

  // Verify access...

  const key = `${STORAGE_KEYS.EMERGENCY_CONTACTS_PREFIX}${athleteId}`;

  // PRODUCTION: Don't use mock fallback - missing data is a real error
  const mockFallback = __DEV__ ? MOCK_EMERGENCY_INFO : undefined;
  const data = await apiClient.get<EmergencyInfo>(key, mockFallback);

  if (!data) {
    logger.error('Emergency information not found', { athleteId });
    return err({
      code: 'NOT_FOUND',
      message: 'Emergency contact information has not been provided for this athlete',
    });
  }

  // In dev mode, add warning label
  if (__DEV__ && data === MOCK_EMERGENCY_INFO) {
    logger.warn('Returning DEMO emergency data - development mode only');
  }

  return ok(data);
}
```

3. Add UI warning when displaying mock data:
```typescript
// In components/athlete/athlete-emergency-card.tsx
{/* NOTE: Do not use === for object comparison with deserialized data.
   Check contents instead of reference equality. */}
{__DEV__ && emergencyInfo?.contacts?.[0]?.name?.includes('DEMO') && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.warningBackground,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: colors.warning,
  }}>
    <Row style={{ alignItems: 'center' }}>
      <Ionicons name="warning" size={20} color={colors.warning} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.subheading} color="warning">
        DEMO DATA (DEV ONLY)
      </ThemedText>
    </Row>
    <ThemedText style={Typography.small} color="warning">
      This is placeholder data for development. Real emergency contacts required in production.
    </ThemedText>
  </Column>
)}
```

4. Add validation to block session start without real emergency contacts:
```typescript
// In safety gate or session start validation
async validateEmergencyContacts(athleteId: string): Promise<Result<boolean, ServiceError>> {
  const result = await this.getEmergencyInfo(athleteId, coachId, 'coach');

  if (!result.success) {
    return err({
      code: 'VALIDATION',
      message: 'Emergency contact information must be provided before starting session',
    });
  }

  // In production, ensure it's not mock data
  // NOTE: Do NOT compare with === MOCK_EMERGENCY_INFO (object reference comparison
  // fails on deserialized JSON). Instead check contents:
  if (!__DEV__ && result.data.contacts[0]?.name.includes('DEMO')) {
    logger.error('Mock emergency data detected in production', { athleteId });
    return err({
      code: 'VALIDATION',
      message: 'Valid emergency contacts required',
    });
  }

  if (result.data.contacts.length === 0) {
    return err({
      code: 'VALIDATION',
      message: 'At least one emergency contact required',
    });
  }

  return ok(true);
}
```

ACCEPTANCE CRITERIA:
✅ MOCK_EMERGENCY_INFO only available in __DEV__
✅ Production builds don't fall back to mock data
✅ Missing emergency info returns clear error
✅ Dev builds show "DEMO DATA" warning label
✅ Session start blocked without real emergency contacts
✅ Detection of mock data in production logged as error
```

---

## S-30: Child Profile Changes Don't Propagate

```
TASK: Emit CHILD_PROFILE_UPDATED event and refresh coach roster

CONTEXT:
When parents update child medical info, allergies, or emergency contacts, coaches don't see changes until app restart.

FILE: services/child-service.ts

REQUIRED CHANGES:

1. Emit event after child profile updates:
```typescript
async updateChildProfile(childId: string, updates: Partial<ChildProfile>): Promise<Result<ChildProfile, ServiceError>> {
  const key = `${STORAGE_KEYS.CHILD_PREFIX}${childId}`;
  const existing = await apiClient.get<ChildProfile>(key);

  if (!existing) {
    return err({
      code: 'NOT_FOUND',
      message: 'Child profile not found',
    });
  }

  const updated: ChildProfile = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await apiClient.set(key, updated);

  logger.info('Child profile updated', {
    childId,
    updatedFields: Object.keys(updates),
  });

  // Emit event for real-time sync
  emitTyped('CHILD_PROFILE_UPDATED', {
    childId,
    parentId: existing.parentId,
    updatedFields: Object.keys(updates),
    timestamp: updated.updatedAt,
  });

  // If medical/emergency info changed, emit specific event
  const criticalFields = ['medicalConditions', 'allergies', 'emergencyContacts', 'medications'];
  const criticalChanged = Object.keys(updates).some(field => criticalFields.includes(field));

  if (criticalChanged) {
    emitTyped('CHILD_MEDICAL_INFO_UPDATED', {
      childId,
      updatedFields: Object.keys(updates).filter(f => criticalFields.includes(f)),
      timestamp: updated.updatedAt,
    });

    logger.warn('Critical medical information updated', {
      childId,
      fields: Object.keys(updates),
    });
  }

  return ok(updated);
}
```

2. Add event types:
```typescript
// In services/event-bus.ts
CHILD_PROFILE_UPDATED: {
  childId: string;
  parentId: string;
  updatedFields: string[];
  timestamp: string;
};
CHILD_MEDICAL_INFO_UPDATED: {
  childId: string;
  updatedFields: string[];
  timestamp: string;
};
```

3. Update roster service to listen for changes:
```typescript
// In services/roster-service.ts
constructor() {
  super();
  this.setupEventListeners();
}

private setupEventListeners() {
  // Listen for child profile updates
  onTyped('CHILD_PROFILE_UPDATED', async ({ childId }) => {
    logger.info('Child profile update detected, refreshing roster cache', { childId });
    await this.refreshAthleteInCache(childId);
  });

  onTyped('CHILD_MEDICAL_INFO_UPDATED', async ({ childId, updatedFields }) => {
    logger.warn('Critical medical info updated, clearing roster cache', {
      childId,
      updatedFields,
    });
    // Clear cache to force fresh load
    this.clearCache();

    // Notify coaches
    const coaches = await this.getCoachesForAthlete(childId);
    coaches.forEach(coachId => {
      emitTyped('ROSTER_UPDATE_AVAILABLE', {
        coachId,
        athleteId: childId,
        updateType: 'medical_info',
      });
    });
  });
}

private async refreshAthleteInCache(childId: string) {
  // Reload athlete data and update in-memory cache
  const athleteResult = await this.getAthlete(childId);
  if (athleteResult.success) {
    this.cache.set(childId, {
      data: athleteResult.data,
      timestamp: Date.now(),
    });
  }
}

private async getCoachesForAthlete(athleteId: string): Promise<string[]> {
  // NOTE: O(n*m) where n = roster keys, m = athletes per roster.
  // For scale, consider maintaining an inverse index: athleteId -> coachId[]
  // stored under a dedicated storage key.
  const allKeys = await apiClient.getAllKeys();
  const rosterKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.ROSTER_PREFIX));

  const coaches: string[] = [];

  for (const key of rosterKeys) {
    const coachId = key.replace(STORAGE_KEYS.ROSTER_PREFIX, '');
    const roster = await apiClient.get<AthleteProfile[]>(key, []);

    if (roster.some(a => a.id === athleteId)) {
      coaches.push(coachId);
    }
  }

  return coaches;
}
```

4. Add UI notification when roster updates available:
```typescript
// In coach roster screen
useEffect(() => {
  const unsubscribe = onTyped('ROSTER_UPDATE_AVAILABLE', ({ athleteId, updateType }) => {
    if (updateType === 'medical_info') {
      // Show prominent alert
      Alert.alert(
        'Athlete Information Updated',
        'Medical or emergency contact information has been updated. Please review before your next session.',
        [
          { text: 'Review Now', onPress: () => router.push(`/athlete/${athleteId}`) },
          { text: 'Later', style: 'cancel' },
        ]
      );
    } else {
      // Show toast for non-critical updates
      Toast.show({
        type: 'info',
        text: 'Athlete information updated',
        onPress: () => router.push(`/athlete/${athleteId}`),
      });
    }

    // Refresh roster
    loadRoster();
  });

  return unsubscribe;
}, []);
```

ACCEPTANCE CRITERIA:
✅ CHILD_PROFILE_UPDATED event emitted after profile update
✅ CHILD_MEDICAL_INFO_UPDATED event for critical fields
✅ Roster service listens for profile updates
✅ Coach roster cache cleared when medical info changes
✅ Coaches notified via ROSTER_UPDATE_AVAILABLE event
✅ UI shows alert for medical updates
✅ UI shows toast for non-critical updates
✅ Roster auto-refreshes after update
```

---

## S-33: "Conversations Monitored" is False

```
TASK: Remove false monitoring claim or add honest messaging

CONTEXT:
Messaging service claims conversations are monitored for safety, but there's no actual monitoring.

FILE: services/messaging-service.ts
LINE: ~22

REQUIRED CHANGES:

1. Option A: Remove false claim entirely:
```typescript
// services/messaging-service.ts
// REMOVE any comments or docs claiming monitoring

// Before:
/**
 * Messaging service with safety monitoring
 * All conversations monitored for inappropriate content
 */

// After:
/**
 * Messaging service for coach-parent and coach-athlete communication
 * Supports text messages, attachments, and thread management
 */
```

2. Option B: Add honest disclosure about reporting:
```typescript
/**
 * Messaging service for coach-parent and coach-athlete communication
 *
 * SAFEGUARDING:
 * - Messages are NOT automatically monitored
 * - Users can report inappropriate messages via the report button
 * - Reported messages are reviewed by administrators
 * - Blocking and reporting features available to all users
 */
```

3. Update UI messaging screen to show honest safety info:
```typescript
// In messaging screen header or settings
const SafetyInfoBanner = () => {
  const { colors } = useTheme();

  return (
    <Clickable onPress={() => setShowSafetyInfo(true)}>
      <Row style={{
        padding: Spacing.sm,
        backgroundColor: colors.infoBackground,
        borderRadius: Radii.sm,
        alignItems: 'center',
      }}>
        <Ionicons name="shield-checkmark" size={16} color={colors.info} />
        <Spacer width={Spacing.xs} />
        <ThemedText style={Typography.small} color="info">
          Safety & Reporting
        </ThemedText>
        <Spacer style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={16} color={colors.info} />
      </Row>
    </Clickable>
  );
};

const SafetyInfoModal = () => (
  <Modal visible={showSafetyInfo} onClose={() => setShowSafetyInfo(false)}>
    <Column style={{ padding: Spacing.lg }}>
      <ThemedText style={Typography.heading}>Message Safety</ThemedText>

      <Spacer height={Spacing.md} />

      <ThemedText style={Typography.body}>
        Your safety is important. Here's how messaging works:
      </ThemedText>

      <Spacer height={Spacing.md} />

      <Column style={{ gap: Spacing.sm }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Spacer width={Spacing.xs} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>Not Monitored</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              Messages are not automatically monitored. If you experience inappropriate behavior, please report it.
            </ThemedText>
          </Column>
        </Row>

        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="flag" size={20} color={colors.error} />
          <Spacer width={Spacing.xs} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>Report Messages</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              Long-press any message to report inappropriate content. Reports are reviewed urgently.
            </ThemedText>
          </Column>
        </Row>

        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="ban" size={20} color={colors.error} />
          <Spacer width={Spacing.xs} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>Block Users</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              You can block any user from contacting you via Settings → Blocked Users.
            </ThemedText>
          </Column>
        </Row>

        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="lock-closed" size={20} color={colors.success} />
          <Spacer width={Spacing.xs} />
          <Column style={{ flex: 1 }}>
            <ThemedText style={Typography.subheading}>Privacy</ThemedText>
            <ThemedText style={Typography.small} color="secondary">
              Your messages are private and only visible to conversation participants.
            </ThemedText>
          </Column>
        </Row>
      </Column>

      <Spacer height={Spacing.lg} />

      <Button
        title="Got It"
        onPress={() => setShowSafetyInfo(false)}
        variant="primary"
      />
    </Column>
  </Modal>
);
```

4. Update onboarding to set expectations:
```typescript
// In coach onboarding or parent onboarding
<Column style={{ padding: Spacing.lg }}>
  <ThemedText style={Typography.heading}>Communication Guidelines</ThemedText>

  <Spacer height={Spacing.md} />

  <ThemedText style={Typography.body}>
    Keep all communication professional and appropriate:
  </ThemedText>

  <Spacer height={Spacing.md} />

  <Column style={{ gap: Spacing.sm }}>
    <Row>
      <ThemedText style={Typography.body}>✅ Session logistics and scheduling</ThemedText>
    </Row>
    <Row>
      <ThemedText style={Typography.body}>✅ Progress updates and feedback</ThemedText>
    </Row>
    <Row>
      <ThemedText style={Typography.body}>✅ Emergency contact information</ThemedText>
    </Row>
    <Row>
      <ThemedText style={Typography.body}>❌ Personal conversations unrelated to coaching</ThemedText>
    </Row>
    <Row>
      <ThemedText style={Typography.body}>❌ Requesting contact outside the app</ThemedText>
    </Row>
  </Column>

  <Spacer height={Spacing.md} />

  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.warningBackground,
    borderRadius: Radii.sm,
  }}>
    <ThemedText style={Typography.small} color="warning">
      ⚠️ Messages are NOT automatically monitored. Report any inappropriate behavior immediately.
    </ThemedText>
  </Column>
</Column>
```

ACCEPTANCE CRITERIA:
✅ False monitoring claim removed from service docs
✅ Honest safety information in comments/docs
✅ UI shows "Safety & Reporting" info button
✅ Safety modal explains no monitoring + how to report
✅ Onboarding sets clear communication expectations
✅ Report and block features prominently shown
✅ No misleading safety claims anywhere in UI
```

---

## S-50: Verification Expiry Not Monitored

```
TASK: Auto-mark expired verifications and send expiry warnings

CONTEXT:
DBS, insurance, and other verifications expire but aren't automatically flagged, allowing coaches to continue with expired credentials.

FILE: services/verification-service.ts
LINES: ~116-363

REQUIRED CHANGES:

1. Add expiry checking function:
```typescript
async checkAndUpdateExpiredVerifications(): Promise<void> {
  logger.info('Checking for expired verifications');

  const allKeys = await apiClient.getAllKeys();
  const verificationKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.VERIFICATION_PREFIX));

  const now = new Date();
  let expiredCount = 0;

  for (const key of verificationKeys) {
    const verification = await apiClient.get<VerificationStatus>(key);

    if (!verification) continue;

    let needsUpdate = false;

    // Check DBS expiry
    if (verification.dbs.status === 'verified' &&
        verification.dbs.expiresAt &&
        new Date(verification.dbs.expiresAt) <= now) {

      verification.dbs.status = 'expired';
      needsUpdate = true;
      expiredCount++;

      logger.warn('DBS verification expired', {
        coachId: key.replace(STORAGE_KEYS.VERIFICATION_PREFIX, ''),
        expiryDate: verification.dbs.expiresAt,
      });

      emitTyped('VERIFICATION_EXPIRED', {
        coachId: key.replace(STORAGE_KEYS.VERIFICATION_PREFIX, ''),
        verificationType: 'dbs',
        expiredAt: verification.dbs.expiresAt,
      });
    }

    // Check insurance expiry
    if (verification.insurance.status === 'verified' &&
        verification.insurance.expiresAt &&
        new Date(verification.insurance.expiresAt) <= now) {

      verification.insurance.status = 'expired';
      needsUpdate = true;
      expiredCount++;

      emitTyped('VERIFICATION_EXPIRED', {
        coachId: key.replace(STORAGE_KEYS.VERIFICATION_PREFIX, ''),
        verificationType: 'insurance',
        expiredAt: verification.insurance.expiresAt,
      });
    }

    if (needsUpdate) {
      await apiClient.set(key, verification);
    }
  }

  logger.info('Expiry check complete', { expiredCount });
}
```

2. Add warning notification system:
```typescript
async sendExpiryWarnings(): Promise<void> {
  logger.info('Checking for expiring verifications');

  const allKeys = await apiClient.getAllKeys();
  const verificationKeys = allKeys.filter(k => k.startsWith(STORAGE_KEYS.VERIFICATION_PREFIX));

  const now = new Date();
  const warningThresholds = [30, 14, 7, 1]; // Days before expiry

  for (const key of verificationKeys) {
    const coachId = key.replace(STORAGE_KEYS.VERIFICATION_PREFIX, '');
    const verification = await apiClient.get<VerificationStatus>(key);

    if (!verification) continue;

    // Check DBS
    if (verification.dbs.status === 'verified' && verification.dbs.expiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(verification.dbs.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (warningThresholds.includes(daysUntilExpiry)) {
        emitTyped('VERIFICATION_EXPIRING_SOON', {
          coachId,
          verificationType: 'dbs',
          expiresAt: verification.dbs.expiresAt,
          daysRemaining: daysUntilExpiry,
        });

        logger.warn('DBS expiring soon', { coachId, daysRemaining: daysUntilExpiry });
      }
    }

    // Check insurance
    if (verification.insurance.status === 'verified' && verification.insurance.expiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(verification.insurance.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (warningThresholds.includes(daysUntilExpiry)) {
        emitTyped('VERIFICATION_EXPIRING_SOON', {
          coachId,
          verificationType: 'insurance',
          expiresAt: verification.insurance.expiresAt,
          daysRemaining: daysUntilExpiry,
        });
      }
    }
  }
}
```

3. Add foreground check instead of 24h setInterval:

**IMPORTANT**: `setInterval(24h)` is wrong for mobile -- the app is suspended/killed
long before 24 hours. Instead, check on every foreground resume using `AppState`.

```typescript
// In app initialization or root _layout.tsx
import { AppState, type AppStateStatus } from 'react-native';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const LAST_EXPIRY_CHECK_KEY = 'verification_last_expiry_check';
const CHECK_INTERVAL_MS = 86_400_000; // 24 hours

useEffect(() => {
  const runDailyChecks = async () => {
    // Only run once per 24 hours
    const lastCheck = await apiClient.get<string>(LAST_EXPIRY_CHECK_KEY, '');
    if (lastCheck && Date.now() - new Date(lastCheck).getTime() < CHECK_INTERVAL_MS) {
      return; // Already checked today
    }

    await verificationService.checkAndUpdateExpiredVerifications();
    await verificationService.sendExpiryWarnings();
    await apiClient.set(LAST_EXPIRY_CHECK_KEY, new Date().toISOString());
  };

  // Run on mount
  runDailyChecks();

  // Re-check when app comes to foreground
  const handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      runDailyChecks();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => subscription.remove();
}, []);
```

4. Add UI for expiry warnings:
```typescript
// In coach dashboard or settings
const [expiringVerifications, setExpiringVerifications] = useState<ExpiringVerification[]>([]);

useEffect(() => {
  const unsubscribe = onTyped('VERIFICATION_EXPIRING_SOON', (data) => {
    setExpiringVerifications(prev => [...prev, data]);

    // Show alert for urgent warnings (7 days or less)
    if (data.daysRemaining <= 7) {
      Alert.alert(
        'Verification Expiring Soon',
        `Your ${data.verificationType} verification expires in ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}. Please renew to continue coaching.`,
        [
          { text: 'Renew Now', onPress: () => router.push('/verification') },
          { text: 'Later', style: 'cancel' },
        ]
      );
    }
  });

  return unsubscribe;
}, []);

// Banner for expiring verifications
{expiringVerifications.length > 0 && (
  <Column style={{
    padding: Spacing.md,
    backgroundColor: colors.warningBackground,
    borderRadius: Radii.card,
    marginBottom: Spacing.md,
  }}>
    <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
      <Ionicons name="time" size={20} color={colors.warning} />
      <Spacer width={Spacing.xs} />
      <ThemedText style={Typography.subheading} color="warning">
        Verification Expiring
      </ThemedText>
    </Row>

    {expiringVerifications.map((v, i) => (
      <ThemedText key={i} style={Typography.small} color="warning">
        {v.verificationType} expires in {v.daysRemaining} day{v.daysRemaining === 1 ? '' : 's'}
      </ThemedText>
    ))}

    <Spacer height={Spacing.sm} />

    <Button
      title="Renew Now"
      onPress={() => router.push('/verification')}
      variant="secondary"
    />
  </Column>
)}
```

5. Add event types:
```typescript
// In services/event-bus.ts
VERIFICATION_EXPIRED: {
  coachId: string;
  verificationType: 'dbs' | 'insurance' | 'id' | 'credentials';
  expiredAt: string;
};
VERIFICATION_EXPIRING_SOON: {
  coachId: string;
  verificationType: 'dbs' | 'insurance' | 'id' | 'credentials';
  expiresAt: string;
  daysRemaining: number;
};
```

ACCEPTANCE CRITERIA:
✅ Daily job checks all verifications for expiry
✅ Expired verifications auto-marked as 'expired'
✅ Warnings sent at 30/14/7/1 days before expiry
✅ VERIFICATION_EXPIRED event emitted
✅ VERIFICATION_EXPIRING_SOON event emitted
✅ UI shows banner for expiring verifications
✅ Alert shown for urgent warnings (≤7 days)
✅ "Renew Now" button navigates to verification screen
```

---

## Sprint 3 Summary

**Total Items**: 13 medium-priority safeguarding enhancements
**Estimated Effort**: 5-6 days (1 senior engineer)
**Priority**: P2 — Ship in first quarter post-launch

**Breakdown by Type**:
- Data Security: 2 items (S-08, S-12)
- Consent Management: 3 items (S-17, S-18, S-19)
- Emergency Features: 3 items (S-24, S-25, S-26)
- Data Sync: 1 item (S-30)
- Mock Data: 1 item (S-29)
- Honest Messaging: 1 item (S-33)
- Media Consent: 1 item (S-23)
- Monitoring: 1 item (S-50)

**Dependencies**:
- S-17, S-18, S-19 build on consent-service.ts
- S-24, S-25, S-26 require emergency contact types
- S-30 requires event-bus infrastructure
- S-50 requires background task scheduling

**Risk**: MEDIUM — These items improve safeguarding depth but aren't launch-blocking. Encryption, expiry tracking, and real-time sync improve long-term safety.

**Success Criteria**:
- Coach_only notes never exposed to parents at data layer
- Private notes encrypted at rest
- Consents expire after 12 months
- Parents notified before consent expires
- Emergency contacts validated and quick-dial enabled
- Profile changes propagate to coaches in real-time
- Mock data clearly labeled and gated
- Verification expiry automatically tracked
