import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { InviteRsvpResponse } from '@/constants/types';

// ─── AttendeeRow ────────────────────────────────────────────────

export interface AttendeeRowProps {
  response: InviteRsvpResponse;
}

export const AttendeeRow = memo(function AttendeeRow({ response }: AttendeeRowProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.attendeeRow}>
      {response.userPhotoUrl ? (
        <Image source={{ uri: response.userPhotoUrl }} style={styles.attendeeAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.attendeeAvatar, styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarInitial, { color: palette.tint }]}>
            {response.userName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}
      <View style={styles.attendeeInfo}>
        <ThemedText style={styles.attendeeName}>{response.userName}</ThemedText>
        {response.childName && (
          <ThemedText style={[styles.childName, { color: palette.muted }]}>
            for {response.childName}
          </ThemedText>
        )}
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...Typography.caption, fontWeight: '600' },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: { ...Typography.bodySmall },
  childName: { ...Typography.caption },
});
