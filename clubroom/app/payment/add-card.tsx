import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { CardForm } from '@/components/payment/card-form';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { router } from 'expo-router';

export default function AddCardScreen() {
  const { colors: palette } = useTheme();
  const { status, error, retry } = useScreen<boolean>({
    load: async () => ok(true),
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to open add-card form.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <EmptyState icon="card-outline" title="Card form unavailable" message="Please try again." actionLabel="Retry" onPressAction={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <View style={styles.content}>
        <ThemedText type="title">Add payment method</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Mock form—no real charges.</ThemedText>
        <CardForm
          onSave={() => {
            router.back();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
});
