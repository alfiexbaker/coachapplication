/**
 * Extracted sub-components for ShareProfile.
 *
 * ShareUrlBox — profile URL display row.
 * ShareActionRow — copy link / share via action row.
 * ShareQrSection — QR code placeholder.
 * ShareSlugEditor — editable custom URL slug.
 */

import React, { memo } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './share-profile-styles';

// ─── ShareUrlBox ─────────────────────────────────────────────────────────────

interface ShareUrlBoxProps {
  url: string;
  palette: ThemeColors;
}

export const ShareUrlBox = memo(function ShareUrlBox({ url, palette }: ShareUrlBoxProps) {
  return (
    <Row style={[styles.urlBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Ionicons name="link-outline" size={Components.icon.md} color={palette.muted} />
      <ThemedText
        style={[Typography.body, { color: palette.text, flex: 1 }]}
        numberOfLines={1}
      >
        {url}
      </ThemedText>
    </Row>
  );
});

// ─── ShareActionRow ──────────────────────────────────────────────────────────

interface ShareActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
  titleColor?: string;
  showChevron?: boolean;
  palette: ThemeColors;
  bgOverride?: string;
}

export const ShareActionRow = memo(function ShareActionRow({
  icon,
  title,
  subtitle,
  onPress,
  iconColor,
  iconBg,
  titleColor,
  showChevron = false,
  palette,
  bgOverride,
}: ShareActionRowProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[styles.actionRow, { backgroundColor: bgOverride ?? palette.background }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg ?? withAlpha(palette.tint, 0.07) }]}>
        <Ionicons name={icon} size={Components.icon.md} color={iconColor ?? palette.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[Typography.bodySemiBold, { color: titleColor ?? palette.text }]}>
          {title}
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {subtitle}
        </ThemedText>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.muted} />
      )}
    </Clickable>
  );
});

// ─── ShareQrSection ──────────────────────────────────────────────────────────

interface ShareQrSectionProps {
  url: string;
  palette: ThemeColors;
}

export const ShareQrSection = memo(function ShareQrSection({ url, palette }: ShareQrSectionProps) {
  return (
    <View style={styles.qrSection}>
      <ThemedText style={[Typography.heading, { color: palette.text, marginBottom: Spacing.sm }]}>
        QR Code
      </ThemedText>
      <View style={[styles.qrPlaceholder, { borderColor: palette.border }]}>
        <Ionicons name="qr-code-outline" size={48} color={palette.muted} />
        <ThemedText
          style={[Typography.small, { color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }]}
        >
          {url}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>
          Scan to view profile
        </ThemedText>
      </View>
    </View>
  );
});

// ─── ShareSlugEditor ─────────────────────────────────────────────────────────

interface ShareSlugEditorProps {
  slug: string;
  editing: boolean;
  onChangeSlug: (text: string) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onCancel: () => void;
  palette: ThemeColors;
}

export const ShareSlugEditor = memo(function ShareSlugEditor({
  slug,
  editing,
  onChangeSlug,
  onStartEditing,
  onSave,
  onCancel,
  palette,
}: ShareSlugEditorProps) {
  return (
    <View style={styles.slugSection}>
      <ThemedText style={[Typography.heading, { color: palette.text }]}>
        Custom URL Slug
      </ThemedText>
      <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.xs / 2, marginBottom: Spacing.sm }]}>
        Personalise your profile URL for easier sharing
      </ThemedText>
      <Row style={styles.slugInputRow}>
        <ThemedText style={[Typography.body, { color: palette.muted }]}>
          clubroom.app/coach/
        </ThemedText>
        {editing ? (
          <TextInput
            style={[
              styles.slugInput,
              { borderColor: palette.tint, color: palette.text },
            ]}
            value={slug}
            onChangeText={onChangeSlug}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your-slug"
            placeholderTextColor={palette.muted}
          />
        ) : (
          <Clickable
            onPress={onStartEditing}
            style={[styles.slugDisplay, { borderColor: palette.border }]}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
              {slug}
            </ThemedText>
            <Ionicons name="pencil-outline" size={Components.icon.sm} color={palette.muted} />
          </Clickable>
        )}
      </Row>
      {editing && (
        <Row style={styles.slugActions}>
          <Clickable
            onPress={onCancel}
            style={[styles.slugCancelBtn, { borderColor: palette.border }]}
          >
            <ThemedText style={[Typography.small, { color: palette.muted }]}>Cancel</ThemedText>
          </Clickable>
          <Clickable
            onPress={onSave}
            style={[styles.slugSaveBtn, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={[Typography.small, { color: palette.surface, fontWeight: '600' }]}>
              Save
            </ThemedText>
          </Clickable>
        </Row>
      )}
    </View>
  );
});
