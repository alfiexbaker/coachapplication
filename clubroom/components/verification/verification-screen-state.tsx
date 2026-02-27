import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';

type ThemeColors = ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];

interface VerificationScreenStateProps {
  colors: ThemeColors;
  screenStatus: string;
  error?: Error | null;
  retry: () => void;
  errorMessage: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyMessage: string;
  isEmpty?: boolean;
  children: ReactNode;
}

export function VerificationScreenState({
  colors,
  screenStatus,
  error,
  retry,
  errorMessage,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  isEmpty = false,
  children,
}: VerificationScreenStateProps) {
  if (screenStatus === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (screenStatus === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <ErrorState message={error?.message || errorMessage} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (isEmpty || screenStatus === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}
