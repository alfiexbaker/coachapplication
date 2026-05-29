import { StyleSheet, View } from 'react-native';

import { SafeImage } from '@/components/primitives/safe-image';
import { Components, Radii, Spacing, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

export interface CoachAvatarProps {
  profilePhotoUrl?: string;
  trialAvailable?: boolean;
  size?: 'md' | 'lg';
}

export function CoachAvatar({
  profilePhotoUrl,
  trialAvailable = false,
  size = 'lg',
}: CoachAvatarProps) {
  const { colors: palette } = useTheme();

  const avatarDimension = size === 'lg' ? Components.avatar.lg : Components.avatar.md;

  return (
    <View style={styles.avatarContainer}>
      <SafeImage
        source={{ uri: profilePhotoUrl }}
        fallbackIcon="person-circle-outline"
        fallbackIconSize={avatarDimension * 0.5}
        style={[styles.avatar, { width: avatarDimension, height: avatarDimension }]}
        contentFit="cover"
      />
      {trialAvailable && (
        <View style={[styles.trialBadge, { backgroundColor: palette.success }]}>
          <ThemedText style={[styles.trialText, { color: palette.onSuccess }]}>TRIAL</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderRadius: Radii.md,
  },
  trialBadge: {
    position: 'absolute',
    bottom: -Spacing.xs / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trialText: {
    ...Typography.micro,
    fontSize: Typography.micro.fontSize,
    letterSpacing: 0.8,
  },
});
