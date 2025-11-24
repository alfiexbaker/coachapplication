import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EarningsStatCard } from '@/components/earnings/stat-card';
import { TransactionListItem } from '@/components/earnings/transaction-list-item';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const transactions = [
  { title: '1:1 with Tom', subtitle: 'Hyde Park • 4 Sep', amount: '+£90.00', status: 'Pending' },
  { title: 'Group session', subtitle: 'Hackney Marshes • 2 Sep', amount: '+£240.00', status: 'Paid' },
  { title: 'Camp refund', subtitle: 'Summer Camp', amount: '-£50.00', status: 'Refunded' },
];

export default function EarningsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Earnings</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Mock payouts—no Stripe hookup yet.</ThemedText>

        <View style={styles.statsRow}>
          <EarningsStatCard label="Today" value="£0" />
          <EarningsStatCard label="This week" value="£340" />
        </View>
        <View style={styles.statsRow}>
          <EarningsStatCard label="This month" value="£1,520" />
          <EarningsStatCard label="Total" value="£12,450" />
        </View>

        <View style={[styles.balanceCard, { borderColor: palette.border }]}> 
          <ThemedText type="defaultSemiBold">Balance</ThemedText>
          <ThemedText type="title">£450.00</ThemedText>
          <ThemedText style={{ color: palette.muted }}>Pending: £680.00</ThemedText>
        </View>

        <View style={[styles.listCard, { borderColor: palette.border }]}> 
          <ThemedText type="defaultSemiBold">Recent transactions</ThemedText>
          {transactions.map((item) => (
            <TransactionListItem key={item.title} {...item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  balanceCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  listCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
});
