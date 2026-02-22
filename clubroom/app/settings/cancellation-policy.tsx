import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const POLICY_TIERS = [
  {
    label: 'More than 24 hours before',
    refund: '100% refund',
    icon: 'checkmark-circle' as const,
    color: 'success' as const,
  },
  {
    label: '12–24 hours before',
    refund: '50% refund',
    icon: 'alert-circle' as const,
    color: 'warning' as const,
  },
  {
    label: 'Less than 12 hours before',
    refund: 'No refund',
    icon: 'close-circle' as const,
    color: 'error' as const,
  },
];

export default function CancellationPolicyScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Cancellation Policy"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          Your cancellation policy is shown to parents when they book a session. This helps set clear
          expectations and protects your time.
        </ThemedText>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Standard Policy
          </ThemedText>
          {POLICY_TIERS.map((tier, index) => (
            <View key={tier.label}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: palette.border }]} />}
              <Row align="center" gap="sm" style={styles.tierRow}>
                <Ionicons name={tier.icon} size={22} color={palette[tier.color]} />
                <View style={styles.tierText}>
                  <ThemedText type="defaultSemiBold">{tier.label}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>{tier.refund}</ThemedText>
                </View>
              </Row>
            </View>
          ))}
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <Row gap="sm" align="flex-start">
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Custom cancellation policies will be available in a future update. For now, the standard
              policy applies to all your sessions.
            </ThemedText>
          </Row>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  description: { ...Typography.body },
  card: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xxs },
  tierRow: { paddingVertical: Spacing.xs },
  tierText: { flex: 1, gap: 2 },
  divider: { height: 1, marginLeft: 38 },
  infoText: { flex: 1, ...Typography.small },
});
