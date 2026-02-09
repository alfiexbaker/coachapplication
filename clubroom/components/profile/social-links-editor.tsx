import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { SocialLinks as SocialLinksType, SocialPlatform } from '@/constants/types';
import { SOCIAL_PLATFORMS } from './social-links';
import { useTheme } from '@/hooks/useTheme';

type SocialLinksEditorProps = {
  socialLinks: SocialLinksType;
  onChange: (socialLinks: SocialLinksType) => void;
};

const PLATFORM_ORDER: SocialPlatform[] = [
  'instagram',
  'twitter',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'website',
];

const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  instagram: '@coachsarah or full URL',
  twitter: '@coachsarah or full URL',
  facebook: 'profile username or full URL',
  linkedin: 'profile username or full URL',
  youtube: '@channelname or full URL',
  tiktok: '@username or full URL',
  website: 'https://yourwebsite.com',
};

export function SocialLinksEditor({ socialLinks, onChange }: SocialLinksEditorProps) {
  const { colors: palette } = useTheme();

  const handleChange = (platform: SocialPlatform, value: string) => {
    onChange({
      ...socialLinks,
      [platform]: value,
    });
  };

  const clearField = (platform: SocialPlatform) => {
    const newLinks = { ...socialLinks };
    delete newLinks[platform];
    onChange(newLinks);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Social Media Links</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Help parents find and connect with you on social media
        </ThemedText>
      </View>

      <View style={styles.fieldsContainer}>
        {PLATFORM_ORDER.map((platform) => {
          const config = SOCIAL_PLATFORMS[platform];
          const value = socialLinks[platform] || '';
          const hasValue = value.trim() !== '';

          return (
            <View key={platform} style={styles.fieldRow}>
              <View style={[styles.iconContainer, { backgroundColor: withAlpha(config.color, 0.09) }]}>
                <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={20} color={config.color} />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={[styles.label, { color: palette.foreground }]}>
                  {config.label}
                </ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: hasValue ? config.color : palette.border,
                      backgroundColor: palette.card,
                    },
                  ]}>
                  <TextInput
                    value={value}
                    onChangeText={(text) => handleChange(platform, text)}
                    placeholder={PLATFORM_PLACEHOLDERS[platform]}
                    placeholderTextColor={palette.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={platform === 'website' ? 'url' : 'default'}
                    style={[styles.input, { color: palette.foreground }]}
                  />
                  {hasValue && (
                    <Pressable
                      onPress={() => clearField(platform)}
                      style={styles.clearButton}
                      hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={palette.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.infoBox, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) }]}>
        <Ionicons name="information-circle" size={18} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          You can enter either your username/handle or the full URL to your profile. Links will be shown on your public profile.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs / 2,
  },
  subtitle: { ...Typography.bodySmall, lineHeight: 20 },
  fieldsContainer: {
    gap: Spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Align with input field
  },
  inputContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  label: { ...Typography.smallSemiBold },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
  },
  input: { ...Typography.body, flex: 1,
    paddingVertical: Spacing.sm },
  clearButton: {
    padding: Spacing.xxs,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  infoText: { ...Typography.small, flex: 1,
    lineHeight: 18 },
});
