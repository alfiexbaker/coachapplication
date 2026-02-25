# Safeguarding Sprint 1 — P0 Launch Blockers

**Priority**: P0 (Critical — must ship before launch)
**Goal**: Fix critical safeguarding gates that protect children from unverified coaches and secure sensitive data access.

---

## S-01: DBS Gate Fail-Open

```
TASK: Change DBS verification gate from fail-open to fail-closed

CONTEXT:
The DBS safeguarding gate in booking creation defaults to FALSE, allowing unverified coaches to book sessions with children. This is a critical safety vulnerability.

FILE: services/booking/booking-crud-service.ts
LINES: ~38-40

CURRENT CODE:
```typescript
const ENFORCE_DBS_SAFEGUARDING_GATE = process.env.EXPO_PUBLIC_ENFORCE_DBS === 'true';
```

REQUIRED CHANGES:

1. Change default behavior to fail-closed:
```typescript
// Safeguarding: DBS verification required by default (fail-closed)
// Only explicit 'false' environment variable disables enforcement
const ENFORCE_DBS_SAFEGUARDING_GATE = process.env.EXPO_PUBLIC_ENFORCE_DBS !== 'false';
```

2. In createBooking method (~138-178), return clear error when DBS missing:
```typescript
if (ENFORCE_DBS_SAFEGUARDING_GATE) {
  const verificationResult = await verificationService.getVerificationStatus(coachId);
  if (!verificationResult.success) {
    return err({
      code: 'VALIDATION',
      message: 'Cannot verify coach credentials',
    });
  }

  const { dbs } = verificationResult.data;
  if (dbs.status !== 'verified' || (dbs.expiresAt && new Date(dbs.expiresAt) < new Date())) {
    return err({
      code: 'UNAUTHORIZED',
      message: 'DBS verification is required to book sessions with athletes under 18. Please complete background check verification.',
    });
  }
}
```

3. Add logging:
```typescript
if (ENFORCE_DBS_SAFEGUARDING_GATE) {
  logger.info('DBS safeguarding gate enforced', { coachId, bookingId: id });
} else {
  logger.warn('DBS safeguarding gate DISABLED - not for production use', { coachId });
}
```

ACCEPTANCE CRITERIA:
✅ Default behavior requires DBS verification
✅ Only explicit EXPO_PUBLIC_ENFORCE_DBS='false' disables gate
✅ Booking creation fails with clear error when DBS missing/expired
✅ Warning logged when gate disabled
✅ Existing unit tests pass
✅ New test: booking rejected when DBS expired
```

---

## S-02: Mock Verification Buttons

```
TASK: Remove or gate mock "Complete Now" buttons from verification screens

CONTEXT:
Production verification screens have "Complete Now" buttons that instantly mark verification as complete without actual document submission. This bypasses safeguarding entirely.

FILES TO MODIFY:
1. app/verification/background.tsx (lines ~127-133)
2. app/verification/id.tsx (lines ~113-117)
3. app/verification/insurance.tsx (line ~177)

REQUIRED CHANGES:

1. In background.tsx, wrap mock button in __DEV__ check:
```typescript
{__DEV__ && (
  <Button
    title="Complete Now (DEV ONLY)"
    onPress={handleMockComplete}
    variant="secondary"
  />
)}
```

2. In id.tsx, wrap mock button:
```typescript
{__DEV__ && (
  <Button
    title="Complete Now (DEV ONLY)"
    onPress={handleMockComplete}
    variant="secondary"
  />
)}
```

3. In insurance.tsx, wrap mock button:
```typescript
{__DEV__ && (
  <Button
    title="Complete Now (DEV ONLY)"
    onPress={handleMockComplete}
    variant="secondary"
  />
)}
```

4. Add visual indicator that this is dev-only:
```typescript
{__DEV__ && (
  <Column style={{ marginTop: Spacing.md, padding: Spacing.sm, backgroundColor: colors.warningBackground, borderRadius: Radii.sm }}>
    <ThemedText style={Typography.caption} color="warning">
      DEV MODE: Instant verification bypass available
    </ThemedText>
    <Button
      title="Complete Now (DEV ONLY)"
      onPress={handleMockComplete}
      variant="secondary"
    />
  </Column>
)}
```

ACCEPTANCE CRITERIA:
✅ Mock buttons only visible in __DEV__ builds
✅ Production builds have no instant verification bypass
✅ Dev builds show clear "(DEV ONLY)" labeling
✅ All three screens updated consistently
✅ Real upload flows remain unchanged
```

