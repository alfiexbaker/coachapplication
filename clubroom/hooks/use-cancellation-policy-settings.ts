import { useEffect, useState, startTransition } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { CancellationPolicy } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

type TemplateKey = keyof typeof POLICY_TEMPLATES;

async function runWithSavingState<T>(
  setSaving: (saving: boolean) => void,
  work: () => Promise<T>,
): Promise<T> {
  setSaving(true);
  try {
    return await work();
  } finally {
    setSaving(false);
  }
}

export function useCancellationPolicySettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Coach account required.'));
    }
    const result = await schedulingRulesService.getCancellationPolicy(coachId);
    if (!result.success) return err(result.error);
    return ok(result.data ?? schedulingRulesService.getDefaultCancellationPolicy());
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CancellationPolicy>({
    load,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ? `cancellation-policy:${coachId}` : 'cancellation-policy:anonymous',
  });

  useEffect(() => {
    if (data)
      startTransition(() => {
        setPolicy(data);
        setSaveError(null);
      });
  }, [data]);

  const applyTemplate = async (templateKey: TemplateKey) => {
    if (!coachId) return;
    setSaveError(null);

    try {
      const result = await runWithSavingState(setSaving, () =>
        schedulingRulesService.setCancellationPolicy(coachId, templateKey),
      );
      if (result.success) {
        setPolicy(result.data);
      } else {
        setSaveError(result.error.message);
      }
    } catch {
      setSaveError('Failed to save cancellation policy.');
    }
  };

  return {
    policy,
    templates: POLICY_TEMPLATES,
    loading: status === 'loading' && !policy,
    status: status as ScreenStatus,
    error:
      saveError ??
      (status === 'error'
        ? ((error as ServiceError | null)?.message ?? 'Failed to load cancellation policy.')
        : null),
    refreshing,
    onRefresh,
    retry,
    saving,
    applyTemplate,
    summary: schedulingRulesService.getCancellationPolicySummary(policy),
  };
}
