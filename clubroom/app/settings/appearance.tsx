/**
 * Appearance Settings Screen
 *
 * Theme selection, accessibility toggles, and preview.
 * All state/logic in useAppearance hook.
 */

import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsToggleRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAppearance, type ThemeOption } from '@/hooks/use-appearance';

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: string; description: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny', description: 'Clean and bright' },
  { value: 'dark', label: 'Dark', icon: 'moon', description: 'Easy on the eyes' },
  {
    value: 'system',
    label: 'System',
    icon: 'phone-portrait',
    description: 'Match device settings',
  },
];

function ThemeCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof THEME_OPTIONS)[0];
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Clickable onPress={onSelect}>
      <SurfaceCard
        style={[
          styles.themeCard,
          selected ? { borderColor: palette.accent, borderWidth: 2 } : undefined,
        ]}
      >
        <View
          style={[styles.themeIconContainer, { backgroundColor: withAlpha(palette.accent, 0.09) }]}
        >
          <Ionicons
            name={option.icon as keyof typeof Ionicons.glyphMap}
            size={28}
            color={palette.accent}
          />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.themeLabel}>
          {option.label}
        </ThemedText>
        <ThemedText style={[styles.themeDescription, { color: palette.muted }]}>
          {option.description}
        </ThemedText>
        {selected && (
          <View style={[styles.selectedBadge, { backgroundColor: palette.accent }]}>
            <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
          </View>
        )}
      </SurfaceCard>
    </Clickable>
  );
}

export default function AppearanceSettingsScreen() {
  const { colors: palette } = useTheme();
  const c = useAppearance();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Appearance"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>THEME</ThemedText>
          <Row gap="sm" style={styles.themeGrid}>
            {THEME_OPTIONS.map((option) => (
              <ThemeCard
                key={option.value}
                option={option}
                selected={c.selectedTheme === option.value}
                onSelect={() => c.handleThemeSelect(option.value)}
              />
            ))}
          </Row>
        </View>

        <SettingsSection title="App Icon">
          <SettingsRow
            icon="apps"
            title="App Icon"
            value="Default"
            onPress={c.handleAppIconPress}
          />
        </SettingsSection>

        <SettingsSection title="Accessibility">
          <SettingsToggleRow
            icon="hand-left"
            title="Reduce Motion"
            subtitle="Minimize animations throughout the app"
            value={c.reducedMotion}
            onValueChange={c.handleReducedMotion}
          />
          <SettingsToggleRow
            icon="text"
            title="Large Text"
            subtitle="Use larger text sizes"
            value={c.largeText}
            onValueChange={c.handleLargeText}
          />
          <SettingsToggleRow
            icon="contrast"
            title="High Contrast"
            subtitle="Increase color contrast"
            value={c.highContrast}
            onValueChange={c.handleHighContrast}
          />
        </SettingsSection>

        <View style={styles.previewSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>PREVIEW</ThemedText>
          <SurfaceCard style={styles.previewCard}>
            <Row gap="md" align="start" style={styles.previewHeader}>
              <View style={[styles.previewAvatar, { backgroundColor: palette.accent }]}>
                <Ionicons name="person" size={20} color={palette.onPrimary} />
              </View>
              <View style={styles.previewText}>
                <ThemedText type="defaultSemiBold">Sample Card Title</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                  This is how content looks with your current theme settings.
                </ThemedText>
              </View>
            </Row>
            <View style={[styles.previewButton, { backgroundColor: palette.accent }]}>
              <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>
                Sample Button
              </ThemedText>
            </View>
          </SurfaceCard>
        </View>

        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Some settings may require restarting the app to take full effect.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: {
    ...Typography.smallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  themeGrid: {},
  themeCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.xs,
    position: 'relative',
  },
  themeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  themeLabel: { ...Typography.bodySmall },
  themeDescription: { ...Typography.caption, textAlign: 'center' },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: { gap: Spacing.sm },
  previewCard: { gap: Spacing.md },
  previewHeader: {},
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: { flex: 1, gap: Spacing.xxs },
  previewButton: { paddingVertical: Spacing.sm, borderRadius: Radii.md, alignItems: 'center' },
  infoContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  infoText: { ...Typography.small, textAlign: 'center' },
});
