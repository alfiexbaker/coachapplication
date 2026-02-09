/**
 * AthleteNotesTab — Notes tab for the athlete profile.
 *
 * Coach's private notes with add/edit/delete, primary focus management, and search.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry, FootballObjective } from '@/constants/types';

import {
  NoteCard,
  PrimaryFocusSection,
  NoteSearchBar,
  styles,
} from './athlete-notes-tab-sections';

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

  const handleAddNote = useCallback(() => {
    if (newNote.trim()) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onAddNote(newNote.trim());
      setNewNote('');
      setShowInput(false);
    }
  }, [newNote, onAddNote]);

  const handleToggleFocusPicker = useCallback(() => {
    setShowFocusPicker((prev) => !prev);
  }, []);

  const handleSelectFocus = useCallback(
    (focus: FootballObjective) => {
      onUpdateFocus(focus);
      setShowFocusPicker(false);
    },
    [onUpdateFocus]
  );

  const filteredNotes = useMemo(() => {
    let notes = [...athlete.notes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      notes = notes.filter((n) => n.content.toLowerCase().includes(q));
    }
    return notes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [athlete.notes, searchQuery]);

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
            <ThemedText type="defaultSemiBold">
              Coach Notes ({athlete.notes.length})
            </ThemedText>
            <Clickable
              onPress={() => setShowInput(!showInput)}
              accessibilityLabel={showInput ? 'Close note editor' : 'Add note'}
            >
              <Ionicons
                name={showInput ? 'close' : 'add-circle'}
                size={24}
                color={colors.tint}
              />
            </Clickable>
          </Row>

          {showInput && (
            <Column gap="sm">
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, color: colors.text },
                ]}
                placeholder="Write a note about this athlete..."
                placeholderTextColor={colors.muted}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                numberOfLines={3}
                autoFocus
                accessibilityLabel="Note content"
              />
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
                <Button onPress={handleAddNote} disabled={!newNote.trim()}>
                  Save Note
                </Button>
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

export const AthleteNotesTab = React.memo(AthleteNotesTabInner);
