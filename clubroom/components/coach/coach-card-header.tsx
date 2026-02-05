/**
 * CoachCardHeader Component
 *
 * Displays the coach's profile photo, name, verification badge, and trial badge.
 * Used by all CoachCard variants for consistent header display.
 */

import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

type Palette = (typeof Colors)['light'];

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const avatarDimension = avatarSize === 'lg' ? Components.avatar.lg : Components.avatar.md;

  return (
    <View style={layout === 'inline' ? styles.inlineContainer : styles.stackedContainer}>
      {/* Avatar with optional trial badge */}
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: profilePhotoUrl }}
          style={[
            styles.avatar,
            { width: avatarDimension, height: avatarDimension },
          ]}
          contentFit="cover"
        />
        {trialAvailable && (
          <View style={[styles.trialBadge, { backgroundColor: palette.success }]}>
            <ThemedText style={styles.trialText} lightColor={Colors.light.onSuccess} darkColor={Colors.dark.onSuccess}>
              TRIAL
            </ThemedText>
          </View>
        )}
      </View>

      {/* Name and verification */}
      {layout === 'inline' && (
        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <ThemedText
              style={[styles.coachName, { color: palette.text }]}
              numberOfLines={1}
            >
              {fullName}
            </ThemedText>
            {verified && (
              <Ionicons
                name="checkmark-circle"
                size={Components.icon.md}
                color={palette.tint}
              />
            )}
          </View>
        </View>
      )}

      {/* Right content (e.g., favourite button) */}
      {rightContent}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Avatar-only export for use in other layouts
// -----------------------------------------------------------------------------

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const avatarDimension = size === 'lg' ? Components.avatar.lg : Components.avatar.md;

  return (
    <View style={styles.avatarContainer}>
      <Image
        source={{ uri: profilePhotoUrl || 'https://via.placeholder.com/64' }}
        style={[
          styles.avatar,
          { width: avatarDimension, height: avatarDimension },
        ]}
        contentFit="cover"
      />
      {trialAvailable && (
        <View style={[styles.trialBadge, { backgroundColor: palette.success }]}>
          <ThemedText style={styles.trialText} lightColor={Colors.light.onSuccess} darkColor={Colors.dark.onSuccess}>
            TRIAL
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Name row export for flexible composition
// -----------------------------------------------------------------------------

export interface CoachNameRowProps {
  fullName: string;
  verified?: boolean;
  rightContent?: React.ReactNode;
}

export function CoachNameRow({
  fullName,
  verified = false,
  rightContent,
}: CoachNameRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.nameRowSpaceBetween}>
      <View style={styles.nameRow}>
        <ThemedText
          type="subtitle"
          style={styles.coachNameSubtitle}
          numberOfLines={1}
        >
          {fullName}
        </ThemedText>
        {verified && (
          <Ionicons
            name="checkmark-circle"
            size={Components.icon.md}
            color={palette.tint}
          />
        )}
      </View>
      {rightContent}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: 'row',
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
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trialText: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  nameContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    flex: 1,
  },
  nameRowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  coachName: {
    ...Typography.heading,
    flexShrink: 1,
  },
  coachNameSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
});

export default CoachCardHeader;
