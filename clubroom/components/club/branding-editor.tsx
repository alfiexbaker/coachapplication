import { useCallback, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubBranding } from '@/services/club-service';

// ============================================================================
// PRESET COLORS
// ============================================================================

// Decorative: user-selectable brand color presets (not themeable)
const PRESET_COLORS = [
  '#0F172A', // Ink
  '#1D4ED8', // Blue
  '#7C3AED', // Purple
  '#DC2626', // Red
  '#16A34A', // Green
  '#EA580C', // Orange
  '#0891B2', // Teal
  '#CA8A04', // Gold
] as const;

// ============================================================================
// TYPES
// ============================================================================

export interface BrandingEditorProps {
  branding: ClubBranding;
  onChange: (updated: Partial<ClubBranding>) => void;
}

// ============================================================================
// COLOR PICKER ROW
// ============================================================================

function ColorPickerRow({
  label,
  value,
  onSelect,
  palette,
}: {
  label: string;
  value: string;
  onSelect: (color: string) => void;
  palette: ThemeColors;
}) {
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
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
      <View style={styles.colorRow}>
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
      </View>
      {showCustom && (
        <View style={styles.customHexRow}>
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
            <ThemedText style={{ ...Typography.caption, color: palette.onPrimary }}>Apply</ThemedText>
          </Clickable>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// LIVE PREVIEW CARD
// ============================================================================

function LivePreviewCard({
  branding,
  palette,
}: {
  branding: ClubBranding;
  palette: ThemeColors;
}) {
  return (
    <View style={styles.previewSection}>
      <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
        Live Preview
      </ThemedText>
      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: branding.primaryColor,
            borderRadius: Radii.card,
          },
        ]}
      >
        {/* Cover photo area */}
        <View
          style={[
            styles.previewCover,
            { backgroundColor: branding.secondaryColor, borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card },
          ]}
        >
          {branding.coverPhotoUrl ? (
            <ThemedText style={[styles.previewCoverText, { color: palette.onPrimary }]}>
              Cover Photo
            </ThemedText>
          ) : (
            <Ionicons name="image-outline" size={Components.icon.xl} color={withAlpha(palette.onPrimary, 0.5)} />
          )}
        </View>

        {/* Badge + Name */}
        <View style={styles.previewContent}>
          <View
            style={[
              styles.previewBadge,
              { backgroundColor: branding.secondaryColor },
            ]}
          >
            {branding.badgeUrl ? (
              <ThemedText style={{ ...Typography.caption, color: palette.onPrimary }}>Badge</ThemedText>
            ) : (
              <Ionicons name="shield-outline" size={Components.icon.md} color={palette.onPrimary} />
            )}
          </View>
          <View style={styles.previewTextContainer}>
            <ThemedText
              style={{
                color: palette.onPrimary,
                ...Typography.heading,
              }}
              numberOfLines={1}
            >
              {branding.name || 'Club Name'}
            </ThemedText>
            {branding.tagline ? (
              <ThemedText
                style={{
                  color: withAlpha(palette.onPrimary, 0.7),
                  ...Typography.small,
                }}
                numberOfLines={1}
              >
                {branding.tagline}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      {/* Live Preview */}
      <LivePreviewCard branding={branding} palette={palette} />

      {/* Club Name */}
      <SurfaceCard style={styles.fieldCard}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
          Club Name
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              color: palette.foreground,
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
          value={branding.name}
          onChangeText={(text) => onChange({ name: text })}
          placeholder="Enter club name"
          placeholderTextColor={palette.muted}
        />
      </SurfaceCard>

      {/* Tagline */}
      <SurfaceCard style={styles.fieldCard}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
          Tagline
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              color: palette.foreground,
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
          value={branding.tagline}
          onChangeText={(text) => onChange({ tagline: text })}
          placeholder="Enter a short tagline"
          placeholderTextColor={palette.muted}
        />
      </SurfaceCard>

      {/* Badge URL */}
      <SurfaceCard style={styles.fieldCard}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
          Badge / Logo URL
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              color: palette.foreground,
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
          value={branding.badgeUrl}
          onChangeText={(text) => onChange({ badgeUrl: text })}
          placeholder="https://example.com/badge.png"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          keyboardType="url"
        />
      </SurfaceCard>

      {/* Cover Photo URL */}
      <SurfaceCard style={styles.fieldCard}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
          Cover Photo URL
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              color: palette.foreground,
              backgroundColor: palette.background,
              borderColor: palette.border,
            },
          ]}
          value={branding.coverPhotoUrl}
          onChangeText={(text) => onChange({ coverPhotoUrl: text })}
          placeholder="https://example.com/cover.jpg"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          keyboardType="url"
        />
      </SurfaceCard>

      {/* Primary Color */}
      <SurfaceCard style={styles.fieldCard}>
        <ColorPickerRow
          label="Primary Color"
          value={branding.primaryColor}
          onSelect={(color) => onChange({ primaryColor: color })}
          palette={palette}
        />
      </SurfaceCard>

      {/* Secondary Color */}
      <SurfaceCard style={styles.fieldCard}>
        <ColorPickerRow
          label="Secondary Color"
          value={branding.secondaryColor}
          onSelect={(color) => onChange({ secondaryColor: color })}
          palette={palette}
        />
      </SurfaceCard>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  fieldCard: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  textInput: {
    height: Components.input.height,
    borderRadius: Radii.md,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    ...Typography.body,
  },
  colorSection: {
    gap: Spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  customHexRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  customHexInput: {
    flex: 1,
    height: Components.buttonCompact.height,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    ...Typography.body,
  },
  previewSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  previewCard: {
    overflow: 'hidden',
  },
  previewCover: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCoverText: {
    ...Typography.caption,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  previewBadge: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextContainer: {
    flex: 1,
    gap: Spacing.micro,
  },
});