---

## S-05: Emergency Data Access Control

```
TASK: Add access control to emergency contact data retrieval

CONTEXT:
getEmergencyInfo() returns sensitive emergency contacts, medical conditions, and allergies to ANY caller without verification. This violates data protection and safeguarding principles.

FILE: services/safety-service.ts
LINES: ~235-242 (getEmergencyInfo), ~530-585 (getEmergencyContacts)

CURRENT CODE:
```typescript
async getEmergencyInfo(athleteId: string): Promise<Result<EmergencyInfo, ServiceError>> {
  const key = `${STORAGE_KEYS.EMERGENCY_CONTACTS_PREFIX}${athleteId}`;
  const data = await apiClient.get<StoredEmergencyInfo>(key, MOCK_EMERGENCY_INFO);
  return ok(data);
}
```

REQUIRED CHANGES:

1. Add coachId parameter and relationship verification:
```typescript
async getEmergencyInfo(
  athleteId: string,
  requestorId: string,
  requestorRole: 'coach' | 'parent' | 'admin'
): Promise<Result<EmergencyInfo, ServiceError>> {

  // Verify access rights
  const hasAccess = await this.verifyEmergencyDataAccess(athleteId, requestorId, requestorRole);
  if (!hasAccess) {
    logger.warn('Unauthorized emergency data access attempt', {
      athleteId,
      requestorId,
      requestorRole
    });
    return err({
      code: 'UNAUTHORIZED',
      message: 'You do not have permission to view this athlete\'s emergency information',
    });
  }

  const key = `${STORAGE_KEYS.EMERGENCY_CONTACTS_PREFIX}${athleteId}`;
  const data = await apiClient.get<StoredEmergencyInfo>(key, MOCK_EMERGENCY_INFO);

  // Log access for audit trail (per-athlete key, capped at 1000 entries FIFO)
  await this.logEmergencyDataAccess(athleteId, requestorId, requestorRole);

  return ok(data);
}

private async verifyEmergencyDataAccess(
  athleteId: string,
  requestorId: string,
  requestorRole: 'coach' | 'parent' | 'admin'
): Promise<boolean> {
  // Parents always have access to their children
  if (requestorRole === 'parent') {
    const familyResult = await familyService.getFamilyMembers(requestorId);
    if (familyResult.success) {
      const isChild = familyResult.data.some(m => m.id === athleteId);
      if (isChild) return true;
    }
  }

  // Coaches need active roster relationship
  if (requestorRole === 'coach') {
    const rosterResult = await rosterService.getRoster(requestorId);
    if (rosterResult.success) {
      const isOnRoster = rosterResult.data.some(a => a.id === athleteId);
      if (isOnRoster) return true;
    }
  }

  // Admins always have access
  if (requestorRole === 'admin') {
    return true;
  }

  return false;
}

private async logEmergencyDataAccess(
  athleteId: string,
  requestorId: string,
  requestorRole: string
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    athleteId,
    requestorId,
    requestorRole,
    action: 'VIEW_EMERGENCY_INFO' as const,
  };

  // NOTE: Add AUDIT_LOG_PREFIX to constants/storage-keys.ts:
  //   AUDIT_LOG_PREFIX: 'clubroom.audit_log_',
  // Use per-athlete storage key to avoid unbounded growth
  const key = `${STORAGE_KEYS.AUDIT_LOG_PREFIX}${athleteId}`;
  const existingLogs = await apiClient.get<typeof logEntry[]>(key, []);

  // FIFO eviction: keep max 1000 entries per athlete
  const MAX_AUDIT_ENTRIES = 1000;
  const updatedLogs = [...existingLogs, logEntry];
  const trimmedLogs = updatedLogs.length > MAX_AUDIT_ENTRIES
    ? updatedLogs.slice(updatedLogs.length - MAX_AUDIT_ENTRIES)
    : updatedLogs;

  await apiClient.set(key, trimmedLogs);

  logger.info('Emergency data accessed', logEntry);
}
```

2. Update all call sites to pass requestorId and role:
- components/athlete/athlete-emergency-card.tsx
- components/safety/emergency-banner.tsx
- components/safety/emergency-details.tsx

Example:
```typescript
const emergencyResult = await safetyService.getEmergencyInfo(
  athleteId,
  currentUserId,
  userRole
);
```

ACCEPTANCE CRITERIA:
✅ getEmergencyInfo requires requestorId and role
✅ Parents can only access their own children's data
✅ Coaches can only access rostered athletes' data
✅ Unauthorized access returns UNAUTHORIZED error
✅ All access attempts logged with timestamp
✅ Audit log retrievable for compliance
✅ Existing screens updated to pass credentials
```

