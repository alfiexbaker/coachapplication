import type { ScreenStatus } from '@/hooks/use-screen-core';

export function resolveAuthoritativeScreenState(params: {
  status: ScreenStatus;
  isPending: boolean;
  hasRequestedTruthfulFrame: boolean;
  hasSilentError: boolean;
}): { blocked: boolean; status: ScreenStatus } {
  const pending =
    params.isPending || (params.status !== 'error' && !params.hasRequestedTruthfulFrame);
  const failed = params.hasSilentError || params.status === 'error';

  return {
    blocked: pending || failed,
    status: pending ? 'loading' : failed ? 'error' : params.status,
  };
}
