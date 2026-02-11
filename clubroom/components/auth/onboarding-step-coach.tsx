/**
 * StepCoachDetails — Coach-specific details step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { COACH_SPECIALIZATIONS } from './onboarding-types';
import { Row } from '@/components/primitives';

interface StepCoachDetailsProps {
  isOrganization: boolean;
  organizationName: string;
  yearsExperience: string;
  hourlyRate: string;
  specializations: string[];
  bio: string;
  onToggleIsOrganization: () => void;
  onToggleSpecialization: (spec: string) => void;
  onChangeField: (field: string, value: string) => void;
}

function StepCoachDetailsInner({
  isOrganization,
  organizationName,
  yearsExperience,
  hourlyRate,
  specializations,
  bio,
  onToggleIsOrganization,
  onToggleSpecialization,
  onChangeField,
}: StepCoachDetailsProps) {
  const { colors: palette } = useTheme();

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(isOrganization ? 20 : 0, { duration: 200 }) }],
  }));

  const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Set up your coaching profile
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Help athletes find and trust you.
      </ThemedText>

      {/* Organization toggle */}
      <View style={styles.fieldGroup}>
        <Clickable
          onPress={onToggleIsOrganization}
          accessibilityLabel="I represent an organization"
          accessibilityRole="switch"
          accessibilityState={{ checked: isOrganization }}
          style={[
            styles.toggleCard,
            {
              backgroundColor: isOrganization ? withAlpha(palette.tint, 0.06) : palette.card,
              borderColor: isOrganization ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={styles.toggleContent}>
            <ThemedText type="defaultSemiBold">I represent an organization</ThemedText>
            <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
              Academy, club, or coaching business
            </ThemedText>
          </View>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: isOrganization ? palette.tint : palette.border },
            ]}
          >
            <Animated.View
              style={[styles.toggleKnob, { backgroundColor: palette.surface }, knobStyle]}
            />
          </View>
        </Clickable>
      </View>

      {isOrganization && (
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Organization Name *</ThemedText>
          <TextInput
            value={organizationName}
            onChangeText={(v) => onChangeField('organizationName', v)}
            placeholder="Elite Sports Academy"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Organization name"
            style={inputStyle}
          />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Years of Experience</ThemedText>
        <TextInput
          value={yearsExperience}
          onChangeText={(v) => onChangeField('yearsExperience', v)}
          placeholder="5"
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
          accessibilityLabel="Years of experience"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Hourly Rate (GBP)</ThemedText>
        <TextInput
          value={hourlyRate}
          onChangeText={(v) => onChangeField('hourlyRate', v)}
          placeholder="50"
          placeholderTextColor={palette.muted}
          keyboardType="decimal-pad"
          accessibilityLabel="Hourly rate in GBP"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Specializations</ThemedText>
        <Row style={styles.specGrid}>
          {COACH_SPECIALIZATIONS.map((spec) => {
            const isSelected = specializations.includes(spec);
            return (
              <Clickable
                key={spec}
                onPress={() => onToggleSpecialization(spec)}
                accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${spec}`}
                style={[
                  styles.specChip,
                  {
                    backgroundColor: isSelected ? palette.tint : palette.card,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.specChipText,
                    { color: isSelected ? palette.onPrimary : palette.foreground },
                  ]}
                >
                  {spec}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Bio</ThemedText>
        <TextInput
          value={bio}
          onChangeText={(v) => onChangeField('bio', v)}
          placeholder="Tell athletes about your coaching philosophy..."
          placeholderTextColor={palette.muted}
          multiline
          numberOfLines={4}
          accessibilityLabel="Bio"
          style={[styles.textArea, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>
    </View>
  );
}

export const StepCoachDetails = memo(StepCoachDetailsInner);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  toggleContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  toggleDesc: {
    ...Typography.caption,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    padding: Spacing.xxs,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
  },
  specGrid: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  specChipText: {
    ...Typography.caption,
  },
});
