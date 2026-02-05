import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsRow, SettingsToggleRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreferences } from '@/hooks/theme-provider';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AppearanceSettings');

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeCardProps {
  label: string;
  value: ThemeOption;
  selected: boolean;
  onSelect: () => void;
  icon: string;
  description: string;
}

function ThemeCard({ label, value, selected, onSelect, icon, description }: ThemeCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable onPress={onSelect}>
      <SurfaceCard
        style={[
          styles.themeCard,
          selected ? { borderColor: palette.accent, borderWidth: 2 } : undefined,
        ]}
      >
        <View style={[styles.themeIconContainer, { backgroundColor: `${palette.accent}15` }]}>
          <Ionicons name={icon as any} size={28} color={palette.accent} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.themeLabel}>{label}</ThemedText>
        <ThemedText style={[styles.themeDescription, { color: palette.muted }]}>{description}</ThemedText>
        {selected && (
          <View style={[styles.selectedBadge, { backgroundColor: palette.accent }]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        )}
      </SurfaceCard>
    </Clickable>
  );
}

export default function AppearanceSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { colorScheme, setColorScheme } = useThemePreferences();

  // Theme selection
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(
    colorScheme === 'dark' ? 'dark' : 'light'
  );

  // Display preferences
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const handleThemeSelect = (theme: ThemeOption) => {
    logger.press('ThemeSelect', { theme });
    setSelectedTheme(theme);
    if (theme === 'dark') {
      setColorScheme('dark');
    } else {
      setColorScheme('light');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Appearance
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Selection */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
            THEME
          </ThemedText>
          <View style={styles.themeGrid}>
            <ThemeCard
              label="Light"
              value="light"
              selected={selectedTheme === 'light'}
              onSelect={() => handleThemeSelect('light')}
              icon="sunny"
              description="Clean and bright"
            />
            <ThemeCard
              label="Dark"
              value="dark"
              selected={selectedTheme === 'dark'}
              onSelect={() => handleThemeSelect('dark')}
              icon="moon"
              description="Easy on the eyes"
            />
            <ThemeCard
              label="System"
              value="system"
              selected={selectedTheme === 'system'}
              onSelect={() => handleThemeSelect('system')}
              icon="phone-portrait"
              description="Match device settings"
            />
          </View>
        </View>

        {/* App Icon */}
        <SettingsSection title="App Icon">
          <SettingsRow
            icon="apps"
            title="App Icon"
            value="Default"
            onPress={() => {
              logger.press('AppIcon');
              // Could show icon picker in future
            }}
          />
        </SettingsSection>

        {/* Accessibility */}
        <SettingsSection title="Accessibility">
          <SettingsToggleRow
            icon="hand-left"
            title="Reduce Motion"
            subtitle="Minimize animations throughout the app"
            value={reducedMotion}
            onValueChange={(v) => {
              logger.debug('Toggle reducedMotion', { newValue: v });
              setReducedMotion(v);
            }}
          />
          <SettingsToggleRow
            icon="text"
            title="Large Text"
            subtitle="Use larger text sizes"
            value={largeText}
            onValueChange={(v) => {
              logger.debug('Toggle largeText', { newValue: v });
              setLargeText(v);
            }}
          />
          <SettingsToggleRow
            icon="contrast"
            title="High Contrast"
            subtitle="Increase color contrast"
            value={highContrast}
            onValueChange={(v) => {
              logger.debug('Toggle highContrast', { newValue: v });
              setHighContrast(v);
            }}
          />
        </SettingsSection>

        {/* Preview */}
        <View style={styles.previewSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
            PREVIEW
          </ThemedText>
          <SurfaceCard style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={[styles.previewAvatar, { backgroundColor: palette.accent }]}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.previewText}>
                <ThemedText type="defaultSemiBold">Sample Card Title</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                  This is how content looks with your current theme settings.
                </ThemedText>
              </View>
            </View>
            <View style={[styles.previewButton, { backgroundColor: palette.accent }]}>
              <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Sample Button
              </ThemedText>
            </View>
          </SurfaceCard>
        </View>

        {/* Info */}
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  themeLabel: {
    fontSize: 14,
  },
  themeDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    gap: Spacing.sm,
  },
  previewCard: {
    gap: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    flex: 1,
    gap: 4,
  },
  previewButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  infoContainer: {
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
