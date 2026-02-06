import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';
import type { EventTargetAudience, ClubSquad } from '@/constants/types';

const AUDIENCE_OPTIONS: { key: EventTargetAudience | 'SQUADS'; label: string; description: string; icon: string }[] = [
  { key: 'ALL', label: 'Everyone', description: 'All club members', icon: 'globe-outline' },
  { key: 'SQUADS', label: 'Specific Squads', description: 'Select which squads to invite', icon: 'people-outline' },
  { key: 'COACHES', label: 'Coaches Only', description: 'Staff and coaches', icon: 'school-outline' },
  { key: 'PARENTS', label: 'Parents Only', description: 'Parents and guardians', icon: 'person-outline' },
  { key: 'ATHLETES', label: 'Athletes Only', description: 'Players and athletes', icon: 'football-outline' },
];

interface CreateEventAudienceStepProps {
  clubId: string;
  targetAudience: EventTargetAudience | 'SQUADS';
  selectedSquadIds: string[];
  squads: ClubSquad[];
  maxAttendees: string;
  price: string;
  rsvpRequired: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateEventAudienceStepInner({
  clubId,
  targetAudience,
  selectedSquadIds,
  squads,
  maxAttendees,
  price,
  rsvpRequired,
  onFieldChange,
}: CreateEventAudienceStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const totalInviteCount = squads
    .filter((s) => selectedSquadIds.includes(s.id))
    .reduce((sum, s) => sum + s.memberCount, 0);

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Who can attend?
      </ThemedText>

      <View style={styles.audienceGrid}>
        {AUDIENCE_OPTIONS.map((option) => (
          <Clickable
            key={option.key}
            onPress={() => {
              onFieldChange('targetAudience', option.key);
              if (option.key !== 'SQUADS') {
                onFieldChange('selectedSquadIds', []);
              }
            }}
            style={[
              styles.audienceCard,
              {
                backgroundColor:
                  targetAudience === option.key ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: targetAudience === option.key ? palette.tint : palette.border,
              },
            ]}
          >
            <View style={styles.audienceRadio}>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: targetAudience === option.key ? palette.tint : palette.border },
                ]}
              >
                {targetAudience === option.key && (
                  <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />
                )}
              </View>
            </View>
            <Ionicons
              name={option.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={targetAudience === option.key ? palette.tint : palette.muted}
            />
            <View style={styles.audienceInfo}>
              <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              <ThemedText style={[styles.audienceDesc, { color: palette.muted }]}>
                {option.description}
              </ThemedText>
            </View>
          </Clickable>
        ))}
      </View>

      {targetAudience === 'SQUADS' && (
        <SurfaceCard style={styles.squadSelectorCard}>
          <View style={styles.squadSelectorHeader}>
            <Ionicons name="people" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Select Squads</ThemedText>
          </View>
          <InlineSquadSelector
            clubId={clubId}
            selectedSquadIds={selectedSquadIds}
            onSelectionChange={(ids: string[]) => onFieldChange('selectedSquadIds', ids)}
            multiSelect
          />
          {selectedSquadIds.length > 0 && (
            <View style={[styles.squadSummary, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, ...Typography.small }}>
                {selectedSquadIds.length} squad{selectedSquadIds.length !== 1 ? 's' : ''} selected ({totalInviteCount} athletes)
              </ThemedText>
            </View>
          )}
        </SurfaceCard>
      )}

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Max Attendees (optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="Leave empty for unlimited"
          placeholderTextColor={palette.muted}
          value={maxAttendees}
          onChangeText={(v) => onFieldChange('maxAttendees', v)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Price per person (GBP)</ThemedText>
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
        onPress={() => onFieldChange('rsvpRequired', !rsvpRequired)}
        style={styles.toggleRow}
      >
        <View style={styles.toggleInfo}>
          <ThemedText type="defaultSemiBold">Require RSVP</ThemedText>
          <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
            Ask members to confirm attendance
          </ThemedText>
        </View>
        <View
          style={[
            styles.toggleSwitch,
            { backgroundColor: rsvpRequired ? palette.tint : palette.border },
          ]}
        >
          <View
            style={[
              styles.toggleHandle,
              { transform: [{ translateX: rsvpRequired ? 18 : Spacing.micro }] },
            ]}
          />
        </View>
      </Clickable>
    </Animated.View>
  );
}

export const CreateEventAudienceStep = React.memo(CreateEventAudienceStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  audienceGrid: {
    gap: Spacing.sm,
  },
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  audienceRadio: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
  audienceInfo: {
    flex: 1,
  },
  audienceDesc: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    marginTop: Spacing.micro,
  },
  squadSelectorCard: {
    gap: Spacing.md,
  },
  squadSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  squadSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
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
    backgroundColor: Colors.light.surface,
  },
});
