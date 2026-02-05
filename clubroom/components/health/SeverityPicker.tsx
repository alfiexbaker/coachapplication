/**
 * SeverityPicker Component
 *
 * Visual severity selector for injuries with color-coded options.
 * Shows icons and descriptions for each severity level.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { InjurySeverity } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

interface SeverityPickerProps {
  selectedSeverity: InjurySeverity | null;
  onSelect: (severity: InjurySeverity) => void;
}

interface SeverityOption {
  value: InjurySeverity;
  description: string;
  examples: string;
}

const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    value: 'MINOR',
    description: 'Can continue with some discomfort',
    examples: 'Slight strain, minor bruise, small cut',
  },
  {
    value: 'MODERATE',
    description: 'Needs rest but recovers in 1-2 weeks',
    examples: 'Sprain, muscle pull, significant bruising',
  },
  {
    value: 'SEVERE',
    description: 'Requires medical attention',
    examples: 'Fracture, torn ligament, severe swelling',
  },
];

export function SeverityPicker({ selectedSeverity, onSelect }: SeverityPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleSelect = (severity: InjurySeverity) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(severity);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
        Severity Level
      </ThemedText>

      <View style={styles.optionsContainer}>
        {SEVERITY_OPTIONS.map((option) => {
          const info = injuryService.getSeverityInfo(option.value);
          const isSelected = selectedSeverity === option.value;

          return (
            <Clickable key={option.value} onPress={() => handleSelect(option.value)}>
              <View
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? `${info.color}15` : palette.surface,
                    borderColor: isSelected ? info.color : palette.border,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${info.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={info.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={info.color}
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <View style={styles.labelRow}>
                      <ThemedText
                        style={[
                          styles.optionLabel,
                          isSelected && { color: info.color },
                        ]}
                      >
                        {info.label}
                      </ThemedText>
                      {isSelected && (
                        <View
                          style={[
                            styles.checkCircle,
                            { backgroundColor: info.color },
                          ]}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <ThemedText
                      style={[styles.optionDescription, { color: palette.muted }]}
                    >
                      {option.description}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.examplesContainer, { backgroundColor: palette.background }]}>
                  <ThemedText style={[styles.examplesLabel, { color: palette.muted }]}>
                    Examples:
                  </ThemedText>
                  <ThemedText style={[styles.examplesText, { color: palette.text }]}>
                    {option.examples}
                  </ThemedText>
                </View>
              </View>
            </Clickable>
          );
        })}
      </View>

      {/* Severity scale indicator */}
      <View style={styles.scaleContainer}>
        <View style={styles.scaleBar}>
          {SEVERITY_OPTIONS.map((option, index) => {
            const info = injuryService.getSeverityInfo(option.value);
            const isSelected = selectedSeverity === option.value;
            return (
              <View
                key={option.value}
                style={[
                  styles.scaleSegment,
                  { backgroundColor: info.color },
                  isSelected ? styles.scaleSegmentSelected : undefined,
                  index === 0 ? styles.scaleSegmentFirst : undefined,
                  index === SEVERITY_OPTIONS.length - 1 ? styles.scaleSegmentLast : undefined,
                ]}
              />
            );
          })}
        </View>
        <View style={styles.scaleLabels}>
          <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>
            Minor
          </ThemedText>
          <ThemedText style={[styles.scaleLabel, { color: palette.muted }]}>
            Severe
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  optionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: scaleFont(16),
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDescription: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  examplesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  examplesLabel: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  examplesText: {
    fontSize: scaleFont(13),
  },
  scaleContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  scaleBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  scaleSegment: {
    flex: 1,
    opacity: 0.4,
  },
  scaleSegmentSelected: {
    opacity: 1,
  },
  scaleSegmentFirst: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  scaleSegmentLast: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
});
