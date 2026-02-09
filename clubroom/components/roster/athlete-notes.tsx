import { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { RosterNote } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface AthleteNotesProps {
  notes: RosterNote[];
  onAddNote: (content: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export function AthleteNotes({ notes, onAddNote, onDeleteNote }: AthleteNotesProps) {
  const { colors: palette } = useTheme();

  const [showInput, setShowInput] = useState(false);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      setShowInput(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SurfaceCard style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">Coach Notes</ThemedText>
        <Clickable onPress={() => setShowInput(!showInput)}>
          <Ionicons
            name={showInput ? 'close' : 'add-circle'}
            size={24}
            color={palette.tint}
          />
        </Clickable>
      </View>

      {/* Add Note Input */}
      {showInput && (
        <View style={styles.inputSection}>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
            placeholder="Write a note about this athlete..."
            placeholderTextColor={palette.muted}
            value={newNote}
            onChangeText={setNewNote}
            multiline
            numberOfLines={3}
            autoFocus
          />
          <View style={styles.inputActions}>
            <Clickable
              onPress={() => {
                setNewNote('');
                setShowInput(false);
              }}
              style={[styles.cancelButton, { borderColor: palette.border }]}
            >
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button onPress={handleAddNote} disabled={!newNote.trim()}>
              Save Note
            </Button>
          </View>
        </View>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No notes yet. Add notes to track progress and important information.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.notesList}>
          {notes
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((note) => (
              <View key={note.id} style={[styles.noteCard, { backgroundColor: palette.surfaceSecondary }]}>
                <View style={styles.noteHeader}>
                  <ThemedText style={[styles.noteDate, { color: palette.muted }]}>
                    {formatDate(note.createdAt)}
                  </ThemedText>
                  <Clickable onPress={() => onDeleteNote(note.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                  </Clickable>
                </View>
                <ThemedText style={styles.noteContent}>{note.content}</ThemedText>
              </View>
            ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputSection: {
    gap: Spacing.sm,
  },
  input: { ...Typography.bodySmall, minHeight: 80,
    borderRadius: Radii.md,
    padding: Spacing.md,
    textAlignVertical: 'top' },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.small, textAlign: 'center',
    lineHeight: 18 },
  notesList: {
    gap: Spacing.sm,
  },
  noteCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteDate: { ...Typography.caption },
  noteContent: { ...Typography.bodySmall, lineHeight: 20 },
});
