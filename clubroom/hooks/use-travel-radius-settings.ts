import { useEffect, useRef, useState, startTransition } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import {
  coachTravelService,
  diffCoachTravelSettings,
  type CoachTravelSettings,
} from '@/services/coach-travel-service';
import { err, serviceError, type ServiceError } from '@/types/result';

function clearSaveTimer(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function useTravelRadiusSettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const [settings, setSettings] = useState<CoachTravelSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const draftSettings = useRef<CoachTravelSettings | null>(null);
  const persistedSettings = useRef<CoachTravelSettings | null>(null);
  const canSave = Boolean(coachId && coachTravelService.canSaveTravelSettings());

  const load = async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Coach account required.'));
    }
    return coachTravelService.getSettings(coachId);
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CoachTravelSettings>({
    load,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ? `travel-radius:${coachId}` : 'travel-radius:anonymous',
  });

  useEffect(() => {
    if (data) {
      clearSaveTimer(saveTimer);
      draftSettings.current = data;
      persistedSettings.current = data;
      startTransition(() => {
        setSettings(data);
        setSaveError(null);
      });
    }
  }, [data]);

  const update = <K extends keyof CoachTravelSettings>(key: K, value: CoachTravelSettings[K]) => {
    const current = draftSettings.current;
    const persisted = persistedSettings.current;
    if (!canSave || savingRef.current || !current || !persisted) {
      return;
    }

    const next = { ...current, [key]: value };
    draftSettings.current = next;
    setSettings(next);
    setSaveError(null);

    clearSaveTimer(saveTimer);
    saveTimer.current = setTimeout(() => {
      const patch = diffCoachTravelSettings(persistedSettings.current ?? persisted, next);
      if (Object.keys(patch).length === 0) {
        return;
      }

      savingRef.current = true;
      setSaving(true);
      const rollback = (message: string) => {
        const serverSettings = persistedSettings.current ?? persisted;
        draftSettings.current = serverSettings;
        setSettings(serverSettings);
        setSaveError(message);
      };

      void coachTravelService
        .updateSettings(coachId, patch)
        .then(
          (result) => {
            if (!result.success) {
              rollback(result.error.message);
              return;
            }
            persistedSettings.current = result.data;
            draftSettings.current = result.data;
            setSettings(result.data);
            setSaveError(null);
          },
          () => rollback('Failed to save travel settings.'),
        )
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
    }, 300);
  };

  useEffect(() => {
    return () => {
      clearSaveTimer(saveTimer);
    };
  }, []);

  return {
    settings,
    postcode: currentUser?.postcode ?? 'Not set',
    loading: status === 'loading' && !settings,
    status: status as ScreenStatus,
    error:
      saveError ??
      (status === 'error'
        ? ((error as ServiceError | null)?.message ?? 'Failed to load travel settings.')
        : null),
    refreshing,
    onRefresh,
    retry,
    saving,
    canSave,
    update,
  };
}
