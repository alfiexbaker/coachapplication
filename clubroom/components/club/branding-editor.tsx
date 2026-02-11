import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ClubBranding } from '@/services/club-service';
import { ColorPickerRow, LivePreviewCard } from './branding-editor-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BrandingEditorProps {
  branding: ClubBranding;
  onChange: (updated: Partial<ClubBranding>) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <LivePreviewCard branding={branding} palette={palette} />

      {/* Club Name */}
      <SurfaceCard style={styles.fieldCard}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Club Name</ThemedText>
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
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Tagline</ThemedText>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  fieldCard: { gap: Spacing.xs },
  fieldLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.6 },
  textInput: {
    height: Components.input.height,
    borderRadius: Radii.md,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    ...Typography.body,
  },
});
