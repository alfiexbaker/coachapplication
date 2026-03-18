import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParentGroupCard } from '@/components/community/ParentGroupCard';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { ParentGroup } from '@/constants/types';

interface CommunityTabContentProps {
  loading: boolean;
  myGroups: ParentGroup[];
  onCreateGroup: () => void;
  onGroupPress: (group: ParentGroup) => void;
}

const EmptyState = ({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) => {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name={icon} size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{message}</ThemedText>
      {action && (
        <Button onPress={action.onPress} style={styles.emptyButton}>
          {action.label}
        </Button>
      )}
    </View>
  );
};

export const CommunityTabContent = memo(function CommunityTabContent({
  loading,
  myGroups,
  onCreateGroup,
  onGroupPress,
}: CommunityTabContentProps) {
  const { colors: palette } = useTheme();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
      </View>
    );
  }

  if (myGroups.length === 0) {
    return (
      <EmptyState
        icon="chatbubbles-outline"
        title="No groups yet"
        message="Squad, club, and session groups appear here once you are invited. Create one only when you need a focused coordination thread."
        action={{ label: 'Create Group', onPress: onCreateGroup }}
      />
    );
  }

  return (
    <View style={styles.listContainer}>
      <SurfaceCard style={styles.introCard}>
        <ThemedText type="subtitle">Private coordination groups</ThemedText>
        <ThemedText style={[styles.introText, { color: palette.muted }]}>
          Use groups for squad logistics, session updates, and parent handoffs without turning
          them into a main discovery surface.
        </ThemedText>
      </SurfaceCard>
      {myGroups.map((group) => (
        <ParentGroupCard key={group.id} group={group} onPress={() => onGroupPress(group)} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  listContainer: { padding: Spacing.lg, gap: Spacing.sm },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { textAlign: 'center' },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  emptyButton: { marginTop: Spacing.sm },
  introCard: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  introText: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
  },
});