---

## S-09: User Search Returns Children

```
TASK: Exclude minors from general user search results

CONTEXT:
searchUsers() returns all users including children, making them discoverable by any coach. Children should only be visible to their guardians and rostered coaches.

FILE: services/user-service.ts
LINES: ~132-160

CURRENT CODE:
```typescript
async searchUsers(query: string, filters?: UserSearchFilters): Promise<Result<User[], ServiceError>> {
  const allUsers = await this.loadAllUsers();
  let filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  );
  return ok(filtered);
}
```

REQUIRED CHANGES:

1. Add age check to filter minors from general search:
```typescript
async searchUsers(
  query: string,
  filters?: UserSearchFilters,
  requestorId?: string
): Promise<Result<User[], ServiceError>> {

  const allUsers = await this.loadAllUsers();

  // Filter by search query
  let filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase())
  );

  // SAFEGUARDING: Exclude minors from general search
  // Minors only visible to their guardians and rostered coaches
  // When requestorId is undefined, ALL minors are filtered out
  const currentDate = new Date();

  // Performance: batch-check access for all minors at once
  // instead of per-user permission checks (avoids O(N*M) overhead)
  const minorIds: string[] = [];
  const nonMinors: User[] = [];

  for (const user of filtered) {
    if (user.dateOfBirth) {
      const isMinor = this.isUnder18(user.dateOfBirth, currentDate);
      if (isMinor) {
        minorIds.push(user.id);
      } else {
        nonMinors.push(user);
      }
    } else {
      nonMinors.push(user);
    }
  }

  // If no requestor, exclude all minors
  if (!requestorId || minorIds.length === 0) {
    filtered = nonMinors;
  } else {
    // Batch-check: load family members and roster once
    const accessibleMinorIds = await this.batchCheckMinorAccess(minorIds, requestorId);
    const accessibleMinorIdSet = new Set(accessibleMinorIds);

    const accessibleMinors = filtered.filter(u =>
      minorIds.includes(u.id) && accessibleMinorIdSet.has(u.id)
    );

    const excludedCount = minorIds.length - accessibleMinors.length;
    if (excludedCount > 0) {
      logger.debug('Minors excluded from search results', {
        requestorId,
        excludedCount,
      });
    }

    filtered = [...nonMinors, ...accessibleMinors];
  }

  // Apply additional filters
  if (filters?.role) {
    filtered = filtered.filter(u => u.roles?.includes(filters.role));
  }

  return ok(filtered);
}

private isUnder18(dateOfBirth: string, currentDate: Date): boolean {
  // Use UTC parsing to avoid timezone issues
  const parts = dateOfBirth.split('-');
  const dob = new Date(Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ));
  let age = currentDate.getFullYear() - dob.getUTCFullYear();
  const monthDiff = currentDate.getMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < dob.getUTCDate())) {
    age--;
  }
  return age < 18;
}

private async batchCheckMinorAccess(
  minorIds: string[],
  requestorId: string
): Promise<string[]> {
  const accessibleIds: string[] = [];

  // Load family members once
  const familyResult = await familyService.getFamilyMembers(requestorId);
  const familyChildIds = new Set<string>();
  if (familyResult.success) {
    familyResult.data.forEach(m => familyChildIds.add(m.id));
  }

  // Load roster once (if requestor is a coach)
  const rosterChildIds = new Set<string>();
  const userResult = await this.getUser(requestorId);
  if (userResult.success && userResult.data.roles?.includes('coach')) {
    const rosterResult = await rosterService.getRoster(requestorId);
    if (rosterResult.success) {
      rosterResult.data.forEach(a => rosterChildIds.add(a.id));
    }
  }

  // Check each minor against pre-loaded sets (O(1) per minor)
  for (const minorId of minorIds) {
    if (familyChildIds.has(minorId) || rosterChildIds.has(minorId)) {
      accessibleIds.push(minorId);
    }
  }

  return accessibleIds;
}
```

2. Update call sites to pass requestorId:
- Discovery search
- Coach search
- Community member search

ACCEPTANCE CRITERIA:
✅ Minors not returned in general search results
✅ Parents can find their own children
✅ Coaches can find their rostered athletes
✅ Age calculated from dateOfBirth field
✅ Under-18 threshold enforced
✅ Logging for excluded minors (debug level)
✅ Performance acceptable (async filtering)
```

