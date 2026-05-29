import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import {
  concernService,
  CONCERN_TYPE_LABELS,
  CONCERN_TYPE_ICONS,
  CONCERN_SEVERITY_LABELS,
  type ConcernType,
  type ConcernSeverity,
} from '@/services/concern-service';
import type { ThemeColors } from '@/hooks/useTheme';

const TYPES: ConcernType[] = [
  'BEHAVIORAL',
  'SAFEGUARDING',
  'MEDICAL',
  'ATTENDANCE',
  'PARENT_COMMUNICATION',
];

const SEVERITIES: ConcernSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

type TypePickerProps = {
  colors: ThemeColors;
  selected: ConcernType | null;
  onSelect: (type: ConcernType) => void;
};

export const ConcernTypePicker = function ConcernTypePicker({
  colors,
  selected,
  onSelect,
}: TypePickerProps) {
  return (
    <Column gap="xs">
      <ThemedText type="defaultSemiBold">Category</ThemedText>
      <Column gap="xs">
        {TYPES.map((type) => {
          const isSelected = selected === type;
          return (
            <Clickable
              key={type}
              onPress={() => onSelect(type)}
              style={[
                styles.typeOption,
                {
                  backgroundColor: isSelected
                    ? withAlpha(colors.tint, 0.09)
                    : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.tint : 'transparent',
                },
              ]}
              accessibilityLabel={CONCERN_TYPE_LABELS[type]}
            >
              <Row align="center" gap="sm">
                <View
                  style={[
                    styles.typeIcon,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(colors.tint, 0.15)
                        : withAlpha(colors.muted, 0.09),
                    },
                  ]}
                >
                  <Ionicons
                    name={CONCERN_TYPE_ICONS[type] as 'alert-circle'}
                    size={20}
                    color={isSelected ? colors.tint : colors.muted}
                  />
                </View>
                <ThemedText
                  style={[styles.typeLabel, { color: isSelected ? colors.tint : colors.text }]}
                >
                  {CONCERN_TYPE_LABELS[type]}
                </ThemedText>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                ) : null}
              </Row>
            </Clickable>
          );
        })}
      </Column>
    </Column>
  );
};

type SeverityPickerProps = {
  colors: ThemeColors;
  selected: ConcernSeverity;
  onSelect: (severity: ConcernSeverity) => void;
};

export const SeverityPicker = function SeverityPicker({
  colors,
  selected,
  onSelect,
}: SeverityPickerProps) {
  return (
    <Column gap="xs">
      <ThemedText type="defaultSemiBold">Severity</ThemedText>
      <Row gap="xs">
        {SEVERITIES.map((severity) => {
          const isSelected = selected === severity;
          const color = concernService.getSeverityColor(severity);
          return (
            <Clickable
              key={severity}
              onPress={() => onSelect(severity)}
              style={[
                styles.severityChip,
                {
                  backgroundColor: isSelected ? withAlpha(color, 0.12) : colors.surfaceSecondary,
                  borderColor: isSelected ? color : 'transparent',
                },
              ]}
              accessibilityLabel={`Severity: ${CONCERN_SEVERITY_LABELS[severity]}`}
            >
              <Row align="center" justify="center" gap="xxs">
                <View style={[styles.severityDot, { backgroundColor: color }]} />
                <ThemedText
                  style={[styles.severityText, { color: isSelected ? color : colors.muted }]}
                >
                  {CONCERN_SEVERITY_LABELS[severity]}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
  typeOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...Typography.bodySemiBold,
    flex: 1,
  },
  severityChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    minHeight: 44,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  severityText: {
    ...Typography.smallSemiBold,
  },
});
