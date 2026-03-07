import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachTravelService, type CoachTravelSettings } from '@/services/coach-travel-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export function useTravelRadiusSettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const [settings, setSettings] = useState<CoachTravelSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Coach account required.'));
    }
    return coachTravelService.getSettings(coachId);
  }, [coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CoachTravelSettings>({
    load,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const update = useCallback(
    <K extends keyof CoachTravelSettings>(key: K, value: CoachTravelSettings[K]) => {
      setSettings((previous) => {
        if (!previous) return previous;
        const next = { ...previous, [key]: value };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          setSaving(true);
          const result = await coachTravelService.updateSettings(coachId, { [key]: value });
          if (result.success) {
            setSettings(result.data);
          }
          setSaving(false);
        }, 300);
        return next;
      });
    },
    [coachId],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    settings,
    postcode: currentUser?.postcode ?? 'Not set',
    loading: status === 'loading' && !settings,
    status: status as ScreenStatus,
    error: status === 'error' ? ((error as ServiceError | null)?.message ?? 'Failed to load travel settings.') : null,
    refreshing,
    onRefresh,
    retry,
    saving,
    update,
  };
}
