import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry, GroupRegistration, GroupSession } from '@/constants/types';

interface AddAttendeeModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (attendee: {
    athleteId?: string;
    athleteName: string;
    parentId?: string;
    parentName?: string;
    isWalkIn: boolean;
    overrideCapacity?: boolean;
  }) => Promise<void>;
  session: GroupSession | null;
  existingRegistrations: GroupRegistration[];
  coachId: string;
}

type TabType = 'roster' | 'walkin';

export function AddAttendeeModal({
  visible,
  onClose,
  onAdd,
  session,
  existingRegistrations,
  coachId,
}: AddAttendeeModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterAthletes, setRosterAthletes] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Walk-in form state
  const [walkInName, setWalkInName] = useState('');
  const [walkInParentName, setWalkInParentName] = useState('');

  useEffect(() => {
    if (visible) {
      loadRoster();
    }
  }, [visible, coachId]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const roster = await rosterService.getRoster(coachId, { status: 'ACTIVE' });
      setRosterAthletes(roster);
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out athletes already in the session
  const existingAthleteIds = new Set(
    existingRegistrations
      .filter((r) => r.status !== 'CANCELLED')
      .map((r) => r.athleteId)
  );

  const availableAthletes = rosterAthletes.filter((athlete) => {
    // Exclude already registered athletes
    if (existingAthleteIds.has(athlete.athleteId)) return false;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        athlete.athleteName.toLowerCase().includes(query) ||
        athlete.parentName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleAddFromRoster = async (athlete: RosterEntry) => {
    if (!session) return;

    const isFull = session.currentParticipants >= session.maxParticipants;

    if (isFull) {
      Alert.alert(
        'Session Full',
        `This session is at capacity (${session.maxParticipants}). Do you want to add ${athlete.athleteName} anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Waitlist',
            onPress: () => doAddAthlete(athlete, false),
          },
          {
            text: 'Add Anyway',
            style: 'destructive',
            onPress: () => doAddAthlete(athlete, true),
          },
        ]
      );
    } else {
      await doAddAthlete(athlete, false);
    }
  };

  const doAddAthlete = async (athlete: RosterEntry, overrideCapacity: boolean) => {
    setAdding(athlete.athleteId);
    try {
      await onAdd({
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName,
        parentId: athlete.parentId,
        parentName: athlete.parentName,
        isWalkIn: false,
        overrideCapacity,
      });
      // Remove from available list (it will be filtered out on next render)
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add athlete');
    } finally {
      setAdding(null);
    }
  };

  const handleAddWalkIn = async () => {
    if (!walkInName.trim()) {
      Alert.alert('Error', 'Please enter the athlete name');
      return;
    }

    if (!session) return;

    const isFull = session.currentParticipants >= session.maxParticipants;

    if (isFull) {
      Alert.alert(
        'Session Full',
        `This session is at capacity (${session.maxParticipants}). Do you want to add this walk-in anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Waitlist',
            onPress: () => doAddWalkIn(false),
          },
          {
            text: 'Add Anyway',
            style: 'destructive',
            onPress: () => doAddWalkIn(true),
          },
        ]
      );
    } else {
      await doAddWalkIn(false);
    }
  };

  const doAddWalkIn = async (overrideCapacity: boolean) => {
    setAdding('walkin');
    try {
      await onAdd({
        athleteName: walkInName.trim(),
        parentName: walkInParentName.trim() || undefined,
        isWalkIn: true,
        overrideCapacity,
      });
      setWalkInName('');
      setWalkInParentName('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add walk-in');
    } finally {
      setAdding(null);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setWalkInName('');
    setWalkInParentName('');
    setActiveTab('roster');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: palette.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.title}>
            Add Attendee
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Session info */}
        {session && (
          <View style={[styles.sessionInfo, { backgroundColor: palette.surface }]}>
            <ThemedText type="defaultSemiBold">{session.title}</ThemedText>
            <ThemedText style={[styles.capacityText, { color: palette.muted }]}>
              {session.currentParticipants} / {session.maxParticipants} registered
              {session.currentParticipants >= session.maxParticipants && (
                <ThemedText style={{ color: palette.warning }}> (Full)</ThemedText>
              )}
            </ThemedText>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <Clickable
            onPress={() => setActiveTab('roster')}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === 'roster' ? palette.tint : palette.surface,
                borderColor: activeTab === 'roster' ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name="people"
              size={18}
              color={activeTab === 'roster' ? '#fff' : palette.text}
            />
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === 'roster' ? '#fff' : palette.text },
              ]}
            >
              From Roster
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => setActiveTab('walkin')}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === 'walkin' ? palette.tint : palette.surface,
                borderColor: activeTab === 'walkin' ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name="person-add"
              size={18}
              color={activeTab === 'walkin' ? '#fff' : palette.text}
            />
            <ThemedText
              style={[
                styles.tabText,
                { color: activeTab === 'walkin' ? '#fff' : palette.text },
              ]}
            >
              Walk-in
            </ThemedText>
          </Clickable>
        </View>

        {activeTab === 'roster' ? (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchInput, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Ionicons name="search" size={18} color={palette.muted} />
                <TextInput
                  style={[styles.searchText, { color: palette.text }]}
                  placeholder="Search athletes..."
                  placeholderTextColor={palette.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Clickable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={palette.muted} />
                  </Clickable>
                )}
              </View>
            </View>

            {/* Athlete List */}
            <ScrollView
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
                </View>
              ) : availableAthletes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={palette.muted} />
                  <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                    {searchQuery ? 'No athletes found' : 'All athletes registered'}
                  </ThemedText>
                  <ThemedText style={[styles.emptyMessage, { color: palette.muted }]}>
                    {searchQuery
                      ? 'Try a different search term'
                      : 'All athletes from your roster are already in this session'}
                  </ThemedText>
                </View>
              ) : (
                availableAthletes.map((athlete) => (
                  <SurfaceCard key={athlete.athleteId} style={styles.athleteCard}>
                    <View style={styles.athleteRow}>
                      <View style={[styles.avatar, { backgroundColor: palette.border }]}>
                        <ThemedText style={styles.avatarText}>
                          {athlete.athleteName.slice(0, 2).toUpperCase()}
                        </ThemedText>
                      </View>
                      <View style={styles.athleteInfo}>
                        <ThemedText type="defaultSemiBold">{athlete.athleteName}</ThemedText>
                        <ThemedText style={[styles.parentText, { color: palette.muted }]}>
                          {athlete.parentName}
                        </ThemedText>
                        {athlete.athleteAge && (
                          <ThemedText style={[styles.ageText, { color: palette.muted }]}>
                            Age: {athlete.athleteAge}
                          </ThemedText>
                        )}
                      </View>
                      <Clickable
                        onPress={() => handleAddFromRoster(athlete)}
                        disabled={adding === athlete.athleteId}
                        style={[
                          styles.addButton,
                          {
                            backgroundColor: palette.tint,
                            opacity: adding === athlete.athleteId ? 0.6 : 1,
                          },
                        ]}
                      >
                        {adding === athlete.athleteId ? (
                          <ThemedText style={styles.addButtonText}>...</ThemedText>
                        ) : (
                          <>
                            <Ionicons name="add" size={18} color="#fff" />
                            <ThemedText style={styles.addButtonText}>Add</ThemedText>
                          </>
                        )}
                      </Clickable>
                    </View>
                  </SurfaceCard>
                ))
              )}
            </ScrollView>
          </>
        ) : (
          /* Walk-in Form */
          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <ThemedText type="defaultSemiBold" style={styles.formLabel}>
                Athlete Name *
              </ThemedText>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="Enter athlete name"
                placeholderTextColor={palette.muted}
                value={walkInName}
                onChangeText={setWalkInName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formSection}>
              <ThemedText type="defaultSemiBold" style={styles.formLabel}>
                Parent/Guardian Name (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="Enter parent name"
                placeholderTextColor={palette.muted}
                value={walkInParentName}
                onChangeText={setWalkInParentName}
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="information-circle" size={20} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.text }]}>
                Walk-ins are temporary attendees not in your roster. They can be converted to
                full roster entries later.
              </ThemedText>
            </View>

            <Clickable
              onPress={handleAddWalkIn}
              disabled={!walkInName.trim() || adding === 'walkin'}
              style={[
                styles.submitButton,
                {
                  backgroundColor: palette.tint,
                  opacity: !walkInName.trim() || adding === 'walkin' ? 0.6 : 1,
                },
              ]}
            >
              {adding === 'walkin' ? (
                <ThemedText style={styles.submitButtonText}>Adding...</ThemedText>
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#fff" />
                  <ThemedText style={styles.submitButtonText}>Add Walk-in</ThemedText>
                </>
              )}
            </Clickable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  title: {
    fontSize: 18,
  },
  sessionInfo: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  capacityText: {
    fontSize: 13,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  athleteCard: {
    padding: Spacing.md,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '600',
  },
  athleteInfo: {
    flex: 1,
  },
  parentText: {
    fontSize: 12,
    marginTop: 2,
  },
  ageText: {
    fontSize: 11,
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formContent: {
    padding: Spacing.lg,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    marginBottom: Spacing.xs,
  },
  formInput: {
    fontSize: 15,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