---

## S-13: Block Service Not Enforced

```
TASK: Integrate block checks into messaging, booking, and search services

CONTEXT:
block-service.ts stores blocked users but no other service checks the block list. Users can still message, book, and discover blocked accounts.

FILE: services/block-service.ts (lines ~22-90)
FILES TO MODIFY: services/messaging-service.ts, services/booking/booking-crud-service.ts, services/user-service.ts

REQUIRED CHANGES:

1. Add helper method to block-service.ts:
```typescript
/**
 * Check if user A has blocked user B (in either direction)
 */
async isBlocked(userAId: string, userBId: string): Promise<boolean> {
  const [aBlockedB, bBlockedA] = await Promise.all([
    this.hasBlocked(userAId, userBId),
    this.hasBlocked(userBId, userAId),
  ]);

  return aBlockedB || bBlockedA;
}
```

2. In messaging-service.ts, add block check to sendMessage:
```typescript
async sendMessage(
  threadId: string,
  senderId: string,
  content: string,
  attachments?: MessageAttachment[]
): Promise<Result<Message, ServiceError>> {

  // Get thread to find recipient
  const threadResult = await this.getThread(threadId);
  if (!threadResult.success) return err(threadResult.error);

  const thread = threadResult.data;
  const recipientId = thread.participants.find(p => p !== senderId);

  if (recipientId) {
    // Check if users have blocked each other
    const blocked = await blockService.isBlocked(senderId, recipientId);
    if (blocked) {
      logger.warn('Message blocked due to block relationship', { senderId, recipientId });
      return err({
        code: 'CONFLICT',
        message: 'Cannot send message to this user',
      });
    }
  }

  // Continue with existing message creation logic...
}
```

3. In booking-crud-service.ts, add block check to createBooking:
```typescript
async createBooking(params: CreateBookingParams): Promise<Result<Booking, ServiceError>> {
  const { coachId, athleteId } = params;

  // Check if coach/athlete have blocked each other
  const blocked = await blockService.isBlocked(coachId, athleteId);
  if (blocked) {
    logger.warn('Booking blocked due to block relationship', { coachId, athleteId });
    return err({
      code: 'CONFLICT',
      message: 'Cannot create booking with this user',
    });
  }

  // Continue with existing booking creation logic...
}
```

4. In user-service.ts, filter blocked users from search:
```typescript
async searchUsers(
  query: string,
  filters?: UserSearchFilters,
  requestorId?: string
): Promise<Result<User[], ServiceError>> {

  // ... existing search logic ...

  // Filter out blocked users
  if (requestorId) {
    filtered = await Promise.all(
      filtered.map(async (user) => {
        const blocked = await blockService.isBlocked(requestorId, user.id);
        if (blocked) {
          logger.debug('Blocked user excluded from search', {
            requestorId,
            blockedUserId: user.id
          });
          return null;
        }
        return user;
      })
    ).then(results => results.filter((u): u is User => u !== null));
  }

  return ok(filtered);
}
```

5. Add event type definition to services/event-bus.ts EventPayloads:
```typescript
// In services/event-bus.ts — add to EventPayloads interface and ServiceEvents:

// In ServiceEvents:
USER_ACTION_BLOCKED: 'user:action_blocked',

// In EventPayloads:
[ServiceEvents.USER_ACTION_BLOCKED]: {
  blockerId: string;
  blockedId: string;
  action: 'send_message' | 'create_booking' | 'search';
  timestamp: string;
};
```

6. Emit the event in each service when block detected:
```typescript
import { emitTyped } from './event-bus';

// In each service when block detected:
emitTyped('USER_ACTION_BLOCKED', {
  blockerId: senderId, // or whoever initiated
  blockedId: recipientId,
  action: 'send_message', // or 'create_booking', 'search'
  timestamp: new Date().toISOString(),
});
```

ACCEPTANCE CRITERIA:
✅ isBlocked() helper checks both directions
✅ Messaging service rejects messages to/from blocked users
✅ Booking service rejects bookings with blocked users
✅ Search service filters blocked users from results
✅ USER_ACTION_BLOCKED event emitted on block detection
✅ Error message doesn't reveal block status ("Cannot send message to this user")
✅ Unit tests for all three integration points
```

