/**
 * SessionJournal Component
 *
 * Athletes can view coach notes for a session, write private personal notes,
 * select a mood (5 face options via Ionicons), rate their energy level (1-5
 * stars), and save the entry. A timeline view of past journal entries is
 * rendered below.
 */

import { useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { MoodSelector, StarRating, JournalTimelineEntry } from './session-journal-sections';
import type { JournalEntry } from './session-journal-sections';
import { Row } from '@/components/primitives';

// Re-export types for backward compat
export type { JournalEntry } from './session-journal-sections';

export interface SessionJournalProps {
  coachNotes?: string;
  pastEntries: JournalEntry[];
  onSave: (entry: { personalNotes: string; mood: number; energyLevel: number }) => void;
}

export function SessionJournal({ coachNotes, pastEntries, onSave }: SessionJournalProps) {
  const { colors: palette } = useTheme();

  const [personalNotes, setPersonalNotes] = useState('');
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);

  const handleSave = useCallback(() => {
    if (!personalNotes.trim()) {
      Alert.alert('Empty notes', 'Please write something before saving.');
      return;
    }
    onSave({ personalNotes: personalNotes.trim(), mood, energyLevel: energy });
    setPersonalNotes('');
    setMood(3);
    setEnergy(3);
  }, [personalNotes, mood, energy, onSave]);

  return (
    <View style={styles.container}>
      {coachNotes ? (
        <SurfaceCard style={styles.section}>
          <Row style={styles.sectionHeader}>
            <Ionicons name="clipboard-outline" size={Components.icon.md} color={palette.tint} />
            <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
              Coach&apos;s Notes
            </ThemedText>
          </Row>
          <ThemedText style={[styles.coachNotes, { color: palette.foreground }]}>
            {coachNotes}
          </ThemedText>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.section}>
        <Row style={styles.sectionHeader}>
          <Ionicons name="journal-outline" size={Components.icon.md} color={palette.tint} />
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            My Notes
          </ThemedText>
          <ThemedText style={[styles.privateTag, { color: palette.muted }]}>(private)</ThemedText>
        </Row>

        <TextInput
          style={[
            styles.textInput,
            {
              color: palette.foreground,
              backgroundColor: palette.surfaceSecondary,
              borderColor: palette.border,
            },
          ]}
          value={personalNotes}
          onChangeText={setPersonalNotes}
          placeholder="How did the session go?"
          placeholderTextColor={palette.muted}
          multiline
          textAlignVertical="top"
        />

        <ThemedText style={[styles.fieldLabel, { color: palette.foreground }]}>
          How I Felt
        </ThemedText>
        <MoodSelector selected={mood} onSelect={setMood} palette={palette} />

        <ThemedText style={[styles.fieldLabel, { color: palette.foreground }]}>
          Energy Level
        </ThemedText>
        <StarRating value={energy} onChange={setEnergy} palette={palette} />

        <Clickable onPress={handleSave} accessibilityLabel="Save Entry">
          <View style={[styles.saveButton, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.saveButtonText, { color: palette.surface }]}>
              Save Entry
            </ThemedText>
          </View>
        </Clickable>
      </SurfaceCard>

      {pastEntries.length > 0 && (
        <View style={styles.timelineSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Past Entries
          </ThemedText>
          {pastEntries.map((entry) => (
            <JournalTimelineEntry key={entry.id} entry={entry} palette={palette} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: { ...Typography.subheading },
  privateTag: { ...Typography.caption },
  coachNotes: { ...Typography.body },
  textInput: {
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  fieldLabel: {
    ...Typography.bodySemiBold,
    marginTop: Spacing.xs,
  },
  saveButton: {
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveButtonText: { ...Typography.bodySemiBold },
  timelineSection: { gap: Spacing.sm },
});
