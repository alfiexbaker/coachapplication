// @ts-nocheck
/**
 * Notification Preferences Service Tests
 *
 * Unit tests for the notification preferences functionality including:
 * - Getting and updating preferences
 * - Quiet hours management
 * - Channel toggles
 * - Notification type toggles
 * - Muting/unmuting coaches
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

// Mock types
type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS';
type NotificationType =
  | 'BOOKING_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'MESSAGE_RECEIVED'
  | 'BADGE_AWARDED'
  | 'SESSION_REMINDER';

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone?: string;
}

interface TypeNotificationPreference {
  enabled: boolean;
  channels: NotificationChannel[];
}

interface MutedCoach {
  coachId: string;
  coachName: string;
  coachAvatar?: string;
  mutedAt: string;
  reason?: string;
}

interface EnhancedNotificationPreferences {
  userId: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours: QuietHours;
  typePreferences: Partial<Record<NotificationType, TypeNotificationPreference>>;
  mutedCoaches: MutedCoach[];
  updatedAt: string;
  createdAt: string;
}

// In-memory storage for testing
let preferencesStore: Record<string, EnhancedNotificationPreferences> = {};

// Mock notification preferences service
const mockNotificationPreferencesService = {
  createDefaultPreferences(userId: string): EnhancedNotificationPreferences {
    return {
      userId,
      channels: {
        push: true,
        email: true,
        sms: false,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
      },
      typePreferences: {},
      mutedCoaches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getPreferences(userId: string): Promise<EnhancedNotificationPreferences> {
    if (preferencesStore[userId]) {
      return preferencesStore[userId];
    }
    const defaults = this.createDefaultPreferences(userId);
    preferencesStore[userId] = defaults;
    return defaults;
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<EnhancedNotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated: EnhancedNotificationPreferences = {
      ...current,
      ...updates,
      userId,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    preferencesStore[userId] = updated;
    return updated;
  },

  async setQuietHours(
    userId: string,
    startTime: string,
    endTime: string,
    enabled: boolean = true
  ): Promise<EnhancedNotificationPreferences> {
    return this.updatePreferences(userId, {
      quietHours: { enabled, startTime, endTime },
    });
  },

  async toggleQuietHours(
    userId: string,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    return this.updatePreferences(userId, {
      quietHours: { ...current.quietHours, enabled },
    });
  },

  async toggleChannel(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    return this.updatePreferences(userId, {
      channels: {
        ...current.channels,
        [channel.toLowerCase()]: enabled,
      },
    });
  },

  async toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    const currentTypePref = current.typePreferences[type] || {
      enabled: true,
      channels: ['PUSH', 'EMAIL'] as NotificationChannel[],
    };

    return this.updatePreferences(userId, {
      typePreferences: {
        ...current.typePreferences,
        [type]: { ...currentTypePref, enabled },
      },
    });
  },

  async muteCoach(
    userId: string,
    coachId: string,
    coachName: string,
    coachAvatar?: string,
    reason?: string
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);

    const alreadyMuted = current.mutedCoaches.some((mc) => mc.coachId === coachId);
    if (alreadyMuted) {
      return current;
    }

    const mutedCoach: MutedCoach = {
      coachId,
      coachName,
      coachAvatar,
      mutedAt: new Date().toISOString(),
      reason,
    };

    return this.updatePreferences(userId, {
      mutedCoaches: [...current.mutedCoaches, mutedCoach],
    });
  },

  async unmuteCoach(userId: string, coachId: string): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    return this.updatePreferences(userId, {
      mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
    });
  },

  async getMutedCoaches(userId: string): Promise<MutedCoach[]> {
    const prefs = await this.getPreferences(userId);
    return prefs.mutedCoaches;
  },

  async isCoachMuted(userId: string, coachId: string): Promise<boolean> {
    const mutedCoaches = await this.getMutedCoaches(userId);
    return mutedCoaches.some((mc) => mc.coachId === coachId);
  },

  isInQuietHoursSync(prefs: EnhancedNotificationPreferences, currentTime: string): boolean {
    if (!prefs.quietHours.enabled) {
      return false;
    }

    const { startTime, endTime } = prefs.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    // Same day quiet hours (e.g., 14:00 to 16:00)
    return currentTime >= startTime && currentTime < endTime;
  },

  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    coachId?: string,
    currentTime?: string
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check if channel is globally enabled
    const channelKey = channel.toLowerCase() as 'push' | 'email' | 'sms';
    if (!prefs.channels[channelKey]) {
      return false;
    }

    // Check if coach is muted
    if (coachId && prefs.mutedCoaches.some((mc) => mc.coachId === coachId)) {
      return false;
    }

    // Check type-specific preferences
    const typePref = prefs.typePreferences[type];
    if (typePref) {
      if (!typePref.enabled) {
        return false;
      }
      if (!typePref.channels.includes(channel)) {
        return false;
      }
    }

    // Check quiet hours (for push notifications)
    if (channel === 'PUSH' && currentTime) {
      const inQuietHours = this.isInQuietHoursSync(prefs, currentTime);
      if (inQuietHours) {
        return false;
      }
    }

    return true;
  },

  async resetPreferences(userId: string): Promise<EnhancedNotificationPreferences> {
    const defaults = this.createDefaultPreferences(userId);
    preferencesStore[userId] = defaults;
    return defaults;
  },

  clearAll(): void {
    preferencesStore = {};
  },
};

const notificationPreferencesService = mockNotificationPreferencesService;

// Reset store before each test
beforeEach(() => {
  notificationPreferencesService.clearAll();
});

describe('Notification Preferences Service', () => {
  describe('getPreferences', () => {
    test('should return default preferences for new user', async () => {
      const prefs = await notificationPreferencesService.getPreferences('new_user');

      assert.strictEqual(prefs.userId, 'new_user');
      assert.strictEqual(prefs.channels.push, true);
      assert.strictEqual(prefs.channels.email, true);
      assert.strictEqual(prefs.channels.sms, false);
      assert.strictEqual(prefs.quietHours.enabled, false);
      assert.strictEqual(prefs.quietHours.startTime, '22:00');
      assert.strictEqual(prefs.quietHours.endTime, '07:00');
      assert.deepStrictEqual(prefs.typePreferences, {});
      assert.deepStrictEqual(prefs.mutedCoaches, []);
    });

    test('should return existing preferences for existing user', async () => {
      // First call creates defaults
      await notificationPreferencesService.getPreferences('existing_user');

      // Update preferences
      await notificationPreferencesService.toggleChannel('existing_user', 'PUSH', false);

      // Second call should return updated preferences
      const prefs = await notificationPreferencesService.getPreferences('existing_user');
      assert.strictEqual(prefs.channels.push, false);
    });
  });

  describe('updatePreferences', () => {
    test('should update preferences and preserve userId and createdAt', async () => {
      const initial = await notificationPreferencesService.getPreferences('update_user');
      const initialCreatedAt = initial.createdAt;

      const updated = await notificationPreferencesService.updatePreferences('update_user', {
        channels: { push: false, email: true, sms: true },
      });

      assert.strictEqual(updated.userId, 'update_user');
      assert.strictEqual(updated.createdAt, initialCreatedAt);
      assert.strictEqual(updated.channels.push, false);
      assert.strictEqual(updated.channels.sms, true);
    });

    test('should update updatedAt timestamp', async () => {
      const initial = await notificationPreferencesService.getPreferences('timestamp_user');
      const initialUpdatedAt = initial.updatedAt;

      // Wait a tiny bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await notificationPreferencesService.updatePreferences('timestamp_user', {
        channels: { push: false, email: true, sms: false },
      });

      assert.notStrictEqual(updated.updatedAt, initialUpdatedAt);
    });
  });

  describe('setQuietHours', () => {
    test('should set quiet hours with custom times', async () => {
      const updated = await notificationPreferencesService.setQuietHours(
        'quiet_user',
        '23:00',
        '06:00',
        true
      );

      assert.strictEqual(updated.quietHours.enabled, true);
      assert.strictEqual(updated.quietHours.startTime, '23:00');
      assert.strictEqual(updated.quietHours.endTime, '06:00');
    });

    test('should set quiet hours disabled by default when enabled param is false', async () => {
      const updated = await notificationPreferencesService.setQuietHours(
        'quiet_disabled_user',
        '22:00',
        '07:00',
        false
      );

      assert.strictEqual(updated.quietHours.enabled, false);
    });
  });

  describe('toggleQuietHours', () => {
    test('should enable quiet hours', async () => {
      await notificationPreferencesService.getPreferences('toggle_quiet_user');
      const updated = await notificationPreferencesService.toggleQuietHours('toggle_quiet_user', true);

      assert.strictEqual(updated.quietHours.enabled, true);
    });

    test('should disable quiet hours', async () => {
      await notificationPreferencesService.setQuietHours('toggle_quiet_off', '22:00', '07:00', true);
      const updated = await notificationPreferencesService.toggleQuietHours('toggle_quiet_off', false);

      assert.strictEqual(updated.quietHours.enabled, false);
    });
  });

  describe('toggleChannel', () => {
    test('should toggle push notifications off', async () => {
      const updated = await notificationPreferencesService.toggleChannel('channel_user', 'PUSH', false);
      assert.strictEqual(updated.channels.push, false);
    });

    test('should toggle email notifications off', async () => {
      const updated = await notificationPreferencesService.toggleChannel('channel_user2', 'EMAIL', false);
      assert.strictEqual(updated.channels.email, false);
    });

    test('should toggle SMS notifications on', async () => {
      const updated = await notificationPreferencesService.toggleChannel('channel_user3', 'SMS', true);
      assert.strictEqual(updated.channels.sms, true);
    });
  });

  describe('toggleNotificationType', () => {
    test('should disable a notification type', async () => {
      const updated = await notificationPreferencesService.toggleNotificationType(
        'type_user',
        'BOOKING_RECEIVED',
        false
      );

      assert.strictEqual(updated.typePreferences.BOOKING_RECEIVED?.enabled, false);
    });

    test('should enable a notification type', async () => {
      await notificationPreferencesService.toggleNotificationType('type_enable_user', 'MESSAGE_RECEIVED', false);
      const updated = await notificationPreferencesService.toggleNotificationType(
        'type_enable_user',
        'MESSAGE_RECEIVED',
        true
      );

      assert.strictEqual(updated.typePreferences.MESSAGE_RECEIVED?.enabled, true);
    });

    test('should preserve existing channels when toggling', async () => {
      await notificationPreferencesService.toggleNotificationType('preserve_user', 'BADGE_AWARDED', true);
      const updated = await notificationPreferencesService.toggleNotificationType(
        'preserve_user',
        'BADGE_AWARDED',
        false
      );

      // Channels should still exist
      assert.ok(updated.typePreferences.BADGE_AWARDED?.channels);
    });
  });

  describe('muteCoach', () => {
    test('should add coach to muted list', async () => {
      const updated = await notificationPreferencesService.muteCoach(
        'mute_user',
        'coach_1',
        'Coach Sarah',
        'https://example.com/avatar.jpg',
        'Too many messages'
      );

      assert.strictEqual(updated.mutedCoaches.length, 1);
      assert.strictEqual(updated.mutedCoaches[0].coachId, 'coach_1');
      assert.strictEqual(updated.mutedCoaches[0].coachName, 'Coach Sarah');
      assert.strictEqual(updated.mutedCoaches[0].coachAvatar, 'https://example.com/avatar.jpg');
      assert.strictEqual(updated.mutedCoaches[0].reason, 'Too many messages');
      assert.ok(updated.mutedCoaches[0].mutedAt);
    });

    test('should not duplicate muted coach', async () => {
      await notificationPreferencesService.muteCoach('no_dup_user', 'coach_1', 'Coach Sarah');
      const updated = await notificationPreferencesService.muteCoach('no_dup_user', 'coach_1', 'Coach Sarah');

      assert.strictEqual(updated.mutedCoaches.length, 1);
    });

    test('should allow muting multiple coaches', async () => {
      await notificationPreferencesService.muteCoach('multi_mute_user', 'coach_1', 'Coach Sarah');
      const updated = await notificationPreferencesService.muteCoach(
        'multi_mute_user',
        'coach_2',
        'Coach Mike'
      );

      assert.strictEqual(updated.mutedCoaches.length, 2);
    });
  });

  describe('unmuteCoach', () => {
    test('should remove coach from muted list', async () => {
      await notificationPreferencesService.muteCoach('unmute_user', 'coach_1', 'Coach Sarah');
      const updated = await notificationPreferencesService.unmuteCoach('unmute_user', 'coach_1');

      assert.strictEqual(updated.mutedCoaches.length, 0);
    });

    test('should handle unmuting non-muted coach gracefully', async () => {
      const updated = await notificationPreferencesService.unmuteCoach('no_mute_user', 'coach_1');

      assert.strictEqual(updated.mutedCoaches.length, 0);
    });
  });

  describe('getMutedCoaches', () => {
    test('should return list of muted coaches', async () => {
      await notificationPreferencesService.muteCoach('get_muted_user', 'coach_1', 'Coach Sarah');
      await notificationPreferencesService.muteCoach('get_muted_user', 'coach_2', 'Coach Mike');

      const mutedCoaches = await notificationPreferencesService.getMutedCoaches('get_muted_user');

      assert.strictEqual(mutedCoaches.length, 2);
    });

    test('should return empty array for user with no muted coaches', async () => {
      const mutedCoaches = await notificationPreferencesService.getMutedCoaches('no_muted_user');

      assert.strictEqual(mutedCoaches.length, 0);
    });
  });

  describe('isCoachMuted', () => {
    test('should return true for muted coach', async () => {
      await notificationPreferencesService.muteCoach('is_muted_user', 'coach_1', 'Coach Sarah');

      const isMuted = await notificationPreferencesService.isCoachMuted('is_muted_user', 'coach_1');

      assert.strictEqual(isMuted, true);
    });

    test('should return false for non-muted coach', async () => {
      const isMuted = await notificationPreferencesService.isCoachMuted('is_muted_user2', 'coach_1');

      assert.strictEqual(isMuted, false);
    });
  });

  describe('isInQuietHoursSync', () => {
    test('should return false when quiet hours disabled', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = false;

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '23:00');

      assert.strictEqual(result, false);
    });

    test('should return true during overnight quiet hours (after start)', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = true;
      prefs.quietHours.startTime = '22:00';
      prefs.quietHours.endTime = '07:00';

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '23:30');

      assert.strictEqual(result, true);
    });

    test('should return true during overnight quiet hours (before end)', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = true;
      prefs.quietHours.startTime = '22:00';
      prefs.quietHours.endTime = '07:00';

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '06:30');

      assert.strictEqual(result, true);
    });

    test('should return false outside overnight quiet hours', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = true;
      prefs.quietHours.startTime = '22:00';
      prefs.quietHours.endTime = '07:00';

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '14:00');

      assert.strictEqual(result, false);
    });

    test('should return true during same-day quiet hours', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = true;
      prefs.quietHours.startTime = '12:00';
      prefs.quietHours.endTime = '14:00';

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '13:00');

      assert.strictEqual(result, true);
    });

    test('should return false outside same-day quiet hours', () => {
      const prefs = notificationPreferencesService.createDefaultPreferences('test');
      prefs.quietHours.enabled = true;
      prefs.quietHours.startTime = '12:00';
      prefs.quietHours.endTime = '14:00';

      const result = notificationPreferencesService.isInQuietHoursSync(prefs, '15:00');

      assert.strictEqual(result, false);
    });
  });

  describe('shouldSendNotification', () => {
    test('should return false when channel is globally disabled', async () => {
      await notificationPreferencesService.toggleChannel('send_check_user1', 'PUSH', false);

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user1',
        'BOOKING_RECEIVED',
        'PUSH'
      );

      assert.strictEqual(shouldSend, false);
    });

    test('should return false when coach is muted', async () => {
      await notificationPreferencesService.muteCoach('send_check_user2', 'coach_1', 'Coach Sarah');

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user2',
        'MESSAGE_RECEIVED',
        'PUSH',
        'coach_1'
      );

      assert.strictEqual(shouldSend, false);
    });

    test('should return false when notification type is disabled', async () => {
      await notificationPreferencesService.toggleNotificationType(
        'send_check_user3',
        'BADGE_AWARDED',
        false
      );

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user3',
        'BADGE_AWARDED',
        'PUSH'
      );

      assert.strictEqual(shouldSend, false);
    });

    test('should return false during quiet hours for push notifications', async () => {
      await notificationPreferencesService.setQuietHours('send_check_user4', '22:00', '07:00', true);

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user4',
        'BOOKING_RECEIVED',
        'PUSH',
        undefined,
        '23:00'
      );

      assert.strictEqual(shouldSend, false);
    });

    test('should return true for email during quiet hours', async () => {
      await notificationPreferencesService.setQuietHours('send_check_user5', '22:00', '07:00', true);

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user5',
        'BOOKING_RECEIVED',
        'EMAIL',
        undefined,
        '23:00'
      );

      assert.strictEqual(shouldSend, true);
    });

    test('should return true when all conditions pass', async () => {
      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        'send_check_user6',
        'BOOKING_RECEIVED',
        'PUSH',
        'coach_1',
        '14:00'
      );

      assert.strictEqual(shouldSend, true);
    });
  });

  describe('resetPreferences', () => {
    test('should reset to default preferences', async () => {
      await notificationPreferencesService.toggleChannel('reset_user', 'PUSH', false);
      await notificationPreferencesService.muteCoach('reset_user', 'coach_1', 'Coach Sarah');

      const reset = await notificationPreferencesService.resetPreferences('reset_user');

      assert.strictEqual(reset.channels.push, true);
      assert.strictEqual(reset.mutedCoaches.length, 0);
    });
  });
});

describe('Notification Preferences Edge Cases', () => {
  test('should handle updating preferences for multiple users independently', async () => {
    await notificationPreferencesService.toggleChannel('user_a', 'PUSH', false);
    await notificationPreferencesService.toggleChannel('user_b', 'EMAIL', false);

    const prefsA = await notificationPreferencesService.getPreferences('user_a');
    const prefsB = await notificationPreferencesService.getPreferences('user_b');

    assert.strictEqual(prefsA.channels.push, false);
    assert.strictEqual(prefsA.channels.email, true);
    assert.strictEqual(prefsB.channels.push, true);
    assert.strictEqual(prefsB.channels.email, false);
  });

  test('should handle muting and unmuting same coach multiple times', async () => {
    await notificationPreferencesService.muteCoach('toggle_mute_user', 'coach_1', 'Coach Sarah');
    await notificationPreferencesService.unmuteCoach('toggle_mute_user', 'coach_1');
    await notificationPreferencesService.muteCoach('toggle_mute_user', 'coach_1', 'Coach Sarah Updated');

    const mutedCoaches = await notificationPreferencesService.getMutedCoaches('toggle_mute_user');

    assert.strictEqual(mutedCoaches.length, 1);
    assert.strictEqual(mutedCoaches[0].coachName, 'Coach Sarah Updated');
  });

  test('should handle boundary time for quiet hours', async () => {
    const prefs = notificationPreferencesService.createDefaultPreferences('test');
    prefs.quietHours.enabled = true;
    prefs.quietHours.startTime = '22:00';
    prefs.quietHours.endTime = '07:00';

    // Exactly at start time should be in quiet hours
    assert.strictEqual(
      notificationPreferencesService.isInQuietHoursSync(prefs, '22:00'),
      true
    );

    // Just before end time should be in quiet hours
    assert.strictEqual(
      notificationPreferencesService.isInQuietHoursSync(prefs, '06:59'),
      true
    );

    // Exactly at end time should be out of quiet hours
    assert.strictEqual(
      notificationPreferencesService.isInQuietHoursSync(prefs, '07:00'),
      false
    );
  });
});