---

## S-14: Report Flow No Action

```
TASK: Make report submission trigger safeguarding actions

CONTEXT:
submitReport() stores reports but takes no action. Serious reports (abuse, harassment) should auto-block the reported user and notify admins.

FILE: services/report-service.ts
LINES: ~30-67

CURRENT CODE:
```typescript
async submitReport(params: SubmitReportParams): Promise<Result<Report, ServiceError>> {
  const report: Report = {
    id: generateId(),
    reporterId: params.reporterId,
    reportedUserId: params.reportedUserId,
    category: params.category,
    description: params.description,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const key = `${STORAGE_KEYS.REPORT_PREFIX}${report.id}`;
  await apiClient.set(key, report);

  return ok(report);
}
```

REQUIRED CHANGES:

1. Add automatic block for serious categories:
```typescript
async submitReport(params: SubmitReportParams): Promise<Result<Report, ServiceError>> {
  const report: Report = {
    id: generateId(),
    reporterId: params.reporterId,
    reportedUserId: params.reportedUserId,
    reportedEntityType: params.reportedEntityType,
    reportedEntityId: params.reportedEntityId,
    category: params.category,
    description: params.description,
    evidence: params.evidence,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save report
  const key = `${STORAGE_KEYS.REPORT_PREFIX}${report.id}`;
  await apiClient.set(key, report);

  logger.info('Report submitted', {
    reportId: report.id,
    category: report.category,
    reportedUserId: report.reportedUserId,
  });

  // Auto-block for serious categories
  // NOTE: Extract to a shared constant at module level:
  //   const SERIOUS_REPORT_CATEGORIES = ['abuse', 'harassment', 'inappropriate_contact', 'safety_concern'] as const;
  const isSerious = SERIOUS_REPORT_CATEGORIES.includes(params.category);
  if (isSerious) {
    const blockResult = await blockService.blockUser(
      params.reporterId,
      params.reportedUserId,
      `Auto-blocked due to ${params.category} report`
    );

    if (blockResult.success) {
      logger.warn('User auto-blocked due to serious report', {
        reportId: report.id,
        category: params.category,
        reportedUserId: params.reportedUserId,
      });
    }
  }

  // Emit event for admin notification
  emitTyped('SAFEGUARDING_REPORT_SUBMITTED', {
    reportId: report.id,
    reporterId: params.reporterId,
    reportedUserId: params.reportedUserId,
    category: params.category,
    severity: isSerious ? 'high' : 'medium',
    autoBlocked: isSerious,
    timestamp: report.createdAt,
  });

  return ok(report);
}
```

2. Add event type to services/event-bus.ts:
```typescript
SAFEGUARDING_REPORT_SUBMITTED: {
  reportId: string;
  reporterId: string;
  reportedUserId: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  autoBlocked: boolean;
  timestamp: string;
};
```

3. Update report flow UI to show confirmation:
```typescript
// In components/safety/report-flow-styles.ts or report screen
// Import SERIOUS_REPORT_CATEGORIES from the shared constant defined in report-service.ts
const showReportConfirmation = (category: string) => {
  const isSerious = SERIOUS_REPORT_CATEGORIES.includes(category);

  Alert.alert(
    'Report Submitted',
    isSerious
      ? 'Thank you for reporting this. The user has been blocked and our safeguarding team will review this report urgently.'
      : 'Thank you for reporting this. Our team will review your report and take appropriate action.',
    [{ text: 'OK' }]
  );
};
```

4. Add storage key for reports if missing:
```typescript
// In constants/storage-keys.ts
REPORT_PREFIX: 'report_',
REPORTS_BY_REPORTER: 'reports_by_reporter_',
REPORTS_BY_REPORTED_USER: 'reports_by_reported_user_',
```

ACCEPTANCE CRITERIA:
✅ Serious categories auto-block reported user
✅ SAFEGUARDING_REPORT_SUBMITTED event emitted
✅ Event includes severity level
✅ Reporter sees confirmation message
✅ Confirmation mentions auto-block for serious reports
✅ All reports logged with timestamp
✅ Unit test: abuse report triggers block
✅ Unit test: spam report doesn't trigger block
```

---

## S-41: No Age Validation for Self-Registration

```
TASK: Add age validation to prevent under-13 self-registration

CONTEXT:
Auth service allows any user to self-register without age verification. COPPA requires parental consent for under-13, and safeguarding requires under-18 to register via parent account.

FILE: services/auth-service.ts

REQUIRED CHANGES:

1. Add dateOfBirth to registration flow:
```typescript
interface RegisterParams {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD format
  role: 'coach' | 'athlete' | 'parent';
}

async register(params: RegisterParams): Promise<Result<User, ServiceError>> {
  const { email, password, name, dateOfBirth, role } = params;

  // Validate date of birth — use UTC parsing to avoid timezone issues
  // dateOfBirth is YYYY-MM-DD format; parse as UTC to prevent off-by-one day bugs
  const parts = dateOfBirth.split('-');
  const dob = new Date(Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ));
  if (isNaN(dob.getTime()) || parts.length !== 3) {
    return err({
      code: 'VALIDATION',
      message: 'Please enter a valid date of birth',
    });
  }

  const age = this.calculateAge(dob);

  // COPPA compliance: under-13 cannot self-register
  if (age < 13) {
    logger.warn('Under-13 self-registration blocked', { email, age });
    return err({
      code: 'VALIDATION',
      message: 'Users under 13 must be registered by a parent or guardian. Please ask your parent to create an account and add you as a child.',
    });
  }

  // Safeguarding: 13-17 year olds need parental consent
  const isMinor = age < 18;
  if (age >= 13 && isMinor && role === 'athlete') {
    logger.info('Minor self-registration flagged for parental consent', { email, age });
    // Continue registration but flag for parental approval
  }

  // Existing registration logic...
  // DO NOT store a calculated `age` field — it becomes stale.
  // Compute isMinor dynamically from dateOfBirth when needed.
  const user: User = {
    id: generateId(),
    email,
    name,
    dateOfBirth, // Only store the date, never the calculated age
    roles: [role],
    requiresParentalConsent: age >= 13 && isMinor,
    createdAt: new Date().toISOString(),
  };

  // ... hash password, save user ...

  return ok(user);
}

/** Calculate age from UTC-parsed Date of Birth. */
private calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getUTCDate())) {
    age--;
  }
  return age;
}
```

2. Add age validation to onboarding screens:
```typescript
// In components/auth/onboarding-step-basic-info.tsx
const [dateOfBirth, setDateOfBirth] = useState('');
const [ageError, setAgeError] = useState<string>();

