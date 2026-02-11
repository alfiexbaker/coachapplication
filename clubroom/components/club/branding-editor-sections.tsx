import { memo, useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubBranding } from '@/services/club-service';
import { Row } from '@/components/primitives';

// ─── Constants ──────────────────────────────────────────────────────────────

// Decorative: user-selectable brand color presets (not themeable)
export const PRESET_COLORS = [
  '#0F172A',
  '#1D4ED8',
  '#7C3AED',
  '#DC2626',
  '#16A34A',
  '#EA580C',
  '#0891B2',
  '#CA8A04',
] as const;

// ─── ColorPickerRow ─────────────────────────────────────────────────────────

type ColorPickerRowProps = {
  label: string;
  value: string;
  onSelect: (color: string) => void;
  palette: ThemeColors;
};

export const ColorPickerRow = memo(function ColorPickerRow({
  label,
  value,
  onSelect,
  palette,
}: ColorPickerRowProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customHex, setCustomHex] = useState(value);

  const handleCustomSubmit = useCallback(() => {
    const hex = customHex.startsWith('#') ? customHex : `#${customHex}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onSelect(hex);
      setShowCustom(false);
    }
  }, [customHex, onSelect]);

  return (
    <View style={styles.colorSection}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>{label}</ThemedText>
      <Row style={styles.colorRow}>
        {PRESET_COLORS.map((color) => (
          <Clickable
            key={color}
            onPress={() => onSelect(color)}
            accessibilityLabel={`Select color ${color}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: Radii.pill,
              backgroundColor: color,
              borderWidth: value === color ? 3 : 1,
              borderColor: value === color ? palette.foreground : palette.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {value === color ? (
              <Ionicons name="checkmark" size={Components.icon.sm} color={palette.onPrimary} />
            ) : null}
          </Clickable>
        ))}
        <Clickable
          onPress={() => setShowCustom(!showCustom)}
          accessibilityLabel="Custom color"
          style={{
            width: 36,
            height: 36,
            borderRadius: Radii.pill,
            borderWidth: 1,
            borderColor: palette.border,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.surface,
          }}
        >
          <Ionicons name="color-palette-outline" size={Components.icon.sm} color={palette.muted} />
        </Clickable>
      </Row>
      {showCustom && (
        <Row style={styles.customHexRow}>
          <TextInput
            style={[
              styles.customHexInput,
              {
                color: palette.foreground,
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            value={customHex}
            onChangeText={setCustomHex}
            placeholder="#000000"
            placeholderTextColor={palette.muted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
          />
          <Clickable
            onPress={handleCustomSubmit}
            accessibilityLabel="Apply custom color"
            style={{
              height: Components.buttonCompact.height,
              paddingHorizontal: Spacing.sm,
              borderRadius: Radii.button,
              backgroundColor: palette.tint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ ...Typography.caption, color: palette.onPrimary }}>
              Apply
            </ThemedText>
          </Clickable>
        </Row>
      )}
    </View>
  );
});

// ─── LivePreviewCard ────────────────────────────────────────────────────────

type LivePreviewCardProps = {
  branding: ClubBranding;
  palette: ThemeColors;
};

export const LivePreviewCard = memo(function LivePreviewCard({
  branding,
  palette,
}: LivePreviewCardProps) {
  return (
    <View style={styles.previewSection}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Live Preview</ThemedText>
      <View
        style={[
          styles.previewCard,
          { backgroundColor: branding.primaryColor, borderRadius: Radii.card },
        ]}
      >
        {/* Cover photo area */}
        <View
          style={[
            styles.previewCover,
            {
              backgroundColor: branding.secondaryColor,
              borderTopLeftRadius: Radii.card,
              borderTopRightRadius: Radii.card,
            },
          ]}
        >
          {branding.coverPhotoUrl ? (
            <ThemedText style={[styles.previewCoverText, { color: palette.onPrimary }]}>
              Cover Photo
            </ThemedText>
          ) : (
            <Ionicons
              name="image-outline"
              size={Components.icon.xl}
              color={withAlpha(palette.onPrimary, 0.5)}
            />
          )}
        </View>

        {/* Badge + Name */}
        <Row style={styles.previewContent}>
          <View style={[styles.previewBadge, { backgroundColor: branding.secondaryColor }]}>
            {branding.badgeUrl ? (
              <ThemedText style={{ ...Typography.caption, color: palette.onPrimary }}>
                Badge
              </ThemedText>
            ) : (
              <Ionicons name="shield-outline" size={Components.icon.md} color={palette.onPrimary} />
            )}
          </View>
          <View style={styles.previewTextContainer}>
            <ThemedText
              style={{ color: palette.onPrimary, ...Typography.heading }}
              numberOfLines={1}
            >
              {branding.name || 'Club Name'}
            </ThemedText>
            {branding.tagline ? (
              <ThemedText
                style={{ color: withAlpha(palette.onPrimary, 0.7), ...Typography.small }}
                numberOfLines={1}
              >
                {branding.tagline}
              </ThemedText>
            ) : null}
          </View>
        </Row>
      </View>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
  colorSection: { gap: Spacing.xs },
  colorRow: { flexWrap: 'wrap', gap: Spacing.xs },
  customHexRow: { gap: Spacing.xs, alignItems: 'center' },
  customHexInput: {
    flex: 1,
    height: Components.buttonCompact.height,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    ...Typography.body,
  },
  previewSection: { gap: Spacing.xs, marginBottom: Spacing.xs },
  previewCard: { overflow: 'hidden' },
  previewCover: { height: 80, alignItems: 'center', justifyContent: 'center' },
  previewCoverText: { ...Typography.caption },
  previewContent: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  previewBadge: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextContainer: { flex: 1, gap: Spacing.micro },
});
