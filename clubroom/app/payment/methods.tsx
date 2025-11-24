import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { CardListItem } from '@/components/payment/card-list-item';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MOCK_CARDS = [
  { number: '•••• •••• •••• 4242', brand: 'Visa', default: true },
  { number: '•••• •••• •••• 1881', brand: 'Mastercard', default: false },
];

export default function PaymentMethodsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Payment methods</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Mock vault—cards are not real.</ThemedText>

        <View style={{ gap: Spacing.md }}>
          {MOCK_CARDS.map((card) => (
            <CardListItem key={card.number} card={card} />
          ))}
        </View>

        <Clickable
          onPress={() => router.push('/payment/add-card')}
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