const validateAge = (dob: string) => {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    setAgeError('Please enter a valid date');
    return false;
  }

  const age = calculateAge(birthDate);

  if (age < 13) {
    setAgeError('Users under 13 must be registered by a parent');
    return false;
  }

  if (age > 120) {
    setAgeError('Please enter a valid date of birth');
    return false;
  }

  setAgeError(undefined);
  return true;
};

// Date picker component
<DateTimePicker
  value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
  mode="date"
  display="default"
  maximumDate={new Date()} // Can't be born in the future
  minimumDate={new Date(1900, 0, 1)} // Reasonable minimum
  onChange={(event, date) => {
    if (date) {
      const formatted = date.toISOString().split('T')[0];
      setDateOfBirth(formatted);
      validateAge(formatted);
    }
  }}
/>

{ageError && (
  <ThemedText style={Typography.small} color="error">
    {ageError}
  </ThemedText>
)}
```

3. Update User type (DO NOT store computed `age` or `isMinor` — derive dynamically):
```typescript
// In constants/user-types.ts
interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: string; // YYYY-MM-DD — source of truth for age
  // DO NOT add `age` or `isMinor` fields — these go stale.
  // Use calculateAge(user.dateOfBirth) at read-time instead.
  requiresParentalConsent?: boolean; // 13-17 self-registered
  roles: UserRole[];
  createdAt: string;
  updatedAt?: string;
}
```

ACCEPTANCE CRITERIA:
✅ Registration requires dateOfBirth field
✅ Under-13 registration blocked with clear message
✅ 13-17 registration flagged for parental consent
✅ Age calculated correctly (handles leap years, month/day differences)
✅ User type includes isMinor and requiresParentalConsent flags
✅ Onboarding screen includes date picker
✅ Date picker has reasonable min/max constraints
✅ Age validation error shown immediately
✅ Unit test: under-13 blocked
✅ Unit test: 13-17 flagged
✅ Unit test: 18+ allowed
```

---

