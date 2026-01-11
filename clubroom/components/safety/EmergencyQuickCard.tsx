import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
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
      style={[styles.card, { borderColor: `${alertColor}30` }]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${alertColor}15` }]}>
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
          <View style={[styles.alertBadge, { backgroundColor: `${alertColor}15` }]}>
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
                        ? `${palette.error}10`
                        : item.type === 'condition'
                          ? `${palette.warning}10`
                          : `${palette.tint}10`,
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
            <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
              {primaryContact.relationship} - {primaryContact.phone}
            </ThemedText>
          </View>
          <Clickable
            onPress={onCallPrimary}
            style={[styles.callButton, { backgroundColor: palette.success }]}
          >
            <Ionicons name="call" size={22} color="#fff" />
          </Clickable>
        </View>
      )}

      {/* No Contact Warning */}
      {!primaryContact && (
        <View style={[styles.warningSection, { backgroundColor: `${palette.warning}08` }]}>
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
    padding: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  athleteName: {
    fontSize: 18,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginTop: 4,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summarySection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.md,
  },
  itemText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 100,
  },
  moreChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.md,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '500',
  },
  callSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radii.md,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
