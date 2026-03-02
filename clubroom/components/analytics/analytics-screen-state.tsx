import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState, type LoadingVariant } from '@/components/ui/screen-states';

type ThemeColors = ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];

interface AnalyticsScreenStateProps {
  colors: ThemeColors;
  status: 'loading' | 'error' | 'empty' | 'ready';
  header?: ReactNode;
  renderHeaderInReady?: boolean;
  loadingVariant?: LoadingVariant;
  errorMessage: string;
  error?: { message?: string } | null;
  onRetry: () => void;
  emptyIcon: string;
  emptyTitle: string;
  emptyMessage: string;
  onEmptyAction: () => void;
  emptyActionLabel?: string;
  children?: ReactNode;
}

export function AnalyticsScreenState({
  colors,
  status,
  header,
  renderHeaderInReady = false,
  loadingVariant = 'card',
  errorMessage,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  onEmptyAction,
  emptyActionLabel = 'Refresh',
  children,
}: AnalyticsScreenStateProps) {
  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
        <LoadingState variant={loadingVariant} />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
        <ErrorState message={error?.message ?? errorMessage} onRetry={onRetry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onPressAction={onEmptyAction}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {renderHeaderInReady ? null : header}
      {children}
    </SafeAreaView>
  );
}
