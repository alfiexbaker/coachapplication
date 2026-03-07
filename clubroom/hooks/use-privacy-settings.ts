import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { privacySettingsService, type PrivacySettings } from '@/services/privacy-settings-service';
import { blockService } from '@/services/block-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export function usePrivacySettings() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? '';
  const isCoach = currentUser?.role === 'COACH';
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [savingKey, setSavingKey] = useState<keyof PrivacySettings | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      return err(serviceError('UNAUTHORIZED', 'No user available.'));
    }

    const [settingsResult, blockedResult] = await Promise.all([
      privacySettingsService.getSettings(userId),
      blockService.getBlockedUsers(userId),
    ]);

    if (!settingsResult.success) {
      return err(settingsResult.error);
    }

    return ok({
      settings: settingsResult.data,
      blockedUsers: blockedResult.success ? blockedResult.data : [],
    });
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen({
    load,
    deps: [userId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (data) {
      setSettings(data.settings);
      setBlockedUsers(data.blockedUsers);
    }
  }, [data]);

  const toggle = useCallback(
    async <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
      if (!userId || !settings) return;
      setSavingKey(key);
      const result = await privacySettingsService.updateSettings(userId, { [key]: value });
      if (result.success) {
        setSettings(result.data);
      }
      setSavingKey(null);
    },
    [settings, userId],
  );

  return {
    settings,
    blockedUsers,
    blockedUsersCount: blockedUsers.length,
    isCoach,
    loading: status === 'loading' && !settings,
    status: status as ScreenStatus,
    error: status === 'error' ? ((error as ServiceError | null)?.message ?? 'Failed to load privacy settings.') : null,
    refreshing,
    onRefresh,
    retry,
    savingKey,
    toggle,
  };
}
