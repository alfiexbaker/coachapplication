import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface Athlete {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  photoUrl?: string;
  age?: number;
  lastSession?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  squadId?: string;
  squadName?: string;
  tags?: string[];
}

export interface Squad {
  id: string;
  name: string;
}

type SkillFilter = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type AgeFilter = 'ALL' | 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | '16+';

interface InviteAthleteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (athletes: Athlete[]) => void;
  athletes: Athlete[];
  squads?: Squad[];
  multiSelect?: boolean;
  title?: string;
}

export function InviteAthleteModal({
  visible,
  onClose,
  onSelect,
  athletes,
  squads = [],
  multiSelect = true,
  title = 'Select Athletes',
}: InviteAthleteModalProps) {
  const { colors: palette } = useTheme();

  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('ALL');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('ALL');
  const [squadFilter, setSquadFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // Helper to check age range
  const isInAgeRange = (age: number | undefined, filter: AgeFilter): boolean => {
    if (!age || filter === 'ALL') return true;
    switch (filter) {
      case 'U8':
        return age < 8;
      case 'U10':
        return age >= 8 && age < 10;
      case 'U12':
        return age >= 10 && age < 12;
      case 'U14':
        return age >= 12 && age < 14;
      case 'U16':
        return age >= 14 && age < 16;
      case '16+':
        return age >= 16;
      default:
        return true;
    }
  };

  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      // Search filter
      const matchesSearch =
        athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.parentName.toLowerCase().includes(searchQuery.toLowerCase());

      // Skill level filter
      const matchesSkill =
        skillFilter === 'ALL' || athlete.skillLevel === skillFilter;

      // Age filter
      const matchesAge = isInAgeRange(athlete.age, ageFilter);

      // Squad filter
      const matchesSquad =
        squadFilter === 'ALL' || athlete.squadId === squadFilter;

      return matchesSearch && matchesSkill && matchesAge && matchesSquad;
    });
  }, [athletes, searchQuery, skillFilter, ageFilter, squadFilter]);

  // Get unique squads from athletes if not provided
  const availableSquads = useMemo(() => {
    if (squads.length > 0) return squads;
    const squadMap = new Map<string, string>();
    athletes.forEach((a) => {
      if (a.squadId && a.squadName) {
        squadMap.set(a.squadId, a.squadName);
      }
    });
    return Array.from(squadMap.entries()).map(([id, name]) => ({ id, name }));
  }, [athletes, squads]);

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

  // Select All / Select None
  const selectAll = () => {
    setSelectedAthletes(filteredAthletes);
  };

  const selectNone = () => {
    setSelectedAthletes([]);
  };

  // Quick select helpers
  const selectBySquad = (squadId: string) => {
    const squadAthletes = athletes.filter((a) => a.squadId === squadId);
    setSelectedAthletes(squadAthletes);
    setSquadFilter(squadId);
  };

  const selectBySkillLevel = (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    const levelAthletes = athletes.filter((a) => a.skillLevel === level);
    setSelectedAthletes(levelAthletes);
    setSkillFilter(level);
  };


  const resetFilters = () => {
    setSkillFilter('ALL');
    setAgeFilter('ALL');
    setSquadFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = skillFilter !== 'ALL' || ageFilter !== 'ALL' || squadFilter !== 'ALL';

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
            <Clickable onPress={() => setShowFilters(!showFilters)}>
              <Ionicons
                name={showFilters ? 'options' : 'options-outline'}
                size={20}
                color={hasActiveFilters ? palette.tint : palette.muted}
              />
            </Clickable>
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={[styles.filtersPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.filterRow}>
              <ThemedText style={styles.filterLabel}>Skill Level</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as SkillFilter[]).map((level) => (
                    <Clickable
                      key={level}
                      onPress={() => setSkillFilter(level)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: skillFilter === level ? palette.tint : 'transparent',
                          borderColor: skillFilter === level ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{ ...Typography.caption, color: skillFilter === level ? palette.onPrimary : palette.text }}
                      >
                        {level === 'ALL' ? 'All' : level.charAt(0) + level.slice(1).toLowerCase()}
                      </ThemedText>
                    </Clickable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <ThemedText style={styles.filterLabel}>Age Group</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  {(['ALL', 'U8', 'U10', 'U12', 'U14', 'U16', '16+'] as AgeFilter[]).map((age) => (
                    <Clickable
                      key={age}
                      onPress={() => setAgeFilter(age)}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: ageFilter === age ? palette.tint : 'transparent',
                          borderColor: ageFilter === age ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{ ...Typography.caption, color: ageFilter === age ? palette.onPrimary : palette.text }}
                      >
                        {age === 'ALL' ? 'All' : age}
                      </ThemedText>
                    </Clickable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {availableSquads.length > 0 && (
              <View style={styles.filterRow}>
                <ThemedText style={styles.filterLabel}>Squad</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChips}>
                    <Clickable
                      onPress={() => setSquadFilter('ALL')}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: squadFilter === 'ALL' ? palette.tint : 'transparent',
                          borderColor: squadFilter === 'ALL' ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{ ...Typography.caption, color: squadFilter === 'ALL' ? palette.onPrimary : palette.text }}
                      >
                        All
                      </ThemedText>
                    </Clickable>
                    {availableSquads.map((squad) => (
                      <Clickable
                        key={squad.id}
                        onPress={() => setSquadFilter(squad.id)}
                        style={[
                          styles.filterChip,
                          {
                            backgroundColor: squadFilter === squad.id ? palette.tint : 'transparent',
                            borderColor: squadFilter === squad.id ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={{ ...Typography.caption, color: squadFilter === squad.id ? palette.onPrimary : palette.text }}
                        >
                          {squad.name}
                        </ThemedText>
                      </Clickable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {hasActiveFilters && (
              <Clickable onPress={resetFilters} style={styles.resetButton}>
                <Ionicons name="refresh" size={14} color={palette.tint} />
                <ThemedText style={ { color: palette.tint, ...Typography.caption }}>
                  Reset Filters
                </ThemedText>
              </Clickable>
            )}
          </View>
        )}

        {/* Quick Select Actions */}
        {multiSelect && (
          <View style={styles.quickActionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickActions}>
                <Clickable
                  onPress={selectAll}
                  style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                >
                  <Ionicons name="checkmark-done" size={14} color={palette.tint} />
                  <ThemedText style={ { color: palette.tint, ...Typography.caption }}>
                    Select All ({filteredAthletes.length})
                  </ThemedText>
                </Clickable>
                <Clickable
                  onPress={selectNone}
                  style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                >
                  <ThemedText style={{ ...Typography.caption, color: palette.text }}>Select None</ThemedText>
                </Clickable>
                {availableSquads.map((squad) => (
                  <Clickable
                    key={squad.id}
                    onPress={() => selectBySquad(squad.id)}
                    style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                  >
                    <Ionicons name="people" size={14} color={palette.muted} />
                    <ThemedText style={{ ...Typography.caption, color: palette.text }}>
                      All in {squad.name}
                    </ThemedText>
                  </Clickable>
                ))}
                <Clickable
                  onPress={() => selectBySkillLevel('BEGINNER')}
                  style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                >
                  <ThemedText style={{ ...Typography.caption, color: palette.text }}>Beginners only</ThemedText>
                </Clickable>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Selected Count */}
        {selectedAthletes.length > 0 && (
          <View style={[styles.selectedBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''} selected
            </ThemedText>
            <Clickable onPress={selectNone}>
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
                        backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
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
                      <View style={styles.athleteMeta}>
                        {athlete.age && (
                          <ThemedText style={[styles.athleteAge, { color: palette.muted }]}>
                            Age {athlete.age}
                          </ThemedText>
                        )}
                        {athlete.skillLevel && (
                          <View style={[styles.skillBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                            <ThemedText style={{ ...Typography.micro, color: palette.tint }}>
                              {athlete.skillLevel.charAt(0) + athlete.skillLevel.slice(1).toLowerCase()}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      {athlete.squadName && (
                        <ThemedText style={[styles.squadName, { color: palette.muted }]}>
                          {athlete.squadName}
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
                      {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
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
  searchInput: { ...Typography.body, flex: 1 },
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
  parentName: { ...Typography.smallSemiBold },
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.heading },
  athleteInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  athleteAge: { ...Typography.caption },
  lastSession: { ...Typography.caption },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  filtersPanel: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  filterRow: {
    gap: Spacing.xs,
  },
  filterLabel: { ...Typography.caption },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  quickActionsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  athleteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skillBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  squadName: { ...Typography.caption },
});
