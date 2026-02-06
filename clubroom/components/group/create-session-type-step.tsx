import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { GroupSession, SessionInviteType } from '@/constants/types';

const SESSION_TYPES: { key: GroupSession['sessionType']; label: string; icon: string }[] = [
  { key: 'CAMP', label: 'Camp', icon: 'sunny' },
  { key: 'CLINIC', label: 'Clinic', icon: 'school' },
  { key: 'TEAM_TRAINING', label: 'Team Training', icon: 'people' },
  { key: 'TRAINING', label: 'Squad Training', icon: 'football' },
  { key: 'OPEN_SESSION', label: 'Open Session', icon: 'fitness' },
  { key: 'TRIAL', label: 'Trial', icon: 'sparkles' },
];

const INVITE_TYPES: { key: SessionInviteType; label: string; icon: string; description: string }[] = [
  { key: 'OPEN', label: 'Open', icon: 'globe-outline', description: 'Anyone can see & book' },
  { key: 'CLOSED', label: 'Invite Only', icon: 'lock-closed-outline', description: 'Only invited athletes' },
  { key: 'SQUAD_ONLY', label: 'Squad Only', icon: 'people-outline', description: 'Squad members only' },
];

interface CreateSessionTypeStepProps {
  sessionType: GroupSession['sessionType'];
  inviteType: SessionInviteType;
  onSessionTypeChange: (type: GroupSession['sessionType']) => void;
  onInviteTypeChange: (type: SessionInviteType) => void;
}

function CreateSessionTypeStepInner({ sessionType, inviteType, onSessionTypeChange, onInviteTypeChange }: CreateSessionTypeStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        What type of session?
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Choose the format that best fits your training
      </ThemedText>
      <View style={styles.typeGrid}>
        {SESSION_TYPES.map((type) => (
          <Clickable
            key={type.key}
            onPress={() => onSessionTypeChange(type.key)}
            style={[
              styles.typeCard,
              {
                backgroundColor: sessionType === type.key ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: sessionType === type.key ? palette.tint : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.typeIcon,
                {
                  backgroundColor: sessionType === type.key ? palette.tint : palette.border,
                },
              ]}
            >
              <Ionicons
                name={type.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={sessionType === type.key ? Colors.light.onPrimary : palette.muted}
              />
            </View>
            <ThemedText
              style={[
                styles.typeLabel,
                { color: sessionType === type.key ? palette.tint : palette.text },
              ]}
            >
              {type.label}
            </ThemedText>
          </Clickable>
        ))}
      </View>

      {/* Invite Type Selector */}
      <ThemedText type="defaultSemiBold" style={styles.inviteTypeTitle}>
        Who can join?
      </ThemedText>
      <View style={styles.inviteTypeList}>
        {INVITE_TYPES.map((type) => (
          <Clickable
            key={type.key}
            onPress={() => onInviteTypeChange(type.key)}
            style={[
              styles.inviteTypeCard,
              {
                backgroundColor: inviteType === type.key ? withAlpha(palette.tint, 0.06) : palette.surface,
                borderColor: inviteType === type.key ? palette.tint : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.inviteTypeIcon,
                {
                  backgroundColor: inviteType === type.key ? withAlpha(palette.tint, 0.09) : palette.background,
                },
              ]}
            >
              <Ionicons
                name={type.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={inviteType === type.key ? palette.tint : palette.muted}
              />
            </View>
            <View style={styles.inviteTypeInfo}>
              <ThemedText
                style={[
                  styles.inviteTypeLabel,
                  { color: inviteType === type.key ? palette.tint : palette.text },
                ]}
              >
                {type.label}
              </ThemedText>
              <ThemedText style={[styles.inviteTypeDesc, { color: palette.muted }]}>
                {type.description}
              </ThemedText>
            </View>
            {inviteType === type.key && (
              <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
            )}
          </Clickable>
        ))}
      </View>
    </Animated.View>
  );
}

export const CreateSessionTypeStep = React.memo(CreateSessionTypeStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
    ...Typography.bodySmall,
    marginTop: -Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  typeCard: {
    width: '45%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...Typography.bodySmallSemiBold,
  },
  inviteTypeTitle: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  inviteTypeList: {
    gap: Spacing.sm,
  },
  inviteTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  inviteTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTypeInfo: {
    flex: 1,
  },
  inviteTypeLabel: {
    ...Typography.bodySmallSemiBold,
  },
  inviteTypeDesc: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
});
