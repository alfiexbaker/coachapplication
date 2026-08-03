import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('notification compatibility storage is mock-only in API mode', () => {
  const store = readSource('services/notification/notification-store.ts');

  const listStart = store.indexOf('async list(): Promise<Result<ExtendedNotificationItem[]');
  const listApiBranch = store.indexOf('if (!USE_MOCK)', listStart);
  const listAuthority = store.indexOf(
    'const authoritativeResult = await this.listAuthoritative()',
    listApiBranch,
  );
  const listLocalRead = store.indexOf('this.loadLocalOverlays()', listApiBranch);

  assert.ok(listStart >= 0, 'test should find notification list');
  assert.ok(listApiBranch >= 0, 'notification list should branch for API mode');
  assert.ok(listAuthority >= 0, 'API-mode list should call /v1 notification authority');
  assert.ok(
    listLocalRead < 0 ||
      listLocalRead > store.indexOf('return ok(await this.loadLocalOverlays())', listApiBranch),
    'API-mode list must not merge local notification overlays',
  );

  const createStart = store.indexOf('async create(');
  const createGuard = store.indexOf('if (!USE_MOCK)', createStart);
  const createLocalWrite = store.indexOf('await this.saveLocalOverlays(updated)', createStart);

  assert.ok(createStart >= 0, 'test should find notification create');
  assert.ok(createGuard >= 0, 'notification create should guard API mode');
  assert.ok(createLocalWrite >= 0, 'test should find mock local create write');
  assert.ok(
    createGuard < createLocalWrite,
    'API mode must return before local notification writes',
  );

  const handledStart = store.indexOf('async markHandled(');
  const handledApiBranch = store.indexOf('if (!USE_MOCK)', handledStart);
  const handledApiReturn = store.indexOf(
    'return ok({ ...readResult.data, read: true });',
    handledApiBranch,
  );
  const handledLocalWrite = store.indexOf('this.saveLocalOverlays(', handledStart);

  assert.ok(handledStart >= 0, 'test should find markHandled');
  assert.ok(handledApiBranch >= 0, 'markHandled should use API branch');
  assert.ok(handledApiReturn >= 0, 'API-mode markHandled should return after marking read');
  assert.ok(
    handledApiReturn < handledLocalWrite,
    'API-mode markHandled must not write handled overlays',
  );

  const sender = readSource('services/notification/notification-sender.ts');
  const sendStart = sender.indexOf('private async send(');
  const sendGuard = sender.indexOf('if (!apiClient.isMockMode)', sendStart);
  const preferenceRead = sender.indexOf(
    'notificationPreferencesService.shouldSendNotification',
    sendStart,
  );
  const pushSchedule = sender.indexOf(
    'pushNotificationService.scheduleLocalNotification',
    sendStart,
  );

  assert.ok(sendStart >= 0, 'test should find notification sender');
  assert.ok(sendGuard >= 0, 'sender should guard API mode');
  assert.ok(sendGuard < preferenceRead, 'API mode must skip local preference-gated sends');
  assert.ok(sendGuard < pushSchedule, 'API mode must skip local push scheduling');

  const rootService = readSource('services/notification-service.ts');
  const seedStart = rootService.indexOf('async seedDemoNotifications()');
  const seedGuard = rootService.indexOf('if (!apiClient.isMockMode)', seedStart);
  const seedWrite = rootService.indexOf('apiClient.set(STORAGE_KEYS.NOTIFICATIONS', seedStart);

  assert.ok(seedStart >= 0, 'test should find demo notification seed');
  assert.ok(seedGuard >= 0, 'demo seed should guard API mode');
  assert.ok(seedWrite >= 0, 'test should find mock demo notification write');
  assert.ok(seedGuard < seedWrite, 'API mode must skip demo notification writes');

  const trigger = readSource('services/notification-trigger.ts');
  const triggerStart = trigger.indexOf('export async function triggerNotification');
  const triggerGuard = trigger.indexOf('if (!apiClient.isMockMode)', triggerStart);
  const triggerWrite = trigger.indexOf('await notificationService.create({', triggerStart);

  assert.ok(triggerStart >= 0, 'test should find notification trigger');
  assert.ok(triggerGuard >= 0, 'notification trigger should guard API mode');
  assert.ok(triggerWrite >= 0, 'test should find local notification create');
  assert.ok(triggerGuard < triggerWrite, 'API mode must skip local notification trigger writes');

  const bookingCrud = readSource('services/booking/booking-crud-service.ts');
  const cancelStart = bookingCrud.indexOf('async cancel(');
  const mockNotificationGuard = bookingCrud.indexOf('if (apiClient.isMockMode)', cancelStart);
  const cancellationTrigger = bookingCrud.indexOf(
    'notificationTriggers.bookingCancelled',
    cancelStart,
  );

  assert.ok(cancelStart >= 0, 'test should find booking cancellation flow');
  assert.ok(mockNotificationGuard >= 0, 'booking cancellation should guard local notifications');
  assert.ok(cancellationTrigger >= 0, 'test should find booking cancellation trigger');
  assert.ok(
    mockNotificationGuard < cancellationTrigger,
    'API-mode booking cancellation must rely on backend notification rows',
  );

  const completionHook = readSource('hooks/use-session-completion.ts');
  const completionEventStart = completionHook.indexOf('emitTyped(ServiceEvents.SESSION_COMPLETED');
  const completionMockGuard = completionHook.indexOf(
    'if (apiClient.isMockMode)',
    completionEventStart,
  );
  const sessionCompletedTrigger = completionHook.indexOf(
    'notificationTriggers.sessionCompleted',
    completionEventStart,
  );
  const reviewPromptTrigger = completionHook.indexOf(
    'notificationTriggers.reviewPrompt',
    completionEventStart,
  );

  assert.ok(completionEventStart >= 0, 'test should find session completion event');
  assert.ok(completionMockGuard >= 0, 'session completion local notifications need mock guard');
  assert.ok(sessionCompletedTrigger >= 0, 'test should find session completed trigger');
  assert.ok(reviewPromptTrigger >= 0, 'test should find review prompt trigger');
  assert.ok(
    completionMockGuard < sessionCompletedTrigger,
    'API-mode session completion must rely on backend completion notification rows',
  );
  assert.ok(
    completionMockGuard < reviewPromptTrigger,
    'API-mode review prompts must rely on backend completion notification rows',
  );
});

