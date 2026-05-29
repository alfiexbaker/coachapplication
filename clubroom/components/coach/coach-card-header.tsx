/**
 * CoachCardHeader Component
 *
 * Displays the coach's profile photo, name, verification badge, and trial badge.
 * Used by all CoachCard variants for consistent header display.
 */

import { StyleSheet, View } from 'react-native';
import { SafeImage } from '@/components/primitives/safe-image';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export { CoachAvatar } from './coach-avatar';
export type { CoachAvatarProps } from './coach-avatar';
export { CoachNameRow } from './coach-name-row';
export type { CoachNameRowProps } from './coach-name-row';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardHeaderProps {
  /** Coach's full name */
  fullName: string;
  /** URL to coach's profile photo */
  profilePhotoUrl?: string;
  /** Whether the coach is verified */
  verified?: boolean;
  /** Whether trial sessions are available */
  trialAvailable?: boolean;
  /** Size variant for the avatar */
  avatarSize?: 'md' | 'lg';
  /** Whether to show the name inline with avatar (compact) or below */
  layout?: 'inline' | 'stacked';
  /** Additional content to render after the name (e.g., favourite button) */
  rightContent?: React.ReactNode;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function CoachCardHeader({
  fullName,
  profilePhotoUrl,
  verified = false,
  trialAvailable = false,
  avatarSize = 'lg',
  layout = 'inline',
  rightContent,
}: CoachCardHeaderProps) {
  const { colors: palette } = useTheme();

  const avatarDimension = avatarSize === 'lg' ? Components.avatar.lg : Components.avatar.md;

  return (
    <Row style={layout === 'inline' ? styles.inlineContainer : styles.stackedContainer}>
      {/* Avatar with optional trial badge */}
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

      {/* Name and verification */}
      {layout === 'inline' && (
        <View style={styles.nameContainer}>
          <Row style={styles.nameRow}>
            <ThemedText style={[styles.coachName, { color: palette.text }]} numberOfLines={1}>
              {fullName}
            </ThemedText>
            {verified && (
              <Ionicons name="checkmark-circle" size={Components.icon.md} color={palette.tint} />
            )}
          </Row>
        </View>
      )}

      {/* Right content (e.g., favourite button) */}
      {rightContent}
    </Row>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  inlineContainer: {
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  stackedContainer: {
    gap: Spacing.xs,
  },
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
  nameContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  nameRow: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    flex: 1,
  },
  coachName: {
    ...Typography.heading,
    flexShrink: 1,
  },
});

export default CoachCardHeader;
