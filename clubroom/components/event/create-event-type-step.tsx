import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import type { ClubEventType } from '@/constants/types';
import { Row } from '@/components/primitives';

const EVENT_TYPES: { key: ClubEventType; label: string; icon: string }[] = [
  { key: 'TOURNAMENT', label: 'Tournament', icon: 'trophy' },
  { key: 'SOCIAL', label: 'Social', icon: 'people' },
  { key: 'MEETING', label: 'Meeting', icon: 'chatbubbles' },
  { key: 'PRESENTATION', label: 'Presentation', icon: 'ribbon' },
  { key: 'FUNDRAISER', label: 'Fundraiser', icon: 'cash' },
  { key: 'TRIAL_DAY', label: 'Trial Day', icon: 'football' },
  { key: 'OTHER', label: 'Other', icon: 'calendar' },
];

interface CreateEventTypeStepProps {
  eventType: ClubEventType;
  onEventTypeChange: (type: ClubEventType) => void;
}

function CreateEventTypeStepInner({ eventType, onEventTypeChange }: CreateEventTypeStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        What type of event?
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Choose the category that best fits your event
      </ThemedText>
      <Row style={styles.typeGrid}>
        {EVENT_TYPES.map((type) => {
          const typeColor = eventService.getEventTypeColor(type.key);
          return (
            <Clickable
              key={type.key}
              onPress={() => onEventTypeChange(type.key)}
              style={[
                styles.typeCard,
                {
                  backgroundColor: eventType === type.key ? withAlpha(typeColor, 0.09) : palette.surface,
                  borderColor: eventType === type.key ? typeColor : palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.typeIcon,
                  {
                    backgroundColor: eventType === type.key ? typeColor : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={type.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={eventType === type.key ? palette.onPrimary : palette.muted}
                />
              </View>
              <ThemedText
                style={[
                  styles.typeLabel,
                  { color: eventType === type.key ? typeColor : palette.text },
                ]}
              >
                {type.label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </Animated.View>
  );
}

export const CreateEventTypeStep = React.memo(CreateEventTypeStepInner);

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
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    marginTop: -Spacing.sm,
  },
  typeGrid: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  typeCard: {
    width: '30%',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 2,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    textAlign: 'center',
  },
});
