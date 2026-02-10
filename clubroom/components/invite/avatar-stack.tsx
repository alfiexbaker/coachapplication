/**
 * Avatar Stack
 *
 * Overlapping row of attendee avatars with a going count label.
 * Used on invite cards and detail screens to show social proof.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface Attendee {
  id: string;
  name: string;
  photoUrl?: string;
}

interface AvatarStackProps {
  attendees: Attendee[];
  goingCount: number;
  maxVisible?: number;
  onPress?: () => void;
}

const AVATAR_SIZE = 28;
const BORDER_WIDTH = 2;

function AvatarStackComponent({
  attendees,
  goingCount,
  maxVisible = 4,
  onPress,
}: AvatarStackProps) {
  const { colors: palette } = useTheme();

  if (goingCount === 0) return null;

  const visible = attendees.slice(0, maxVisible);
  const overflow = goingCount - maxVisible;

  const content = (
    <Row style={styles.row}>
      <Row style={styles.avatarRow}>
        {visible.map((attendee, index) => (
          <View
            key={attendee.id}
            style={[
              styles.avatarWrap,
              {
                marginLeft: index === 0 ? 0 : -Spacing.xs,
                borderColor: palette.surface,
                zIndex: maxVisible - index,
              },
            ]}
          >
            {attendee.photoUrl ? (
              <Image
                source={{ uri: attendee.photoUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.initialsAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <ThemedText style={[styles.initialsText, { color: palette.tint }]}>
                  {attendee.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
          </View>
        ))}
        {overflow > 0 && (
          <View
            style={[
              styles.avatarWrap,
              styles.overflowBadge,
              {
                marginLeft: -Spacing.xs,
                borderColor: palette.surface,
                backgroundColor: withAlpha(palette.muted, 0.15),
              },
            ]}
          >
            <ThemedText style={[styles.overflowText, { color: palette.muted }]}>
              +{overflow}
            </ThemedText>
          </View>
        )}
      </Row>
      <ThemedText style={[styles.goingText, { color: palette.muted }]}>
        {goingCount} going
      </ThemedText>
    </Row>
  );

  if (onPress) {
    return (
      <Clickable onPress={onPress} hitSlop={8} accessibilityLabel={`${goingCount} going, tap to see attendees`}>
        {content}
      </Clickable>
    );
  }

  return content;
}

export const AvatarStack = memo(AvatarStackComponent);

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatarRow: {
    alignItems: 'center',
  },
  avatarWrap: {
    width: AVATAR_SIZE + BORDER_WIDTH * 2,
    height: AVATAR_SIZE + BORDER_WIDTH * 2,
    borderRadius: Radii.full,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: Radii.full,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  overflowBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  goingText: {
    ...Typography.smallSemiBold,
  },
});
