import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState, type LoadingVariant } from '@/components/ui/screen-states';

type ThemeColors = ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];

interface ChildScreenStateProps {
  colors: ThemeColors;
  status: 'loading' | 'error' | 'ready';
  errorMessage: string;
  onRetry: () => void;
  loadingVariant?: LoadingVariant;
  children?: ReactNode;
}

export function ChildScreenState({
  colors,
  status,
  errorMessage,
  onRetry,
  loadingVariant = 'detail',
  children,
}: ChildScreenStateProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {status === 'loading' ? (
        <LoadingState variant={loadingVariant} />
      ) : status === 'error' ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
