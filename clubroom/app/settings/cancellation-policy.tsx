import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SettingsFormScreen } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ErrorState, LoadingState, SubmitProgressState } from '@/components/ui/screen-states';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCancellationPolicySettings } from '@/hooks/use-cancellation-policy-settings';

export default function CancellationPolicyScreen() {
  const { colors: palette } = useTheme();
  const {
    policy,
    templates,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    saving,
    applyTemplate,
    summary,
  } = useCancellationPolicySettings();

  if (!policy) {
    return (
      <SettingsFormScreen title="Cancellation Policy">
        {status === 'error' ? (
          <ErrorState message={error ?? 'Failed to load cancellation policy.'} onRetry={retry} />
        ) : (
          <LoadingState variant="form" />
        )}
      </SettingsFormScreen>
    );
  }

  return (
    <SettingsFormScreen
      title="Cancellation Policy"
      infoText={
        error ??
        'This policy is shown during booking and used when refund eligibility is calculated.'
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
      }
    >
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Current policy</ThemedText>
        <ThemedText style={{ color: palette.muted }}>{summary}</ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          Minimum notice: {policy.minimumNoticeHours}h
        </ThemedText>
      </SurfaceCard>

      <View style={styles.section}>
        {Object.entries(templates).map(([key, template]) => {
          const selected = policy.name === template.name;
          return (
            <Clickable
              key={key}
              onPress={() => void applyTemplate(key as keyof typeof templates)}
              disabled={saving}
              style={[
                styles.optionCard,
                {
                  borderColor: selected ? palette.tint : palette.border,
                  backgroundColor: selected ? withAlpha(palette.tint, 0.08) : palette.card,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
            >
              <Row justify="space-between" align="center" style={styles.optionHeader}>
                <View style={styles.optionText}>
                  <ThemedText type="defaultSemiBold">{template.name}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>{template.description}</ThemedText>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                ) : null}
              </Row>
              {template.tiers.map((tier) => (
                <ThemedText
                  key={`${key}-${tier.hoursBeforeSession}`}
                  style={[Typography.small, { color: palette.muted }]}
                >
                  {tier.refundPercentage}% refund from {tier.hoursBeforeSession}h before
                </ThemedText>
              ))}
            </Clickable>
          );
        })}
      </View>

      {saving ? <SubmitProgressState label="Saving cancellation policy..." /> : null}
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.xs },
  section: { gap: Spacing.md, marginTop: Spacing.md },
  optionCard: { gap: Spacing.xs, borderWidth: 1, borderRadius: 16, padding: Spacing.md },
  optionHeader: { marginBottom: Spacing.xs },
  optionText: { flex: 1, gap: Spacing.micro },
});
