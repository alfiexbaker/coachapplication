import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SafetyChecklistProps {
  hasEmergencyContact: boolean;
  hasEmergencyConsent: boolean;
  hasMedicalInfo: boolean;
  onPressIncomplete?: () => void;
}

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * SafetyChecklist - Pre-session safety check component
 * Displays completion status of critical safety requirements
 */
export function SafetyChecklist({
  hasEmergencyContact,
  hasEmergencyConsent,
  hasMedicalInfo,
  onPressIncomplete,
}: SafetyChecklistProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const items: ChecklistItem[] = [
    {
      key: 'contact',
      label: 'Emergency Contact',
      description: 'At least one emergency contact on file',
      isComplete: hasEmergencyContact,
      icon: 'call',
    },
    {
      key: 'consent',
      label: 'Emergency Treatment Consent',
      description: 'Parent has granted emergency treatment consent',
      isComplete: hasEmergencyConsent,
      icon: 'shield-checkmark',
    },
    {
      key: 'medical',
      label: 'Medical Information',
      description: 'Allergies, conditions, or medications documented',
      isComplete: hasMedicalInfo,
      icon: 'medical',
    },
  ];

  const completedCount = items.filter(i => i.isComplete).length;
  const isAllComplete = completedCount === items.length;

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor: isAllComplete
                ? `${palette.success}15`
                : `${palette.warning}15`,
            },
          ]}
        >
          <Ionicons
            name={isAllComplete ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={isAllComplete ? palette.success : palette.warning}
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Safety Checklist</ThemedText>
          <ThemedText style={[styles.headerSubtext, { color: palette.muted }]}>
            {isAllComplete
              ? 'All safety requirements met'
              : `${completedCount}/${items.length} requirements complete`}
          </ThemedText>
        </View>
        <View
          style={[
            styles.progressBadge,
            {
              backgroundColor: isAllComplete
                ? `${palette.success}15`
                : `${palette.warning}15`,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.progressText,
              { color: isAllComplete ? palette.success : palette.warning },
            ]}
          >
            {completedCount}/{items.length}
          </ThemedText>
        </View>
      </View>

      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.item,
              index < items.length - 1 && { borderBottomColor: palette.border },
            ]}
          >
            <View
              style={[
                styles.itemIcon,
                {
                  backgroundColor: item.isComplete
                    ? `${palette.success}10`
                    : `${palette.muted}10`,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={item.isComplete ? palette.success : palette.muted}
              />
            </View>
            <View style={styles.itemContent}>
              <ThemedText
                style={[
                  styles.itemLabel,
                  !item.isComplete && { color: palette.muted },
                ]}
              >
                {item.label}
              </ThemedText>
              <ThemedText style={[styles.itemDescription, { color: palette.muted }]}>
                {item.description}
              </ThemedText>
            </View>
            <Ionicons
              name={item.isComplete ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={item.isComplete ? palette.success : palette.error}
            />
          </View>
        ))}
      </View>

      {!isAllComplete && onPressIncomplete && (
        <Clickable
          onPress={onPressIncomplete}
          style={[styles.actionButton, { borderColor: palette.warning }]}
        >
          <Ionicons name="alert" size={16} color={palette.warning} />
          <ThemedText style={[styles.actionText, { color: palette.warning }]}>
            Request Missing Information
          </ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

/**
 * Compact safety status indicator for lists
 */
export function SafetyStatusIndicator({
  hasEmergencyContact,
  hasEmergencyConsent,
  onPress,
}: {
  hasEmergencyContact: boolean;
  hasEmergencyConsent: boolean;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isComplete = hasEmergencyContact && hasEmergencyConsent;

  const content = (
    <View
      style={[
        styles.statusIndicator,
        {
          backgroundColor: isComplete
            ? `${palette.success}10`
            : `${palette.warning}10`,
        },
      ]}
    >
      <Ionicons
        name={isComplete ? 'shield-checkmark' : 'warning'}
        size={14}
        color={isComplete ? palette.success : palette.warning}
      />
      <ThemedText
        style={[
          styles.statusText,
          { color: isComplete ? palette.success : palette.warning },
        ]}
      >
        {isComplete ? 'Safety OK' : 'Incomplete'}
      </ThemedText>
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

/**
 * Session safety summary for multiple athletes
 */
export function SessionSafetySummary({
  totalAthletes,
  athletesWithAlerts,
  missingInfoCount,
  onPress,
}: {
  totalAthletes: number;
  athletesWithAlerts: number;
  missingInfoCount: number;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const hasMissingInfo = missingInfoCount > 0;

  const content = (
    <View style={[styles.summaryCard, { borderColor: palette.border }]}>
      <View style={styles.summaryHeader}>
        <Ionicons name="shield" size={18} color={palette.tint} />
        <ThemedText type="defaultSemiBold">Session Safety</ThemedText>
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.summaryStat}>
          <ThemedText style={styles.summaryStatValue}>{totalAthletes}</ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            Athletes
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryStat}>
          <ThemedText
            style={[
              styles.summaryStatValue,
              athletesWithAlerts > 0 && { color: palette.warning },
            ]}
          >
            {athletesWithAlerts}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            With Alerts
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryStat}>
          <ThemedText
            style={[
              styles.summaryStatValue,
              hasMissingInfo && { color: palette.error },
            ]}
          >
            {missingInfoCount}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            Missing Info
          </ThemedText>
        </View>
      </View>

      {hasMissingInfo && (
        <View style={[styles.summaryWarning, { backgroundColor: `${palette.error}08` }]}>
          <Ionicons name="warning" size={14} color={palette.error} />
          <ThemedText style={[styles.summaryWarningText, { color: palette.error }]}>
            {missingInfoCount} athlete{missingInfoCount !== 1 ? 's' : ''} missing emergency contact
          </ThemedText>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Status indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Summary card
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  summaryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  summaryWarningText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
