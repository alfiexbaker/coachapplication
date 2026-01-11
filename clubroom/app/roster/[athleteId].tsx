import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { AthleteNotes } from '@/components/roster/athlete-notes';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry, FootballObjective } from '@/constants/types';

const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [entry, setEntry] = useState<RosterEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  const coachId = currentUser?.id || 'coach_1';

  useEffect(() => {
    loadData();
  }, [athleteId]);

  const loadData = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const data = await rosterService.getRosterEntry(coachId, athleteId);
      setEntry(data);
    } catch (error) {
      console.error('Failed to load athlete:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: RosterEntry['status']) => {
    if (!entry) return;
    try {
      await rosterService.updateStatus(coachId, entry.athleteId, status);
      await loadData();
      setShowStatusModal(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleUpdateFocus = async (focus: FootballObjective) => {
    if (!entry) return;
    try {
      await rosterService.updatePrimaryFocus(coachId, entry.athleteId, focus);
      await loadData();
      setShowFocusModal(false);
    } catch (error) {
      console.error('Failed to update focus:', error);
    }
  };

  const handleAddTag = async () => {
    if (!entry || !newTag.trim()) return;
    try {
      const tags = [...entry.tags, newTag.trim().toLowerCase()];
      await rosterService.updateTags(coachId, entry.athleteId, tags);
      setNewTag('');
      await loadData();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!entry) return;
    try {
      const tags = entry.tags.filter((t) => t !== tag);
      await rosterService.updateTags(coachId, entry.athleteId, tags);
      await loadData();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!entry) return;
    try {
      await rosterService.addNote(coachId, entry.athleteId, content);
      await loadData();
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!entry) return;
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await rosterService.deleteNote(coachId, entry.athleteId, noteId);
            await loadData();
          } catch (error) {
            console.error('Failed to delete note:', error);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="person-outline"
          title="Athlete not found"
          message="This athlete may have been removed from your roster."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const statusColor = rosterService.getStatusColor(entry.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">{entry.athleteName}</ThemedText>
        </View>
        <Clickable
          onPress={() => {
            Alert.alert(
              'Athlete Options',
              `Actions for ${entry.athleteName}`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send Message',
                  onPress: () => router.push(`/chat?athleteId=${entry.athleteId}`),
                },
                {
                  text: 'Schedule Session',
                  onPress: () => router.push(`/coach/invite?athleteId=${entry.athleteId}`),
                },
                {
                  text: 'View Analytics',
                  onPress: () => router.push(`/analytics/${entry.athleteId}`),
                },
                {
                  text: 'Remove from Roster',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert(
                      'Remove Athlete',
                      `Are you sure you want to remove ${entry.athleteName} from your roster?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: async () => {
                            await rosterService.removeFromRoster(coachId, entry.athleteId);
                            router.back();
                          },
                        },
                      ]
                    );
                  },
                },
              ]
            );
          }}
          hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={24} color={palette.text} />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.springify()}>
          <SurfaceCard style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {entry.athletePhotoUrl ? (
                <Image source={{ uri: entry.athletePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
                  <ThemedText style={styles.avatarText}>
                    {entry.athleteName.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
              )}
              <View style={styles.profileInfo}>
                <ThemedText type="title">{entry.athleteName}</ThemedText>
                <ThemedText style={[styles.age, { color: palette.muted }]}>
                  {entry.athleteAge} years old
                </ThemedText>
                <View style={styles.statusRow}>
                  <Clickable
                    onPress={() => setShowStatusModal(true)}
                    style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <ThemedText style={[styles.statusText, { color: statusColor }]}>
                      {rosterService.formatStatus(entry.status)}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={12} color={statusColor} />
                  </Clickable>
                  <View style={[styles.levelBadge, { backgroundColor: palette.surfaceSecondary }]}>
                    <ThemedText style={[styles.levelText, { color: palette.muted }]}>
                      {entry.athleteSkillLevel}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
              <Ionicons name="calendar" size={20} color={palette.tint} />
              <ThemedText type="heading">{entry.totalSessions}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
              <Ionicons name="cash" size={20} color={palette.success} />
              <ThemedText type="heading">{rosterService.formatRevenue(entry.totalRevenue)}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Revenue</ThemedText>
            </View>
            {entry.averageRating && (
              <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
                <Ionicons name="star" size={20} color="#FFB800" />
                <ThemedText type="heading">{entry.averageRating.toFixed(1)}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Rating</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Parent Contact */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Parent / Guardian</ThemedText>
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <ThemedText type="defaultSemiBold">{entry.parentName}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{entry.parentEmail}</ThemedText>
                {entry.parentPhone && (
                  <ThemedText style={{ color: palette.muted }}>{entry.parentPhone}</ThemedText>
                )}
              </View>
              <View style={styles.contactActions}>
                <Clickable style={[styles.contactButton, { borderColor: palette.border }]}>
                  <Ionicons name="chatbubble-outline" size={18} color={palette.tint} />
                </Clickable>
                <Clickable style={[styles.contactButton, { borderColor: palette.border }]}>
                  <Ionicons name="call-outline" size={18} color={palette.tint} />
                </Clickable>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Primary Focus */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold">Primary Focus</ThemedText>
              <Clickable onPress={() => setShowFocusModal(true)}>
                <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Change</ThemedText>
              </Clickable>
            </View>
            <View style={[styles.focusBadge, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="football-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                {entry.primaryFocus}
              </ThemedText>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Tags */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold">Tags</ThemedText>
              <Clickable onPress={() => setShowTagsModal(true)}>
                <Ionicons name="add-circle" size={22} color={palette.tint} />
              </Clickable>
            </View>
            {entry.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {entry.tags.map((tag) => (
                  <Clickable
                    key={tag}
                    onPress={() => handleRemoveTag(tag)}
                    style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}
                  >
                    <ThemedText style={[styles.tagText, { color: palette.text }]}>{tag}</ThemedText>
                    <Ionicons name="close" size={12} color={palette.muted} />
                  </Clickable>
                ))}
              </View>
            ) : (
              <ThemedText style={{ color: palette.muted }}>No tags added yet</ThemedText>
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Session History */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Session History</ThemedText>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionRow}>
                <ThemedText style={{ color: palette.muted }}>First session</ThemedText>
                <ThemedText>
                  {new Date(entry.startDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
              </View>
              {entry.lastSessionDate && (
                <View style={styles.sessionRow}>
                  <ThemedText style={{ color: palette.muted }}>Last session</ThemedText>
                  <ThemedText>
                    {new Date(entry.lastSessionDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </ThemedText>
                </View>
              )}
              {entry.nextSessionDate && (
                <View style={styles.sessionRow}>
                  <ThemedText style={{ color: palette.muted }}>Next session</ThemedText>
                  <ThemedText style={{ color: palette.success, fontWeight: '600' }}>
                    {new Date(entry.nextSessionDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                </View>
              )}
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Notes */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <AthleteNotes
            notes={entry.notes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Update Status</ThemedText>
              <Clickable onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            </View>
            {(['ACTIVE', 'PAUSED', 'GRADUATED', 'INACTIVE'] as RosterEntry['status'][]).map(
              (status) => (
                <Clickable
                  key={status}
                  onPress={() => handleUpdateStatus(status)}
                  style={[
                    styles.optionRow,
                    entry.status === status && { backgroundColor: `${rosterService.getStatusColor(status)}15` },
                  ]}
                >
                  <View
                    style={[styles.statusDot, { backgroundColor: rosterService.getStatusColor(status) }]}
                  />
                  <ThemedText style={{ flex: 1 }}>{rosterService.formatStatus(status)}</ThemedText>
                  {entry.status === status && (
                    <Ionicons name="checkmark" size={20} color={rosterService.getStatusColor(status)} />
                  )}
                </Clickable>
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Focus Modal */}
      <Modal visible={showFocusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Primary Focus</ThemedText>
              <Clickable onPress={() => setShowFocusModal(false)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            </View>
            {FOCUS_OPTIONS.map((focus) => (
              <Clickable
                key={focus}
                onPress={() => handleUpdateFocus(focus)}
                style={[
                  styles.optionRow,
                  entry.primaryFocus === focus && { backgroundColor: `${palette.tint}15` },
                ]}
              >
                <ThemedText style={{ flex: 1 }}>{focus}</ThemedText>
                {entry.primaryFocus === focus && (
                  <Ionicons name="checkmark" size={20} color={palette.tint} />
                )}
              </Clickable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Tags Modal */}
      <Modal visible={showTagsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Add Tag</ThemedText>
              <Clickable onPress={() => setShowTagsModal(false)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            </View>
            <TextInput
              style={[styles.tagInput, { backgroundColor: palette.background, color: palette.text }]}
              placeholder="Enter tag name..."
              placeholderTextColor={palette.muted}
              value={newTag}
              onChangeText={setNewTag}
              autoFocus
            />
            <Button
              onPress={() => {
                handleAddTag();
                setShowTagsModal(false);
              }}
              disabled={!newTag.trim()}
            >
              Add Tag
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  profileCard: {
    padding: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  age: {
    fontSize: 14,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  card: {
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sessionInfo: {
    gap: Spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
  },
  tagInput: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
});
