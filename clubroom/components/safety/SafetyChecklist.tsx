import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChecklistItem } from './safety-checklist-sections';

// Re-export extracted components for backward compat
export { SafetyStatusIndicator, SessionSafetySummary } from './safety-checklist-sections';

interface SafetyChecklistProps {
  hasEmergencyContact: boolean;
  hasEmergencyConsent: boolean;
  hasMedicalInfo: boolean;
  onPressIncomplete?: () => void;
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
  const { colors: palette } = useTheme();

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

  const completedCount = items.filter((i) => i.isComplete).length;
  const isAllComplete = completedCount === items.length;

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor: isAllComplete
                ? withAlpha(palette.success, 0.09)
                : withAlpha(palette.warning, 0.09),
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
                ? withAlpha(palette.success, 0.09)
                : withAlpha(palette.warning, 0.09),
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
      </Row>

      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <Row
            key={item.key}
            align="center"
            gap="sm"
            style={[
              styles.item,
              index < items.length - 1 ? { borderBottomColor: palette.border } : undefined,
            ]}
          >
            <View
              style={[
                styles.itemIcon,
                {
                  backgroundColor: item.isComplete
                    ? withAlpha(palette.success, 0.06)
                    : withAlpha(palette.muted, 0.06),
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
              <ThemedText style={[styles.itemLabel, !item.isComplete && { color: palette.muted }]}>
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
          </Row>
        ))}
      </View>

      {!isAllComplete && onPressIncomplete && (
        <Clickable
          onPress={onPressIncomplete}
          style={[styles.actionButton, { borderColor: palette.warning }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="alert" size={16} color={palette.warning} />
            <ThemedText style={[styles.actionText, { color: palette.warning }]}>
              Request Missing Information
            </ThemedText>
          </Row>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtext: { ...Typography.caption, marginTop: Spacing.micro },
  progressBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  progressText: { ...Typography.caption },
  itemsList: { gap: 0 },
  item: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: { flex: 1 },
  itemLabel: { ...Typography.bodySmallSemiBold },
  itemDescription: { ...Typography.caption, marginTop: 1 },
  actionButton: {
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
