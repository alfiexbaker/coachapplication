import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { CancellationPolicy } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

type TemplateKey = keyof typeof POLICY_TEMPLATES;

export function useCancellationPolicySettings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('UNAUTHORIZED', 'Coach account required.'));
    }
    const result = await schedulingRulesService.getCancellationPolicy(coachId);
    if (!result.success) return err(result.error);
    return ok(result.data ?? schedulingRulesService.getDefaultCancellationPolicy());
  }, [coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CancellationPolicy>({
    load,
    deps: [coachId],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ? `cancellation-policy:${coachId}` : 'cancellation-policy:anonymous',
  });

  useEffect(() => {
    if (data) setPolicy(data);
  }, [data]);

  const applyTemplate = useCallback(
    async (templateKey: TemplateKey) => {
      if (!coachId) return;
      setSaving(true);
      const result = await schedulingRulesService.setCancellationPolicy(coachId, templateKey);
      if (result.success) {
        setPolicy(result.data);
      }
      setSaving(false);
    },
    [coachId],
  );

  return {
    policy,
    templates: POLICY_TEMPLATES,
    loading: status === 'loading' && !policy,
    status: status as ScreenStatus,
    error:
      status === 'error'
        ? ((error as ServiceError | null)?.message ?? 'Failed to load cancellation policy.')
        : null,
    refreshing,
    onRefresh,
    retry,
    saving,
    applyTemplate,
    summary: schedulingRulesService.getCancellationPolicySummary(policy),
  };
}
