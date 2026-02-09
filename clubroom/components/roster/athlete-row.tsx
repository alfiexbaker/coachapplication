import { useRef } from 'react';
import { View, StyleSheet, Image, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface AthleteRowProps {
  entry: RosterEntry;
  onPress?: () => void;
  onRemove?: () => void;
  onLongPress?: () => void;
  swipeEnabled?: boolean;
}

export function AthleteRow({
  entry,
  onPress,
  onRemove,
  onLongPress,
  swipeEnabled = true,
}: AthleteRowProps) {
  const { colors: palette } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const statusColor = rosterService.getStatusColor(entry.status);

  const handleRemovePress = () => {
    swipeableRef.current?.close();
    onRemove?.();
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeAction, { opacity }]}>
        <Pressable
          onPress={handleRemovePress}
          style={[styles.removeButton, { backgroundColor: palette.error }]}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name="trash-outline" size={22} color={palette.onPrimary} />
            <ThemedText style={[styles.removeText, { color: palette.onPrimary }]}>Remove</ThemedText>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  };

  const content = (
    <SurfaceCard
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={styles.main}>
        {/* Avatar */}
        {entry.athletePhotoUrl ? (
          <Image source={{ uri: entry.athletePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.avatarText}>
              {entry.athleteName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
              {entry.athleteName}
            </ThemedText>
            {entry.senInfo?.hasSen && (
              <Ionicons name="accessibility-outline" size={14} color={palette.tint} />
            )}
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <ThemedText style={[styles.parentName, { color: palette.muted }]}>
            {entry.parentName} | {entry.athleteAge} yrs
          </ThemedText>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {entry.totalSessions} sessions
              </ThemedText>
            </View>
            {entry.primaryFocus && (
              <View style={[styles.focusBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <ThemedText style={[styles.focusText, { color: palette.tint }]}>
                  {entry.primaryFocus}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </View>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <View style={[styles.tagsSection, { borderTopColor: palette.border }]}>
          {entry.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}>
              <ThemedText style={[styles.tagText, { color: palette.muted }]}>{tag}</ThemedText>
            </View>
          ))}
          {entry.tags.length > 4 && (
            <View style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}>
              <ThemedText style={[styles.tagText, { color: palette.muted }]}>
                +{entry.tags.length - 4}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </SurfaceCard>
  );

  if (!swipeEnabled || !onRemove) {
    return content;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      {content}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: 0,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.subheading },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  parentName: { ...Typography.caption, marginTop: Spacing.micro },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
  },
  metaText: { ...Typography.caption },
  focusBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  focusText: { ...Typography.micro },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tagText: { ...Typography.micro },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: Spacing.sm,
  },
  removeButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  removeText: { ...Typography.caption,
    marginTop: Spacing.xxs },
});
