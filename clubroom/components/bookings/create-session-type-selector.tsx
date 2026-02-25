/**
 * SessionTypeSelector — Session type and recurrence type toggle buttons.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont, scale } from '@/utils/scale';
import type { SessionType, RecurrenceType } from './CreateSessionForm';
import { Row } from '@/components/primitives';

interface SessionTypeSelectorProps {
  sessionType: SessionType;
  onSessionTypeChange: (type: SessionType) => void;
  recurrenceType: RecurrenceType;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
}

function SessionTypeSelectorInner({
  sessionType,
  onSessionTypeChange,
  recurrenceType,
  onRecurrenceTypeChange,
}: SessionTypeSelectorProps) {
  const { colors: palette } = useTheme();

  const renderToggle = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    isActive: boolean,
    onPress: () => void,
  ) => (
    <Clickable
      onPress={onPress}
      accessibilityLabel={label}
      style={[
        styles.button,
        {
          backgroundColor: isActive ? palette.tint : palette.card,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={isActive ? palette.onPrimary : palette.icon} />
      <ThemedText
        style={[
          styles.buttonText,
          isActive ? { color: palette.onPrimary, fontWeight: '700' } : undefined,
        ]}
      >
        {label}
      </ThemedText>
    </Clickable>
  );

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Session Type
      </ThemedText>
      <Row style={styles.row}>
        {renderToggle('1:1 Session', 'person-outline', sessionType === '1on1', () =>
          onSessionTypeChange('1on1'),
        )}
        {renderToggle('Group Session', 'people-outline', sessionType === 'group', () =>
          onSessionTypeChange('group'),
        )}
      </Row>

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Schedule Type
      </ThemedText>
      <Row style={styles.row}>
        {renderToggle('One-time', 'calendar-outline', recurrenceType === 'none', () =>
          onRecurrenceTypeChange('none'),
        )}
        {renderToggle('Weekly Recurring', 'repeat-outline', recurrenceType === 'weekly', () =>
          onRecurrenceTypeChange('weekly'),
        )}
      </Row>
    </View>
  );
}

export const SessionTypeSelector = memo(SessionTypeSelectorInner);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  row: {
    gap: Spacing.xs + Spacing.xxs,
    marginBottom: Spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: scale(18),
    borderRadius: Radii.md,
    borderWidth: 2,
    minHeight: 44,
  },
  buttonText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
