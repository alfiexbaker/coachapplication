import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { CardListItem } from '@/components/payment/card-list-item';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';

const MOCK_CARDS = [
  { number: '•••• •••• •••• 4242', brand: 'Visa', default: true },
  { number: '•••• •••• •••• 1881', brand: 'Mastercard', default: false },
];

export default function PaymentMethodsScreen() {
  const { colors: palette } = useTheme();
  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{
    cards: typeof MOCK_CARDS;
  }>({
    load: async () => ok({ cards: MOCK_CARDS }),
    isEmpty: (value) => value.cards.length === 0,
    refetchOnFocus: true,
  });

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to load payment methods.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <EmptyState
          icon="card-outline"
          title="No payment methods"
          message="Add a card to pay for bookings quickly."
          actionLabel="Add Card"
          onPressAction={() => router.push(Routes.PAYMENT_ADD_CARD)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText type="title">Payment methods</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Mock vault—cards are not real.</ThemedText>

        <View style={{ gap: Spacing.md }}>
          {(data?.cards ?? []).map((card) => (
            <CardListItem key={card.number} card={card} />
          ))}
        </View>

        <Clickable
          onPress={() => router.push(Routes.PAYMENT_ADD_CARD)}
          style={[styles.addButton, { borderColor: palette.border }]}
        >
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Add new card</ThemedText>
        </Clickable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  addButton: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
