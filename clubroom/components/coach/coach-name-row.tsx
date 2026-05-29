import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Components, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface CoachNameRowProps {
  fullName: string;
  verified?: boolean;
  rightContent?: ReactNode;
}

export function CoachNameRow({ fullName, verified = false, rightContent }: CoachNameRowProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.nameRowSpaceBetween}>
      <Row style={styles.nameRow}>
        <ThemedText type="subtitle" style={styles.coachNameSubtitle} numberOfLines={1}>
          {fullName}
        </ThemedText>
        {verified && (
          <Ionicons name="checkmark-circle" size={Components.icon.md} color={palette.tint} />
        )}
      </Row>
      {rightContent}
    </Row>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    flex: 1,
  },
  nameRowSpaceBetween: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  coachNameSubtitle: { ...Typography.heading, letterSpacing: -0.2, flex: 1 },
});
