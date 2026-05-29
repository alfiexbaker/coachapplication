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
  instagram: 'e.g., https://instagram.com/yourhandle',
  twitter: 'e.g., https://twitter.com/yourhandle',
  facebook: 'e.g., https://facebook.com/yourpage',
  linkedin: 'e.g., https://linkedin.com/in/yourname',
  youtube: 'e.g., https://youtube.com/@yourchannel',
  tiktok: 'e.g., https://tiktok.com/@yourname',
  website: 'https://yourwebsite.com',
};

const PLATFORM_DOMAINS: Partial<Record<SocialPlatform, string[]>> = {
  instagram: ['instagram.com'],
  twitter: ['twitter.com', 'x.com'],
  facebook: ['facebook.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
};

function normalizeUrlInput(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (platform !== 'website' && value.startsWith('@')) {
    const handle = value.slice(1);
    const domain = PLATFORM_DOMAINS[platform]?.[0];
    return domain ? `https://${domain}/${handle}` : value;
  }
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function validateSocialLink(platform: SocialPlatform, raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const normalized = normalizeUrlInput(platform, value);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return 'Enter a valid URL';
  }
  if (!/^https?:$/.test(parsed.protocol)) return 'Enter a valid URL';
  const domains = PLATFORM_DOMAINS[platform];
  if (domains && !domains.some((domain) => parsed.hostname.toLowerCase().includes(domain))) {
    return `Must be a ${SOCIAL_PLATFORMS[platform].label} URL`;
  }
  return null;
}

export function SocialLinksEditor({ socialLinks, onChange }: SocialLinksEditorProps) {
  const { colors: palette } = useTheme();
  const errors = (() => {
    const next: Partial<Record<SocialPlatform, string | null>> = {};
    for (const platform of PLATFORM_ORDER) {
      next[platform] = validateSocialLink(platform, socialLinks[platform] || '');
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
    const normalized = normalizeUrlInput(platform, current);
    if (normalized && normalized !== current) {
      onChange({ ...socialLinks, [platform]: normalized });
    }
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
                    keyboardType={platform === 'website' ? 'url' : 'default'}
                    style={[styles.input, { color: palette.foreground }]}
                  />
                  {hasValue && (
                    <Clickable
                      onPress={() => clearField(platform)}
                      style={styles.clearButton}
                      hitSlop={8}
                    >
                      <Ionicons name="close-circle" size={18} color={palette.muted} />
                    </Clickable>
                  )}
                </Row>
                <ThemedText style={[styles.helperText, { color: error ? palette.error : palette.muted }]}>
                  {error ?? PLATFORM_PLACEHOLDERS[platform]}
                </ThemedText>
              </View>
            </Row>
          );
        })}
      </View>

      <Row
        align="start"
        gap="xs"
        style={[
          styles.infoBox,
          {
            backgroundColor: withAlpha(palette.tint, 0.06),
            borderColor: withAlpha(palette.tint, 0.19),
          },
        ]}
      >
        <Ionicons name="information-circle" size={18} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          You can enter either your username/handle or the full URL to your profile. Links will be
          shown on your public profile.
        </ThemedText>
      </Row>
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
  subtitle: { ...Typography.bodySmall },
  fieldsContainer: {
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
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
    paddingHorizontal: Spacing.sm,
  },
  input: { ...Typography.body, flex: 1, paddingVertical: Spacing.sm },
  clearButton: {
    padding: Spacing.xxs,
  },
  helperText: {
    ...Typography.caption,
  },
  infoBox: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  infoText: { ...Typography.small, flex: 1, lineHeight: Typography.caption.lineHeight },
});
