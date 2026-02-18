/**
 * ScheduleSegmentControl — Sessions | Availability toggle.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Segment } from './schedule-types';

interface Props {
  segment: Segment;
  onSegmentChange: (s: Segment) => void;
}

export const ScheduleSegmentControl = memo(function ScheduleSegmentControl({
  segment,
  onSegmentChange,
}: Props) {
  const { colors } = useTheme();

  const selectSessions = useCallback(() => onSegmentChange('sessions'), [onSegmentChange]);
  const selectAvailability = useCallback(() => onSegmentChange('availability'), [onSegmentChange]);

  return (
    <View style={[styles.container, { paddingHorizontal: Spacing.lg }]}>
      <Row
        style={[styles.control, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Clickable
          onPress={selectSessions}
          accessibilityLabel="Show sessions"
          style={[
            styles.button,
            segment === 'sessions' && { backgroundColor: colors.text },
          ]}
        >
          <ThemedText
            style={[
              styles.text,
              { color: segment === 'sessions' ? colors.onPrimary : colors.muted },
              segment === 'sessions' && styles.activeText,
            ]}
          >
            Sessions
          </ThemedText>
        </Clickable>
        <Clickable
          onPress={selectAvailability}
          accessibilityLabel="Show availability"
          style={[
            styles.button,
            segment === 'availability' && { backgroundColor: colors.text },
          ]}
        >
          <ThemedText
            style={[
              styles.text,
              { color: segment === 'availability' ? colors.onPrimary : colors.muted },
              segment === 'availability' && styles.activeText,
            ]}
          >
            Availability
          </ThemedText>
        </Clickable>
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.sm,
  },
  control: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.micro,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  text: {
    ...Typography.smallSemiBold,
  },
  activeText: {
    fontWeight: '700' as const,
  },
});
