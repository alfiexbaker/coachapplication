import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotationType } from '@/constants/types';
import { ANNOTATION_TYPES } from './video-annotation-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuickAnnotationBarProps {
  onAdd: (type: VideoAnnotationType) => void;
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const QuickAnnotationBar = memo(function QuickAnnotationBar({
  onAdd,
  disabled = false,
}: QuickAnnotationBarProps) {
  const { colors: palette } = useTheme();

  return (
    <Row align="center" gap="sm" style={styles.quickBar}>
      <ThemedText style={[styles.quickBarLabel, { color: palette.muted }]}>Quick Add:</ThemedText>
      <Row gap="xs">
        {ANNOTATION_TYPES.map((type) => (
          <Clickable
            key={type.type}
            onPress={() => onAdd(type.type)}
            disabled={disabled}
            style={[
              styles.quickButton,
              { backgroundColor: withAlpha(type.color, 0.09), opacity: disabled ? 0.5 : 1 },
            ]}
          >
            <Ionicons name={type.icon as keyof typeof Ionicons.glyphMap} size={16} color={type.color} />
            <ThemedText style={{ color: type.color, ...Typography.caption }}>{type.label}</ThemedText>
          </Clickable>
        ))}
      </Row>
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  quickBar: { paddingVertical: Spacing.sm },
  quickBarLabel: { ...Typography.caption },
  quickButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm },
});
