/**
 * Create Club Screen
 *
 * Form for creating a new club with name, tagline, city,
 * country, and badge. Includes live preview and feature list.
 */

import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCreateClub, CLUB_FEATURES } from '@/hooks/use-create-club';

export default function CreateClubScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    name, setName, tagline, setTagline, city, setCity,
    country, setCountry, badge, handleBadgeChange,
    isSubmitting, isValid, handleCreate,
    previewBadge, previewName, previewLocation,
  } = useCreateClub();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={Typography.heading}>Create Club</ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info Card */}
          <SurfaceCard style={styles.infoCard}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="people" size={32} color={palette.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>Start Your Club Community</ThemedText>
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Create a space for your athletes and parents. Share updates, manage squads, and track progress all in one place.
            </ThemedText>
          </SurfaceCard>

          {/* Form */}
          <View style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Club Details</ThemedText>
            <FormInput label="Club Name *" placeholder="e.g., Lions FC Academy" value={name} onChangeText={setName} palette={palette} autoCapitalize="words" />
            <FormInput label="Tagline (optional)" placeholder="e.g., Developing champions since 2015" value={tagline} onChangeText={setTagline} palette={palette} />
            <Row gap="md">
              <View style={{ flex: 2 }}>
                <FormInput label="City *" placeholder="e.g., London" value={city} onChangeText={setCity} palette={palette} autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <FormInput label="Country" placeholder="UK" value={country} onChangeText={setCountry} palette={palette} autoCapitalize="characters" />
              </View>
            </Row>
            <FormInput label="Badge/Abbreviation (3-4 letters)" placeholder="LFC" value={badge} onChangeText={handleBadgeChange} palette={palette} autoCapitalize="characters" maxLength={4} inputStyle={{ width: 120 }} />
          </View>

          {/* Preview */}
          <SurfaceCard style={styles.previewCard}>
            <ThemedText type="defaultSemiBold" style={Typography.small}>Preview</ThemedText>
            <Row gap="md" align="center">
              <View style={[styles.previewBadge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <ThemedText style={[Typography.subheading, { color: palette.tint }]}>{previewBadge}</ThemedText>
              </View>
              <View style={{ flex: 1, gap: Spacing.micro }}>
                <ThemedText type="defaultSemiBold" style={Typography.subheading}>{previewName}</ThemedText>
                {tagline ? <ThemedText style={[Typography.small, { color: palette.muted }]}>{tagline}</ThemedText> : null}
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>{previewLocation}</ThemedText>
              </View>
            </Row>
          </SurfaceCard>

          {/* Features */}
          <View style={styles.features}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.body, marginBottom: Spacing.xs }}>What you&apos;ll get</ThemedText>
            {CLUB_FEATURES.map((item) => (
              <Row key={item.text} gap="sm" align="center">
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
                <ThemedText style={Typography.bodySmall}>{item.text}</ThemedText>
              </Row>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Clickable
            style={[styles.createButton, { backgroundColor: isValid ? palette.tint : palette.border }]}
            onPress={handleCreate}
            disabled={!isValid || isSubmitting}
          >
            <Row align="center" justify="center" gap="sm">
              {isSubmitting ? (
                <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>Creating...</ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
                  <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>Create Club</ThemedText>
                </>
              )}
            </Row>
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormInput({ label, palette, inputStyle, ...inputProps }: {
  label: string;
  palette: { surface: string; border: string; text: string; muted: string };
  inputStyle?: object;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>{label}</ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }, inputStyle]}
        placeholderTextColor={palette.muted}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },
  infoCard: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg },
  iconCircle: { width: 64, height: 64, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  infoTitle: { ...Typography.heading, textAlign: 'center' },
  infoText: { textAlign: 'center', ...Typography.bodySmall },
  formSection: { gap: Spacing.md },
  sectionLabel: { ...Typography.subheading, marginBottom: Spacing.xs },
  inputGroup: { gap: Spacing.xs },
  input: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.subheading },
  previewCard: { gap: Spacing.sm },
  previewBadge: { width: 56, height: 56, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  features: { gap: Spacing.sm },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
  createButton: { paddingVertical: Spacing.md, borderRadius: Radii.lg },
});