test('badge notification actions hide after the API read transition', () => {
  const panel = readSource('components/notification/notifications-panel.tsx');
  const groups = readSource('components/notification/notification-day-groups.tsx');

  assert.ok(
    panel.includes("item.type === 'badge' && !item.read && !item.handled"),
    'compact/full notification panel should hide add-to-feed after read',
  );
  assert.ok(
    groups.includes('item.type === "badge" && !item.read && !item.handled'),
    'day-grouped notification list should hide add-to-feed after read',
  );
});

test('notification preferences preserve live authority errors in API mode', () => {
  const source = readSource('services/notification/notification-preferences.ts');
  const authorityRead = source.indexOf(
    'const authoritativeResult = await notificationAuthorityService.getNotificationPreferences();',
  );
  const mockStorageRead = source.indexOf(
    'const all = await this.loadAllPreferences();',
    authorityRead,
  );
  const helperStart = source.indexOf('function notificationPreferencesError');
  const helperEnd = source.indexOf('class NotificationPreferencesService', helperStart);

  assert.ok(authorityRead >= 0, 'test should find live notification preference read');
  assert.ok(mockStorageRead > authorityRead, 'test should find mock storage boundary');
  assert.ok(helperStart >= 0, 'test should find error preservation helper');
  assert.ok(helperEnd > helperStart, 'test should find helper boundary');

  const liveReadBlock = source.slice(authorityRead, mockStorageRead);
  const helperBlock = source.slice(helperStart, helperEnd);

  assert.ok(
    liveReadBlock.includes('throw authoritativeResult.error;'),
    'API preference read failures should preserve the original ServiceError',
  );
  assert.equal(
    liveReadBlock.includes('throw new Error(authoritativeResult.error.message)'),
    false,
    'API preference read failures must not lose the backend error code',
  );
  assert.ok(
    helperBlock.includes('isServiceError(error) ? error : storageError(fallbackMessage)'),
    'storage errors should only be used when the thrown value is not an authority ServiceError',
  );
  assert.equal(
    source.includes('return err(storageError('),
    false,
    'notification preference catches should use the preserving helper, not generic storage errors',
  );
});

test('notification UI does not bootstrap demo notifications', () => {
  const tab = readSource('app/(tabs)/notifications.tsx');
  const panel = readSource('components/notification/notifications-panel.tsx');

  assert.equal(tab.includes('seedOnMount'), false);
  assert.equal(panel.includes('seedOnMount'), false);
  assert.equal(panel.includes('seedDemoNotifications'), false);
});
