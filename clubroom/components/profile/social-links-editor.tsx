import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { SocialLinks as SocialLinksType, SocialPlatform } from '@/constants/types';
import { SOCIAL_PLATFORMS } from './social-links';
import { useTheme } from '@/hooks/useTheme';
import {
  normalizeSocialLinkInput,
  validateSocialLinkInput,
} from '@/packages/shared-contracts/src/common/social-links';

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
];

const PLATFORM_PLACEHOLDERS: Record<SocialPlatform, string> = {
  instagram: 'instagram.com/yourname',
  twitter: 'x.com/yourname',
  facebook: 'facebook.com/yourpage',
  linkedin: 'linkedin.com/in/yourname',
  youtube: 'youtube.com/@yourchannel',
  tiktok: 'tiktok.com/@yourname',
  website: 'https://yourwebsite.com',
};

export function SocialLinksEditor({ socialLinks, onChange }: SocialLinksEditorProps) {
  const { colors: palette } = useTheme();
  const errors = (() => {
    const next: Partial<Record<SocialPlatform, string | null>> = {};
    for (const platform of PLATFORM_ORDER) {
      next[platform] = validateSocialLinkInput(platform, socialLinks[platform]);
    }
    return next;
  })();

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

  const handleBlur = (platform: SocialPlatform) => {
    const current = socialLinks[platform] || '';
    const normalized = normalizeSocialLinkInput(platform, current);
    if (normalized && normalized !== current) {
      onChange({ ...socialLinks, [platform]: normalized });
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">Social links</ThemedText>

      <View style={styles.fieldsContainer}>
        {PLATFORM_ORDER.map((platform) => {
          const config = SOCIAL_PLATFORMS[platform];
          const value = socialLinks[platform] || '';
          const hasValue = value.trim() !== '';
          const error = errors[platform];

          return (
            <Row key={platform} align="start" gap="sm">
              <View
                style={[styles.iconContainer, { backgroundColor: withAlpha(config.color, 0.09) }]}
              >
                <Ionicons
                  name={config.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={config.color}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={[styles.label, { color: palette.foreground }]}>
                  {config.label}
                </ThemedText>
                <Row
                  align="center"
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: error ? palette.error : hasValue ? config.color : palette.border,
                      backgroundColor: palette.card,
                    },
                  ]}
                >
                  <TextInput
                    value={value}
                    onChangeText={(text) => handleChange(platform, text)}
                    onBlur={() => handleBlur(platform)}
                    placeholder={PLATFORM_PLACEHOLDERS[platform]}
                    placeholderTextColor={palette.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={[styles.input, { color: palette.foreground }]}
                    accessibilityLabel={config.label}
                    maxLength={300}
                  />
                  {hasValue && (
                    <Clickable
                      onPress={() => clearField(platform)}
                      style={styles.clearButton}
                      hitSlop={8}
                      accessibilityLabel={`Clear ${config.label}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle" size={18} color={palette.muted} />
                    </Clickable>
                  )}
                </Row>
                {error ? (
                  <ThemedText
                    style={[styles.helperText, { color: palette.error }]}
                    accessibilityRole="alert"
                  >
                    {error}
                  </ThemedText>
                ) : null}
              </View>
            </Row>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  fieldsContainer: {
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md, // Align with input field
  },
  inputContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  label: { ...Typography.smallSemiBold },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
  },
  input: { ...Typography.body, flex: 1, paddingVertical: Spacing.sm },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    ...Typography.caption,
  },
});
