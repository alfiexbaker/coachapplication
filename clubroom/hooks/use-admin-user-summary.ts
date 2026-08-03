import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { adminUserService, type AdminUserSummary } from '@/services/admin-user-service';
import type { ServiceError } from '@/types/result';

interface UseAdminUserSummaryResult {
  summary: AdminUserSummary | null;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
}

export function useAdminUserSummary(): UseAdminUserSummaryResult {
  const { data, status, error, refreshing, onRefresh, retry } = useScreen<AdminUserSummary>({
    load: () => adminUserService.getSummary(),
    deps: [],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: 'admin-user-summary',
  });

  return {
    summary: data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  };
}
