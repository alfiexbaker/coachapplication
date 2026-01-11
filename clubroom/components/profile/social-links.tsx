import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { SocialLinks as SocialLinksType, SocialPlatform } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SocialLinkConfig {
  icon: string;
  color: string;
  label: string;
  getUrl: (value: string) => string;
}

const SOCIAL_PLATFORMS: Record<SocialPlatform, SocialLinkConfig> = {
  instagram: {
    icon: 'logo-instagram',
    color: '#E4405F',
    label: 'Instagram',
    getUrl: (value) => value.startsWith('http') ? value : `https://instagram.com/${value.replace('@', '')}`,
  },
  twitter: {
    icon: 'logo-twitter',
    color: '#1DA1F2',
    label: 'X / Twitter',
    getUrl: (value) => value.startsWith('http') ? value : `https://x.com/${value.replace('@', '')}`,
  },
  facebook: {
    icon: 'logo-facebook',
    color: '#1877F2',
    label: 'Facebook',
    getUrl: (value) => value.startsWith('http') ? value : `https://facebook.com/${value}`,
  },
  linkedin: {
    icon: 'logo-linkedin',
    color: '#0A66C2',
    label: 'LinkedIn',
    getUrl: (value) => value.startsWith('http') ? value : `https://linkedin.com/in/${value}`,
  },
  youtube: {
    icon: 'logo-youtube',
    color: '#FF0000',
    label: 'YouTube',
    getUrl: (value) => value.startsWith('http') ? value : `https://youtube.com/@${value.replace('@', '')}`,
  },
  tiktok: {
    icon: 'logo-tiktok',
    color: '#000000',
    label: 'TikTok',
    getUrl: (value) => value.startsWith('http') ? value : `https://tiktok.com/@${value.replace('@', '')}`,
  },
  website: {
    icon: 'globe-outline',
    color: '#6366F1',
    label: 'Website',
    getUrl: (value) => value.startsWith('http') ? value : `https://${value}`,
  },
};

type SocialLinksProps = {
  socialLinks?: SocialLinksType;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icons' | 'list';
};

export function SocialLinks({
  socialLinks,
  showLabels = false,
  size = 'md',
  variant = 'icons',
}: SocialLinksProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (!socialLinks) return null;

  const activePlatforms = (Object.entries(socialLinks) as [SocialPlatform, string | undefined][])
    .filter(([, value]) => value && value.trim() !== '');

  if (activePlatforms.length === 0) return null;

  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const buttonSize = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;

  const handlePress = async (platform: SocialPlatform, value: string) => {
    const config = SOCIAL_PLATFORMS[platform];
    const url = config.getUrl(value);

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to open social link:', error);
    }
  };

  if (variant === 'list') {
    return (
      <View style={styles.listContainer}>
        {activePlatforms.map(([platform, value]) => {
          const config = SOCIAL_PLATFORMS[platform];
          return (
            <Pressable
              key={platform}
              style={({ pressed }) => [
                styles.listItem,
                {
                  backgroundColor: pressed ? palette.overlay : palette.surface,
                  borderColor: palette.border,
                },
              ]}
              onPress={() => handlePress(platform, value!)}>
              <View style={[styles.listIconContainer, { backgroundColor: `${config.color}15` }]}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
              </View>
              <View style={styles.listContent}>
                <ThemedText type="defaultSemiBold" style={styles.listLabel}>
                  {config.label}
                </ThemedText>
                <ThemedText style={[styles.listValue, { color: palette.muted }]} numberOfLines={1}>
                  {value}
                </ThemedText>
              </View>
              <Ionicons name="open-outline" size={16} color={palette.muted} />
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.iconsContainer}>
      {activePlatforms.map(([platform, value]) => {
        const config = SOCIAL_PLATFORMS[platform];
        return (
          <Pressable
            key={platform}
            style={({ pressed }) => [
              styles.iconButton,
              {
                width: buttonSize,
                height: buttonSize,
                backgroundColor: pressed ? `${config.color}25` : `${config.color}15`,
              },
            ]}
            onPress={() => handlePress(platform, value!)}>
            <Ionicons name={config.icon as any} size={iconSize} color={config.color} />
            {showLabels && (
              <ThemedText style={[styles.iconLabel, { color: config.color }]}>
                {config.label}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// Export the platform config for reuse
export { SOCIAL_PLATFORMS };
export type { SocialLinkConfig };

const styles = StyleSheet.create({
  iconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  iconButton: {
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  listContainer: {
    gap: Spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  listIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    gap: 2,
  },
  listLabel: {
    fontSize: 14,
  },
  listValue: {
    fontSize: 12,
  },
});
