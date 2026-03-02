import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';

type ThemeColors = ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];

interface VerificationScreenStateProps {
  colors: ThemeColors;
  screenStatus: string;
  error?: { message?: string } | null;
  retry: () => void;
  errorMessage: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyMessage: string;
  isEmpty?: boolean;
  header?: ReactNode;
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
  header,
  children,
}: VerificationScreenStateProps) {
  if (screenStatus === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (screenStatus === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
        <ErrorState message={error?.message || errorMessage} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (isEmpty || screenStatus === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        {header}
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {header}
      {children}
    </SafeAreaView>
  );
}
