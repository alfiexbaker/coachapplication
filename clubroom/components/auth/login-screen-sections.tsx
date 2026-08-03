import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

/* ---------- DemoRoleEntryCard ---------- */

export interface DemoRoleEntryCardProps {
  entry: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    username: string;
    password: string;
    roleLabel: string;
  };
  palette: ThemeColors;
  onPress: () => void;
}

export const DemoRoleEntryCard = function DemoRoleEntryCard({
  entry,
  palette,
  onPress,
}: DemoRoleEntryCardProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.roleEntryCard,
        {
          backgroundColor: withAlpha(palette.tint, 0.05),
          borderColor: withAlpha(palette.tint, 0.16),
        },
      ]}
    >
      <Row style={styles.roleEntryHeader}>
        <View style={[styles.roleBadge, { backgroundColor: withAlpha(palette.tint, 0.16) }]}>
          <ThemedText style={[styles.roleBadgeText, { color: palette.tint }]}>
            {entry.roleLabel}
          </ThemedText>
        </View>
        <Ionicons name="arrow-forward-circle-outline" size={20} color={palette.tint} />
      </Row>
      <View style={styles.roleEntryCopy}>
        <ThemedText style={styles.actionTitle}>{entry.title}</ThemedText>
        <ThemedText style={[styles.actionSubtitle, { color: palette.muted }]}>
          {entry.subtitle}
        </ThemedText>
        <ThemedText style={[styles.roleEntryBody, { color: palette.muted }]}>
          {entry.description}
        </ThemedText>
      </View>
    </Clickable>
  );
};

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionSubtitle: {
    ...Typography.small,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  roleBadgeText: { ...Typography.caption, textTransform: 'uppercase' },
  roleEntryCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  roleEntryHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleEntryCopy: {
    gap: Spacing.xxs,
  },
  roleEntryBody: {
    ...Typography.small,
  },
});
