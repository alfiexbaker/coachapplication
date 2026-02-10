import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CreateSessionPricingStepProps {
  maxParticipants: string;
  price: string;
  waitlistEnabled: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateSessionPricingStepInner({
  maxParticipants,
  price,
  waitlistEnabled,
  onFieldChange,
}: CreateSessionPricingStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Capacity & Pricing
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Max Participants</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="10"
          placeholderTextColor={palette.muted}
          value={maxParticipants}
          onChangeText={(v) => onFieldChange('maxParticipants', v)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Price per Participant (GBP)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="0 for free"
          placeholderTextColor={palette.muted}
          value={price}
          onChangeText={(v) => onFieldChange('price', v)}
          keyboardType="decimal-pad"
        />
      </View>

      <Clickable
        onPress={() => onFieldChange('waitlistEnabled', !waitlistEnabled)}
        style={styles.toggleRow}
      >
        <View style={styles.toggleInfo}>
          <ThemedText type="defaultSemiBold">Enable Waitlist</ThemedText>
          <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
            Allow parents to join a waitlist when full
          </ThemedText>
        </View>
        <View
          style={[
            styles.toggleSwitch,
            { backgroundColor: waitlistEnabled ? palette.tint : palette.border },
          ]}
        >
          <View
            style={[
              styles.toggleHandle,
              { backgroundColor: palette.surface, transform: [{ translateX: waitlistEnabled ? 18 : Spacing.micro }] },
            ]}
          />
        </View>
      </Clickable>
    </Animated.View>
  );
}

export const CreateSessionPricingStep = React.memo(CreateSessionPricingStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    // backgroundColor set inline for dynamic theming
  },
});
