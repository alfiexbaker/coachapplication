/**
 * AthleteNotesTab — Notes tab for the athlete profile.
 *
 * Coach's private notes with add/edit/delete, primary focus management, and search.
 */

import React, { useState } from 'react';
import { View, TextInput, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { useTheme } from '@/hooks/useTheme';
import { Typography, Spacing, Radii } from '@/constants/theme';
import type { RosterEntry, FootballObjective } from '@/constants/types';

import { NoteCard, PrimaryFocusSection, NoteSearchBar } from './athlete-notes-tab-sections';
import { styles } from './athlete-notes-tab-styles';

// ============================================================================
// TYPES
// ============================================================================

interface AthleteNotesTabProps {
  athlete: RosterEntry;
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateFocus: (focus: FootballObjective) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AthleteNotesTabInner({
  athlete,
  onAddNote,
  onDeleteNote,
  onUpdateFocus,
}: AthleteNotesTabProps) {
  const { colors } = useTheme();
  const [showInput, setShowInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFocusPicker, setShowFocusPicker] = useState(false);

  const handleAddNote = () => {
    if (newNote.trim()) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onAddNote(newNote.trim());
      setNewNote('');
      setShowInput(false);
    }
  };

  const handleToggleFocusPicker = () => {
    setShowFocusPicker((prev) => !prev);
  };

  const handleSelectFocus = (focus: FootballObjective) => {
    onUpdateFocus(focus);
    setShowFocusPicker(false);
  };

  const filteredNotes = (() => {
    let notes = [...athlete.notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      notes = notes.filter((n) => n.content.toLowerCase().includes(q));
    }
    return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  return (
    <Column gap="md" style={styles.container}>
      {/* Primary Focus */}
      <Animated.View entering={FadeInDown.springify()}>
        <PrimaryFocusSection
          primaryFocus={athlete.primaryFocus}
          showPicker={showFocusPicker}
          onTogglePicker={handleToggleFocusPicker}
          onSelectFocus={handleSelectFocus}
          palette={colors}
        />
      </Animated.View>

      {/* Notes Section */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.section}>
          <Row gap="sm" align="center" justify="between">
            <ThemedText type="defaultSemiBold">Coach Notes ({athlete.notes.length})</ThemedText>
            <Clickable
              onPress={() => setShowInput(!showInput)}
              accessibilityLabel={showInput ? 'Close note editor' : 'Add note'}
            >
              <Ionicons name={showInput ? 'close' : 'add-circle'} size={24} color={colors.tint} />
            </Clickable>
          </Row>

          {showInput && (
            <Column gap="sm">
              <ThemedText style={[localStyles.helper, { color: colors.muted }]}>
                Quick notes for coaching reference
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Write a note about this athlete..."
                placeholderTextColor={colors.muted}
                value={newNote}
                onChangeText={setNewNote}
                onBlur={() => setNewNote((value) => value.trim())}
                multiline
                numberOfLines={3}
                maxLength={500}
                autoFocus
                accessibilityLabel="Note content"
              />
              <Row style={localStyles.counterRow}>
                <View style={[localStyles.counterTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      localStyles.counterFill,
                      {
                        width: `${Math.min(100, (newNote.length / 500) * 100)}%`,
                        backgroundColor: newNote.length > 450 ? colors.error : colors.tint,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: newNote.length > 450 ? colors.error : colors.muted },
                  ]}
                >
                  {newNote.length}/500
                </ThemedText>
              </Row>
              <Row gap="sm" justify="end">
                <Clickable
                  onPress={() => {
                    setNewNote('');
                    setShowInput(false);
                  }}
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                >
                  <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
                </Clickable>
                <Button onPress={handleAddNote} disabled={!newNote.trim()} label="Save Note" />
              </Row>
            </Column>
          )}

          {athlete.notes.length > 3 && (
            <NoteSearchBar
              searchQuery={searchQuery}
              onChangeQuery={setSearchQuery}
              palette={colors}
            />
          )}

          {filteredNotes.length === 0 ? (
            <View style={styles.emptyNotes}>
              <Ionicons name="document-text-outline" size={32} color={colors.muted} />
              <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
                {searchQuery
                  ? 'No notes match your search'
                  : 'No notes yet. Add notes to track progress and important information.'}
              </ThemedText>
            </View>
          ) : (
            <Column gap="sm">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onDelete={() => onDeleteNote(note.id)}
                  palette={colors}
                />
              ))}
            </Column>
          )}
        </SurfaceCard>
      </Animated.View>
    </Column>
  );
}

export const AthleteNotesTab = AthleteNotesTabInner;

const localStyles = StyleSheet.create({
  helper: {
    ...Typography.caption,
  },
  counterRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  counterTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  counterFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
});
