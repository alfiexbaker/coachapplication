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
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MoodOption = {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export interface JournalEntry {
  id: string;
  sessionId: string;
  athleteId: string;
  coachNotes?: string;
  personalNotes: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
}

export interface SessionJournalProps {
  /** Coach's notes for this session (read-only) */
  coachNotes?: string;
  /** Previously saved journal entries for the timeline */
  pastEntries: JournalEntry[];
  /** Called when the athlete saves a new entry */
  onSave: (entry: { personalNotes: string; mood: number; energyLevel: number }) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOOD_OPTIONS: MoodOption[] = [
  { value: 1, label: 'Awful', icon: 'sad-outline' },
  { value: 2, label: 'Meh', icon: 'sad' },
  { value: 3, label: 'OK', icon: 'happy-outline' },
  { value: 4, label: 'Good', icon: 'happy' },
  { value: 5, label: 'Great', icon: 'heart-circle-outline' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MoodSelector({
  selected,
  onSelect,
  palette,
}: {
  selected: number;
  onSelect: (v: number) => void;
  palette: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.moodRow}>
      {MOOD_OPTIONS.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <Clickable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            accessibilityLabel={opt.label}
          >
            <View
              style={[
                styles.moodItem,
                {
                  backgroundColor: isActive ? palette.tint : palette.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={Components.icon.lg}
                color={isActive ? palette.surface : palette.muted}
              />
              <ThemedText
                style={[
                  styles.moodLabel,
                  { color: isActive ? palette.surface : palette.muted },
                ]}
              >
                {opt.label}
              </ThemedText>
            </View>
          </Clickable>
        );
      })}
    </View>
  );
}

function StarRating({
  value,
  onChange,
  palette,
}: {
  value: number;
  onChange: (v: number) => void;
  palette: (typeof Colors)['light'];
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Clickable
          key={star}
          onPress={() => onChange(star)}
          accessibilityLabel={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={Components.icon.xl}
            color={star <= value ? palette.warning : palette.muted}
          />
        </Clickable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SessionJournal({ coachNotes, pastEntries, onSave }: SessionJournalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
      {/* Coach notes (read-only) */}
      {coachNotes ? (
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="clipboard-outline" size={Components.icon.md} color={palette.tint} />
            <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
              Coach&apos;s Notes
            </ThemedText>
          </View>
          <ThemedText style={[styles.coachNotes, { color: palette.foreground }]}>
            {coachNotes}
          </ThemedText>
        </SurfaceCard>
      ) : null}

      {/* Personal notes input */}
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="journal-outline" size={Components.icon.md} color={palette.tint} />
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            My Notes
          </ThemedText>
          <ThemedText style={[styles.privateTag, { color: palette.muted }]}>(private)</ThemedText>
        </View>

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

        {/* Mood selector */}
        <ThemedText style={[styles.fieldLabel, { color: palette.foreground }]}>
          How I Felt
        </ThemedText>
        <MoodSelector selected={mood} onSelect={setMood} palette={palette} />

        {/* Energy level */}
        <ThemedText style={[styles.fieldLabel, { color: palette.foreground }]}>
          Energy Level
        </ThemedText>
        <StarRating value={energy} onChange={setEnergy} palette={palette} />

        {/* Save button */}
        <Clickable onPress={handleSave} accessibilityLabel="Save Entry">
          <View style={[styles.saveButton, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.saveButtonText, { color: palette.surface }]}>
              Save Entry
            </ThemedText>
          </View>
        </Clickable>
      </SurfaceCard>

      {/* Timeline of past entries */}
      {pastEntries.length > 0 && (
        <View style={styles.timelineSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Past Entries
          </ThemedText>

          {pastEntries.map((entry) => {
            const moodOpt = MOOD_OPTIONS.find((m) => m.value === entry.mood) ?? MOOD_OPTIONS[2];
            const entryDate = new Date(entry.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <View key={entry.id} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: palette.tint }]} />
                <SurfaceCard style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <ThemedText style={[styles.timelineDate, { color: palette.muted }]}>
                      {entryDate}
                    </ThemedText>
                    <View style={styles.timelineIcons}>
                      <Ionicons name={moodOpt.icon} size={Components.icon.sm} color={palette.muted} />
                      <View style={styles.miniStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= entry.energyLevel ? 'star' : 'star-outline'}
                            size={10}
                            color={s <= entry.energyLevel ? palette.warning : palette.muted}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <ThemedText
                    style={[styles.timelineText, { color: palette.foreground }]}
                    numberOfLines={3}
                  >
                    {entry.personalNotes}
                  </ThemedText>
                </SurfaceCard>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  privateTag: {
    ...Typography.caption,
  },
  coachNotes: {
    ...Typography.body,
  },
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
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  moodItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.md,
    minWidth: 56,
    gap: Spacing.xs / 2,
  },
  moodLabel: {
    ...Typography.micro,
  },
  starRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  saveButton: {
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveButtonText: {
    ...Typography.bodySemiBold,
  },
  timelineSection: {
    gap: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.sm,
  },
  timelineCard: {
    flex: 1,
    gap: Spacing.xs,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    ...Typography.caption,
  },
  timelineIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  miniStars: {
    flexDirection: 'row',
    gap: 1,
  },
  timelineText: {
    ...Typography.body,
  },
});