## S-43: Hardcoded Demo Passwords

```
TASK: Gate demo login credentials behind __DEV__ check

CONTEXT:
Login screen has hardcoded demo passwords visible in production builds, allowing unauthorized access to test accounts.

FILE: hooks/use-auth.tsx

REQUIRED CHANGES:

1. Find demo password constants (search for 'demo' or 'password'):
```typescript
// BAD: Available in production
const DEMO_COACH_EMAIL = 'coach@demo.com';
const DEMO_COACH_PASSWORD = 'demo123';
```

2. Wrap demo credentials in __DEV__ check:
```typescript
// Demo credentials only available in development builds
const DEMO_CREDENTIALS = __DEV__ ? {
  coach: { email: 'coach@demo.com', password: 'demo123' },
  parent: { email: 'parent@demo.com', password: 'demo123' },
  athlete: { email: 'athlete@demo.com', password: 'demo123' },
} : null;
```

3. Add dev-only quick login component:
```typescript
// In components/auth/login-screen.tsx
{__DEV__ && DEMO_CREDENTIALS && (
  <Column style={{
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: colors.warningBackground,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
  }}>
    <ThemedText style={Typography.small} color="warning">
      DEV MODE ONLY
    </ThemedText>
    <Spacer height={Spacing.xs} />
    <Row style={{ gap: Spacing.xs }}>
      <Button
        title="Coach Demo"
        onPress={() => {
          setEmail(DEMO_CREDENTIALS.coach.email);
          setPassword(DEMO_CREDENTIALS.coach.password);
        }}
        variant="secondary"
      />
      <Button
        title="Parent Demo"
        onPress={() => {
          setEmail(DEMO_CREDENTIALS.parent.email);
          setPassword(DEMO_CREDENTIALS.parent.password);
        }}
        variant="secondary"
      />
      <Button
        title="Athlete Demo"
        onPress={() => {
          setEmail(DEMO_CREDENTIALS.athlete.email);
          setPassword(DEMO_CREDENTIALS.athlete.password);
        }}
        variant="secondary"
      />
    </Row>
  </Column>
)}
```

4. Remove any hardcoded passwords in service files AND auth hooks:
```bash
# Search for potential hardcoded credentials — check both services/ AND hooks/
grep -r "password.*=.*['\"]" services/ hooks/ --include="*.ts" --include="*.tsx"
# Also check services/auth-service.ts specifically for demo/default credentials
grep -rn "demo\|password\|default.*cred" services/auth-service.ts
```

5. Add warning log when demo credentials used:
```typescript
async login(email: string, password: string): Promise<Result<User, ServiceError>> {
  if (__DEV__ && DEMO_CREDENTIALS) {
    const isDemoLogin = Object.values(DEMO_CREDENTIALS).some(
      cred => cred.email === email && cred.password === password
    );
    if (isDemoLogin) {
      logger.warn('DEMO CREDENTIALS USED - development mode only');
    }
  }

  // ... existing login logic ...
}
```

ACCEPTANCE CRITERIA:
✅ Demo credentials wrapped in __DEV__ check
✅ Production builds have no hardcoded passwords
✅ Dev builds show clear "DEV MODE ONLY" warning
✅ Quick login buttons only visible in dev
✅ Logger warns when demo credentials used
✅ All services checked for hardcoded credentials
✅ Build script verification: grep for hardcoded passwords returns empty in prod
```

---

## Sprint 1 Summary

**Total Items**: 8 critical safeguarding issues
**Estimated Effort**: 2-3 days (1 senior engineer)
**Priority**: P0 — Must ship before launch

**Breakdown by Type**:
- Access Control: 3 items (S-05, S-09, S-13)
- Gate Enforcement: 2 items (S-01, S-14)
- Dev Hygiene: 2 items (S-02, S-43)
- Age Validation: 1 item (S-41)

**Dependencies**:
- S-13 requires block-service.ts
- S-05 requires family-service.ts and roster-service.ts
- S-09 requires family-service.ts

**Risk**: HIGH — These are launch-blocking vulnerabilities that expose children to unverified coaches and leak sensitive data.

**Success Criteria**:
- DBS verification enforced by default (fail-closed)
- Emergency contacts require verified access
- Minors excluded from public search
- Blocks enforced across all interaction points
- Reports trigger automatic safeguarding actions
- Age validation prevents under-13 self-registration
- Demo credentials only in dev builds
