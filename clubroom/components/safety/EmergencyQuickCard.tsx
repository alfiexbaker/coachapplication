import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { safetyService } from '@/services/safety-service';
import type { EmergencyContact } from '@/constants/types';

type AlertLevel = 'none' | 'low' | 'medium' | 'high';

interface EmergencyQuickCardProps {
  athleteName: string;
  alertLevel: AlertLevel;
  allergies: string[];
  conditions: string[];
  medications: string[];
  primaryContact: EmergencyContact | null;
  onCallPrimary?: () => void;
  onPress?: () => void;
}

/**
 * EmergencyQuickCard - Compact emergency info card for quick access
 * Displays critical info at a glance with one-tap call functionality
 */
export function EmergencyQuickCard({
  athleteName,
  alertLevel,
  allergies,
  conditions,
  medications,
  primaryContact,
  onCallPrimary,
  onPress,
}: EmergencyQuickCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const alertColor = safetyService.getAlertLevelColor(alertLevel);
  const alertLabel = safetyService.getAlertLevelLabel(alertLevel);
  const hasAlerts = alertLevel !== 'none';

  // Get top items to display (limit to 3 total)
  const topItems = [
    ...allergies.slice(0, 2).map(a => ({ label: a, type: 'allergy' as const })),
    ...conditions.slice(0, 2).map(c => ({ label: c, type: 'condition' as const })),
    ...medications.slice(0, 1).map(m => ({ label: m, type: 'medication' as const })),
  ].slice(0, 3);

  const totalItems = allergies.length + conditions.length + medications.length;
  const remainingCount = totalItems - topItems.length;

  return (
    <SurfaceCard
      style={[styles.card, { borderColor: withAlpha(alertColor, 0.19) }]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(alertColor, 0.09) }]}>
          <Ionicons
            name={hasAlerts ? 'warning' : 'shield-checkmark'}
            size={24}
            color={alertColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.athleteName}>
            {athleteName}
          </ThemedText>
          <View style={[styles.alertBadge, { backgroundColor: withAlpha(alertColor, 0.09) }]}>
            <View style={[styles.alertDot, { backgroundColor: alertColor }]} />
            <ThemedText style={[styles.alertText, { color: alertColor }]}>
              {alertLabel}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Medical Summary */}
      {hasAlerts && topItems.length > 0 && (
        <View style={styles.summarySection}>
          <View style={styles.itemsRow}>
            {topItems.map((item, index) => (
              <View
                key={`${item.type}-${index}`}
                style={[
                  styles.itemChip,
                  {
                    backgroundColor:
                      item.type === 'allergy'
                        ? withAlpha(palette.error, 0.06)
                        : item.type === 'condition'
                          ? withAlpha(palette.warning, 0.06)
                          : withAlpha(palette.tint, 0.06),
                  },
                ]}
              >
                <Ionicons
                  name={
                    item.type === 'allergy'
                      ? 'alert-circle'
                      : item.type === 'condition'
                        ? 'fitness'
                        : 'medkit'
                  }
                  size={12}
                  color={
                    item.type === 'allergy'
                      ? palette.error
                      : item.type === 'condition'
                        ? palette.warning
                        : palette.tint
                  }
                />
                <ThemedText
                  style={[
                    styles.itemText,
                    {
                      color:
                        item.type === 'allergy'
                          ? palette.error
                          : item.type === 'condition'
                            ? palette.warning
                            : palette.tint,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </ThemedText>
              </View>
            ))}
            {remainingCount > 0 && (
              <View style={[styles.moreChip, { backgroundColor: palette.surfaceSecondary }]}>
                <ThemedText style={[styles.moreText, { color: palette.muted }]}>
                  +{remainingCount} more
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Quick Call Section */}
      {primaryContact && (
        <View style={[styles.callSection, { borderTopColor: palette.border }]}>
          <View style={styles.contactInfo}>
            <ThemedText style={[styles.contactLabel, { color: palette.muted }]}>
              Emergency Contact
            </ThemedText>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {primaryContact.name}
            </ThemedText>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              {primaryContact.relationship} - {primaryContact.phone}
            </ThemedText>
          </View>
          <Clickable
            onPress={onCallPrimary}
            style={[styles.callButton, { backgroundColor: palette.success }]}
          >
            <Ionicons name="call" size={22} color={palette.onSuccess} />
          </Clickable>
        </View>
      )}

      {/* No Contact Warning */}
      {!primaryContact && (
        <View style={[styles.warningSection, { backgroundColor: withAlpha(palette.warning, 0.03) }]}>
          <Ionicons name="warning" size={16} color={palette.warning} />
          <ThemedText style={[styles.warningText, { color: palette.warning }]}>
            No emergency contact on file
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Components.card.padding,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  athleteName: { ...Typography.heading },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    marginTop: Spacing.xxs,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  alertText: { ...Typography.caption },
  summarySection: {
    paddingHorizontal: Components.card.padding,
    paddingBottom: Components.card.padding,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  itemText: { ...Typography.caption, maxWidth: 100 },
  moreChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  moreText: { ...Typography.caption },
  callSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Components.card.padding,
    borderTopWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Components.card.padding,
    marginHorizontal: Components.card.padding,
    marginBottom: Components.card.padding,
    borderRadius: Radii.md,
  },
  warningText: { ...Typography.smallSemiBold },
});
