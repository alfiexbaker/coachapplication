import { useState, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { activeObjectives, getChildrenForParent } from '@/constants/mock-data';
import { hasChildren } from '@/utils/user-helpers';
import type { AthleteObjective, FootballObjective } from '@/constants/types';

const FOOTBALL_OBJECTIVES: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

export default function ObjectivesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [objectives, setObjectives] = useState<AthleteObjective[]>(activeObjectives);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<AthleteObjective | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<FootballObjective>('Dribbling');
  const [note, setNote] = useState('');
  const [targetSessions, setTargetSessions] = useState('10');

  // Parent-specific: child selection
  const children = useMemo(() => {
    if (currentUser && hasChildren(currentUser)) {
      return getChildrenForParent(currentUser.id);
    }
    return [];
  }, [currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : ''
  );

  // Filter objectives by selected child for parents
  const filteredObjectives = useMemo(() => {
    if (hasChildren(currentUser) && selectedChildId) {
      // For parents, filter by the selected child's athleteId
      return objectives.filter((obj) => obj.athleteId === selectedChildId);
    }
    // For USER (athlete), show only their own objectives
    return objectives.filter((obj) => !obj.athleteId || obj.athleteId === currentUser?.id);
  }, [objectives, currentUser, selectedChildId]);

  const openAddModal = () => {
    setEditingObjective(null);
    setSelectedSkill('Dribbling');
    setNote('');
    setTargetSessions('10');
    setShowModal(true);
  };

  const openEditModal = (objective: AthleteObjective) => {
    setEditingObjective(objective);
    setSelectedSkill(objective.label as FootballObjective);
    setNote(objective.note || '');
    setTargetSessions(objective.targetSessions?.toString() || '10');
    setShowModal(true);
  };

  const saveObjective = () => {
    if (editingObjective) {
      // Edit existing
      setObjectives(
        objectives.map((obj) =>
          obj.id === editingObjective.id
            ? { ...obj, label: selectedSkill, note, targetSessions: parseInt(targetSessions) }
            : obj
        )
      );
    } else {
      // Add new - associate with selected child for parents, or current user for athletes
      const athleteId = hasChildren(currentUser) && selectedChildId
        ? selectedChildId
        : currentUser?.id;
      const newObjective: AthleteObjective = {
        id: `obj-${Date.now()}`,
        athleteId,
        label: selectedSkill,
        status: 'active',
        updatedAt: new Date().toISOString(),
        note,
        coachName: 'Assigned in sessions',
        progress: 0,
        sessionsCompleted: 0,
        startDate: new Date().toISOString().split('T')[0],
        targetSessions: parseInt(targetSessions) || 10,
      };
      setObjectives([...objectives, newObjective]);
    }
    setShowModal(false);
  };

  const deleteObjective = (id: string) => {
    Alert.alert('Delete Goal', 'Remove this goal from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setObjectives(objectives.filter((obj) => obj.id !== id)),
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <FlatList
        data={filteredObjectives}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            {/* Child Selector for Parents */}
            {hasChildren(currentUser) && children.length > 0 && (
              <View style={styles.childSelector}>
                <ThemedText style={[styles.childLabel, { color: palette.muted }]}>
                  ATHLETE
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.childTabs}>
                    {children.map((child) => {
                      const isSelected = child.id === selectedChildId;
                      return (
                        <Pressable
                          key={child.id}
                          onPress={() => setSelectedChildId(child.id)}
                          style={[
                            styles.childTab,
                            {
                              backgroundColor: isSelected ? palette.tint : palette.surface,
                              borderColor: isSelected ? palette.tint : palette.border,
                            },
                          ]}>
                          <ThemedText
                            style={[
                              styles.childTabText,
                              {
                                color: isSelected ? '#fff' : palette.text,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}>
                            {child.name}
                          </ThemedText>
                          {isSelected && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            <ThemedText type="subtitle" style={styles.subtitle}>
              Track {hasChildren(currentUser) ? 'development' : 'your'} football goals
            </ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <SurfaceCard style={styles.objectiveCard}>
            <View style={styles.objectiveHeader}>
              <View style={[styles.iconCircle, { backgroundColor: palette.tint + '20' }]}>
                <Ionicons name="football" size={24} color={palette.tint} />
              </View>
              <View style={styles.objectiveInfo}>
                <ThemedText type="subtitle">{item.label}</ThemedText>
                {item.note && <ThemedText style={styles.noteText}>{item.note}</ThemedText>}
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => openEditModal(item)} hitSlop={8}>
                  <Ionicons name="create-outline" size={22} color={palette.tint} />
                </Pressable>
                <Pressable onPress={() => deleteObjective(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={22} color={palette.error} />
                </Pressable>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressLabel}>Progress</ThemedText>
                <ThemedText style={styles.progressPercent}>{item.progress}%</ThemedText>
              </View>
              <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: palette.tint, width: `${item.progress}%` },
                  ]}
                />
              </View>
            </View>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
                <ThemedText style={styles.statText}>
                  {item.sessionsCompleted}/{item.targetSessions || 10}
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={styles.statText}>{formatDate(item.startDate)}</ThemedText>
              </View>
            </View>
          </SurfaceCard>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
              <Ionicons name="football-outline" size={48} color={palette.muted} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No goals yet
            </ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Start by adding your first development goal
            </ThemedText>
          </View>
        }
      />

      {/* Add Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint },
            pressed && { opacity: 0.8 },
          ]}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText} lightColor="#FFFFFF" darkColor="#000000">
            Add Goal
          </ThemedText>
        </Pressable>
      </View>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={palette.foreground} />
            </Pressable>
            <ThemedText type="subtitle">{editingObjective ? 'Edit Goal' : 'New Goal'}</ThemedText>
            <Pressable onPress={saveObjective}>
              <ThemedText style={[styles.saveButton, { color: palette.tint }]}>Save</ThemedText>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Skill</ThemedText>
              <View style={styles.skillGrid}>
                {FOOTBALL_OBJECTIVES.map((skill) => (
                  <Pressable
                    key={skill}
                    onPress={() => setSelectedSkill(skill)}
                    style={[
                      styles.skillChip,
                      {
                        backgroundColor: selectedSkill === skill ? palette.tint : palette.card,
                        borderColor: selectedSkill === skill ? palette.tint : palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={styles.skillText}
                      lightColor={selectedSkill === skill ? '#FFFFFF' : undefined}
                      darkColor={selectedSkill === skill ? '#000000' : undefined}>
                      {skill}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Goal</ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What do you want to improve?"
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  styles.textInput,
                  styles.textArea,
                  { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground },
                ]}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Target Sessions</ThemedText>
              <TextInput
                value={targetSessions}
                onChangeText={setTargetSessions}
                placeholder="10"
                keyboardType="number-pad"
                placeholderTextColor={palette.muted}
                style={[
                  styles.textInput,
                  { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground },
                ]}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  childSelector: {
    gap: Spacing.xs,
  },
  childLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  childTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  childTabText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  objectiveCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveInfo: {
    flex: 1,
    gap: 4,
  },
  noteText: {
    fontSize: 13,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveButton: {
    fontWeight: '700',
    fontSize: 16,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  skillText: {
    fontWeight: '600',
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
});
