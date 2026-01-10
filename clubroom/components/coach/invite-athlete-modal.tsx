import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface Athlete {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  photoUrl?: string;
  age?: number;
  lastSession?: string;
}

interface InviteAthleteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (athletes: Athlete[]) => void;
  athletes: Athlete[];
  multiSelect?: boolean;
  title?: string;
}

export function InviteAthleteModal({
  visible,
  onClose,
  onSelect,
  athletes,
  multiSelect = true,
  title = 'Select Athletes',
}: InviteAthleteModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.parentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAthlete = (athlete: Athlete) => {
    if (multiSelect) {
      const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
      if (isSelected) {
        setSelectedAthletes(selectedAthletes.filter((a) => a.id !== athlete.id));
      } else {
        setSelectedAthletes([...selectedAthletes, athlete]);
      }
    } else {
      setSelectedAthletes([athlete]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedAthletes);
    setSelectedAthletes([]);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedAthletes([]);
    setSearchQuery('');
    onClose();
  };

  // Group athletes by parent
  const groupedByParent = filteredAthletes.reduce((acc, athlete) => {
    if (!acc[athlete.parentId]) {
      acc[athlete.parentId] = {
        parentName: athlete.parentName,
        athletes: [],
      };
    }
    acc[athlete.parentId].athletes.push(athlete);
    return acc;
  }, {} as Record<string, { parentName: string; athletes: Athlete[] }>);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Clickable onPress={handleConfirm} disabled={selectedAthletes.length === 0}>
            <ThemedText
              style={{
                color: selectedAthletes.length > 0 ? palette.tint : palette.muted,
                fontWeight: '600',
              }}
            >
              Done
            </ThemedText>
          </Clickable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search athletes or parents..."
              placeholderTextColor={palette.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Clickable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </Clickable>
            )}
          </View>
        </View>

        {/* Selected Count */}
        {selectedAthletes.length > 0 && (
          <View style={[styles.selectedBanner, { backgroundColor: `${palette.tint}10` }]}>
            <ThemedText style={{ color: palette.tint }}>
              {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''} selected
            </ThemedText>
            <Clickable onPress={() => setSelectedAthletes([])}>
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Clear</ThemedText>
            </Clickable>
          </View>
        )}

        {/* Athlete List */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedByParent).map(([parentId, group]) => (
            <View key={parentId} style={styles.parentGroup}>
              <View style={styles.parentHeader}>
                <Ionicons name="people-outline" size={16} color={palette.muted} />
                <ThemedText style={[styles.parentName, { color: palette.muted }]}>
                  {group.parentName}
                </ThemedText>
              </View>

              {group.athletes.map((athlete) => {
                const isSelected = selectedAthletes.some((a) => a.id === athlete.id);

                return (
                  <Clickable
                    key={athlete.id}
                    onPress={() => toggleAthlete(athlete)}
                    style={[
                      styles.athleteItem,
                      {
                        backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
                      {athlete.photoUrl ? (
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {athlete.name.charAt(0)}
                        </ThemedText>
                      ) : (
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {athlete.name.charAt(0)}
                        </ThemedText>
                      )}
                    </View>

                    <View style={styles.athleteInfo}>
                      <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
                      {athlete.age && (
                        <ThemedText style={[styles.athleteAge, { color: palette.muted }]}>
                          Age {athlete.age}
                        </ThemedText>
                      )}
                      {athlete.lastSession && (
                        <ThemedText style={[styles.lastSession, { color: palette.muted }]}>
                          Last session: {athlete.lastSession}
                        </ThemedText>
                      )}
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected ? palette.tint : 'transparent',
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </Clickable>
                );
              })}
            </View>
          ))}

          {filteredAthletes.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={40} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
                {searchQuery ? 'No athletes found' : 'No athletes in your roster'}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
  },
  parentGroup: {
    gap: Spacing.sm,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  parentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  athleteInfo: {
    flex: 1,
    gap: 2,
  },
  athleteAge: {
    fontSize: 12,
  },
  lastSession: {
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
});
