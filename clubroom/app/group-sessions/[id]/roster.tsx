import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ParticipantCard } from '@/components/group/participant-card';
import { Button } from '@/components/primitives/button';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { groupSessionService } from '@/services/group-session-service';
import { injuryService } from '@/services/injury-service';
import type { GroupSession, GroupRegistration, BodyPart, InjurySeverity } from '@/constants/types';

const logger = createLogger('SessionRosterScreen');

type FilterType = 'all' | 'registered' | 'waitlisted' | 'attended';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked';

export default function SessionRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showRollCall, setShowRollCall] = useState(false);
  const [rollCallAttendance, setRollCallAttendance] = useState<Record<string, AttendanceStatus>>({});

  // Injury Report State
  const [showInjuryReport, setShowInjuryReport] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<GroupRegistration | null>(null);
  const [injuryBodyPart, setInjuryBodyPart] = useState<BodyPart | null>(null);
  const [injurySeverity, setInjurySeverity] = useState<InjurySeverity>('MINOR');
  const [injuryDescription, setInjuryDescription] = useState('');
  const [savingInjury, setSavingInjury] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
    } catch (error) {
      logger.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAttendance = async (registration: GroupRegistration, attended: boolean) => {
    if (!session) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    try {
      await groupSessionService.markAttendance(registration.id, date, attended);
      await loadData();
    } catch (error) {
      logger.error('Failed to mark attendance:', error);
      Alert.alert('Error', 'Failed to update attendance.');
    }
  };

  const handleCancelRegistration = async (registration: GroupRegistration) => {
    Alert.alert(
      'Cancel Registration',
      `Remove ${registration.athleteName} from this session?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupSessionService.cancelRegistration(registration.id);
              await loadData();
            } catch (error) {
              logger.error('Failed to cancel registration:', error);
            }
          },
        },
      ]
    );
  };

  // Roll Call Functions
  const startRollCall = () => {
    // Initialize roll call attendance from current roster
    const initialAttendance: Record<string, AttendanceStatus> = {};
    roster
      .filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED')
      .forEach(r => {
        initialAttendance[r.id] = r.status === 'ATTENDED' ? 'present' : 'unmarked';
      });
    setRollCallAttendance(initialAttendance);
    setShowRollCall(true);
  };

  const markRollCallStatus = (registrationId: string, status: AttendanceStatus) => {
    setRollCallAttendance(prev => ({
      ...prev,
      [registrationId]: status,
    }));
  };

  const saveRollCall = async () => {
    if (!session) return;
    const date = session.schedule[0]?.date;
    if (!date) return;

    try {
      // Mark each participant's attendance
      for (const [registrationId, status] of Object.entries(rollCallAttendance)) {
        if (status === 'present' || status === 'late') {
          await groupSessionService.markAttendance(registrationId, date, true);
        } else if (status === 'absent') {
          await groupSessionService.markAttendance(registrationId, date, false);
        }
      }
      await loadData();
      setShowRollCall(false);
      Alert.alert('Success', 'Roll call saved successfully!');
    } catch (error) {
      logger.error('Failed to save roll call:', error);
      Alert.alert('Error', 'Failed to save roll call. Please try again.');
    }
  };

  // Injury Report Functions
  const openInjuryReport = (registration: GroupRegistration) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedParticipant(registration);
    setInjuryBodyPart(null);
    setInjurySeverity('MINOR');
    setInjuryDescription('');
    setShowInjuryReport(true);
  };

  const submitInjuryReport = async () => {
    if (!selectedParticipant || !injuryBodyPart || !injuryDescription.trim()) {
      Alert.alert('Missing Information', 'Please select a body part and provide a description.');
      return;
    }

    setSavingInjury(true);
    try {
      const sessionContext = session ? ` during ${session.title}` : '';
      await injuryService.logInjury(
        selectedParticipant.athleteId,
        {
          bodyPart: injuryBodyPart,
          severity: injurySeverity,
          description: injuryDescription.trim() + sessionContext,
          occurredAt: new Date().toISOString(),
          sharedWithCoach: true,
        },
        selectedParticipant.athleteName
      );

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowInjuryReport(false);
      Alert.alert(
        'Injury Reported',
        `Injury logged for ${selectedParticipant.athleteName}. The athlete can track their recovery in the Health section.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Failed to report injury:', error);
      Alert.alert('Error', 'Failed to report injury. Please try again.');
    } finally {
      setSavingInjury(false);
    }
  };

  // Body parts grouped by category for quick selection
  const bodyPartCategories: { label: string; parts: { part: BodyPart; label: string }[] }[] = [
    {
      label: 'Lower Body',
      parts: [
        { part: 'LEFT_ANKLE', label: 'L. Ankle' },
        { part: 'RIGHT_ANKLE', label: 'R. Ankle' },
        { part: 'LEFT_KNEE', label: 'L. Knee' },
        { part: 'RIGHT_KNEE', label: 'R. Knee' },
        { part: 'LEFT_THIGH', label: 'L. Thigh' },
        { part: 'RIGHT_THIGH', label: 'R. Thigh' },
        { part: 'LEFT_CALF', label: 'L. Calf' },
        { part: 'RIGHT_CALF', label: 'R. Calf' },
        { part: 'LEFT_FOOT', label: 'L. Foot' },
        { part: 'RIGHT_FOOT', label: 'R. Foot' },
      ],
    },
    {
      label: 'Upper Body',
      parts: [
        { part: 'LEFT_SHOULDER', label: 'L. Shoulder' },
        { part: 'RIGHT_SHOULDER', label: 'R. Shoulder' },
        { part: 'LEFT_ARM', label: 'L. Arm' },
        { part: 'RIGHT_ARM', label: 'R. Arm' },
        { part: 'LEFT_WRIST', label: 'L. Wrist' },
        { part: 'RIGHT_WRIST', label: 'R. Wrist' },
        { part: 'LEFT_HAND', label: 'L. Hand' },
        { part: 'RIGHT_HAND', label: 'R. Hand' },
      ],
    },
    {
      label: 'Core & Head',
      parts: [
        { part: 'HEAD', label: 'Head' },
        { part: 'NECK', label: 'Neck' },
        { part: 'CHEST', label: 'Chest' },
        { part: 'UPPER_BACK', label: 'Upper Back' },
        { part: 'LOWER_BACK', label: 'Lower Back' },
        { part: 'ABDOMEN', label: 'Abdomen' },
      ],
    },
  ];

  const severityOptions: { value: InjurySeverity; label: string; color: string }[] = [
    { value: 'MINOR', label: 'Minor', color: palette.warning },
    { value: 'MODERATE', label: 'Moderate', color: '#F97316' }, // Decorative: orange severity, between warning and error
    { value: 'SEVERE', label: 'Severe', color: palette.error },
  ];

  // Calculate roll call stats
  const rollCallStats = useMemo(() => {
    const entries = Object.entries(rollCallAttendance);
    return {
      total: entries.length,
      present: entries.filter(([, s]) => s === 'present').length,
      late: entries.filter(([, s]) => s === 'late').length,
      absent: entries.filter(([, s]) => s === 'absent').length,
      unmarked: entries.filter(([, s]) => s === 'unmarked').length,
    };
  }, [rollCallAttendance]);

  // Get registered participants for roll call
  const rollCallParticipants = roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED');

  const filteredRoster = roster.filter((r) => {
    switch (filter) {
      case 'registered':
        return r.status === 'REGISTERED';
      case 'waitlisted':
        return r.status === 'WAITLISTED';
      case 'attended':
        return r.status === 'ATTENDED';
      default:
        return true;
    }
  });

  const registeredCount = roster.filter((r) => r.status === 'REGISTERED' || r.status === 'ATTENDED').length;
  const waitlistedCount = roster.filter((r) => r.status === 'WAITLISTED').length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: roster.length },
    { key: 'registered', label: 'Registered', count: registeredCount },
    { key: 'waitlisted', label: 'Waitlist', count: waitlistedCount },
    { key: 'attended', label: 'Attended' },
  ];

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Roster</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {session?.title}
          </ThemedText>
        </View>
        {registeredCount > 0 && (
          <Pressable
            style={[styles.rollCallButton, { backgroundColor: palette.success }]}
            onPress={startRollCall}
          >
            <Ionicons name="clipboard-outline" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySmallSemiBold }}>Roll Call</ThemedText>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.tint }}>
            {registeredCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Registered</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.warning }}>
            {waitlistedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Waitlist</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.success }}>
            {session?.maxParticipants || 0}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Capacity</ThemedText>
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {filters.map((f) => (
          <Clickable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? palette.tint : palette.surface,
                borderColor: filter === f.key ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === f.key ? palette.onPrimary : palette.text },
              ]}
            >
              {f.label}
              {f.count !== undefined && ` (${f.count})`}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      {/* Roster List */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredRoster.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No participants"
            message={
              filter !== 'all'
                ? `No ${filter} participants yet`
                : 'No one has registered for this session yet'
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredRoster.map((registration, index) => (
              <Animated.View key={registration.id} entering={FadeInDown.delay(index * 50).springify()}>
                <ParticipantCard
                  registration={registration}
                  onMarkAttendance={(attended) => handleMarkAttendance(registration, attended)}
                  onCancel={() => handleCancelRegistration(registration)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Roll Call Modal */}
      <Modal
        visible={showRollCall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRollCall(false)}
      >
        <SafeAreaView style={[styles.rollCallContainer, { backgroundColor: palette.background }]} edges={['top']}>
          {/* Roll Call Header */}
          <View style={[styles.rollCallHeader, { borderBottomColor: palette.border }]}>
            <Pressable onPress={() => setShowRollCall(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText type="defaultSemiBold" style={{ ...Typography.heading }}>Roll Call</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.small }}>{session?.title}</ThemedText>
            </View>
            <Pressable
              style={[
                styles.saveRollCallButton,
                { backgroundColor: rollCallStats.unmarked === 0 ? palette.success : palette.border },
              ]}
              onPress={saveRollCall}
              disabled={rollCallStats.unmarked > 0}
            >
              <ThemedText style={{ color: rollCallStats.unmarked === 0 ? palette.onPrimary : palette.muted, fontWeight: '600' }}>
                Save
              </ThemedText>
            </Pressable>
          </View>

          {/* Roll Call Stats */}
          <Animated.View entering={FadeIn.delay(100)} style={[styles.rollCallStats, { backgroundColor: palette.surface }]}>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.success }]} />
              <ThemedText style={{ ...Typography.small }}>Present</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {rollCallStats.present}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.warning }]} />
              <ThemedText style={{ ...Typography.small }}>Late</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
                {rollCallStats.late}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.error }]} />
              <ThemedText style={{ ...Typography.small }}>Absent</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
                {rollCallStats.absent}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.muted }]} />
              <ThemedText style={{ ...Typography.small }}>Remaining</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.muted }}>
                {rollCallStats.unmarked}
              </ThemedText>
            </View>
          </Animated.View>

          {/* Roll Call List */}
          <ScrollView style={styles.rollCallList} showsVerticalScrollIndicator={false}>
            {rollCallParticipants.map((registration, index) => {
              const status = rollCallAttendance[registration.id] || 'unmarked';
              return (
                <Animated.View
                  key={registration.id}
                  entering={FadeInDown.delay(index * 30).springify()}
                  style={[styles.rollCallItem, { backgroundColor: palette.surface }]}
                >
                  <View style={styles.rollCallItemInfo}>
                    <View style={[styles.rollCallAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                      <ThemedText style={{ color: palette.tint, ...Typography.bodySmallSemiBold }}>
                        {registration.athleteName.split(' ').map(n => n[0]).join('')}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{registration.athleteName}</ThemedText>
                      {registration.parentName && (
                        <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                          Parent: {registration.parentName}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={styles.rollCallActions}>
                    <Pressable
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'present' ? palette.success : 'transparent',
                          borderColor: status === 'present' ? palette.success : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'present')}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={status === 'present' ? palette.onPrimary : palette.success}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'late' ? palette.warning : 'transparent',
                          borderColor: status === 'late' ? palette.warning : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'late')}
                    >
                      <Ionicons
                        name="time"
                        size={18}
                        color={status === 'late' ? palette.onPrimary : palette.warning}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'absent' ? palette.error : 'transparent',
                          borderColor: status === 'absent' ? palette.error : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'absent')}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={status === 'absent' ? palette.onPrimary : palette.error}
                      />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.injuryButton,
                        { backgroundColor: withAlpha(palette.error, 0.09), borderColor: withAlpha(palette.error, 0.19) },
                      ]}
                      onPress={() => openInjuryReport(registration)}
                    >
                      <Ionicons name="medkit" size={16} color={palette.error} />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Quick Actions */}
          <View style={[styles.rollCallQuickActions, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              onPress={() => {
                const updated = { ...rollCallAttendance };
                rollCallParticipants.forEach(r => { updated[r.id] = 'present'; });
                setRollCallAttendance(updated);
              }}
            >
              <Ionicons name="checkmark-done" size={18} color={palette.success} />
              <ThemedText style={{ color: palette.success, ...Typography.smallSemiBold }}>All Present</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: withAlpha(palette.muted, 0.09) }]}
              onPress={() => {
                const updated = { ...rollCallAttendance };
                rollCallParticipants.forEach(r => { updated[r.id] = 'unmarked'; });
                setRollCallAttendance(updated);
              }}
            >
              <Ionicons name="refresh" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, ...Typography.smallSemiBold }}>Reset</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Injury Report Modal */}
      <Modal
        visible={showInjuryReport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInjuryReport(false)}
      >
        <SafeAreaView style={[styles.injuryModalContainer, { backgroundColor: palette.background }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.injuryModalHeader, { borderBottomColor: palette.border }]}>
            <Pressable onPress={() => setShowInjuryReport(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText type="defaultSemiBold" style={{ ...Typography.heading }}>Report Injury</ThemedText>
              {selectedParticipant && (
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                  {selectedParticipant.athleteName}
                </ThemedText>
              )}
            </View>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.injuryModalContent} showsVerticalScrollIndicator={false}>
            {/* Severity Selector */}
            <View style={styles.injurySection}>
              <ThemedText type="defaultSemiBold" style={styles.injurySectionTitle}>Severity</ThemedText>
              <View style={styles.severityRow}>
                {severityOptions.map(option => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.severityOption,
                      {
                        backgroundColor: injurySeverity === option.value ? option.color : withAlpha(option.color, 0.09),
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => setInjurySeverity(option.value)}
                  >
                    <ThemedText style={{ color: injurySeverity === option.value ? palette.onPrimary : option.color, ...Typography.smallSemiBold }}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Body Part Selector */}
            <View style={styles.injurySection}>
              <ThemedText type="defaultSemiBold" style={styles.injurySectionTitle}>Body Part *</ThemedText>
              {bodyPartCategories.map(category => (
                <View key={category.label} style={styles.bodyPartCategory}>
                  <ThemedText style={[styles.categoryLabel, { color: palette.muted }]}>{category.label}</ThemedText>
                  <View style={styles.bodyPartGrid}>
                    {category.parts.map(({ part, label }) => (
                      <Pressable
                        key={part}
                        style={[
                          styles.bodyPartChip,
                          {
                            backgroundColor: injuryBodyPart === part ? palette.tint : palette.surface,
                            borderColor: injuryBodyPart === part ? palette.tint : palette.border,
                          },
                        ]}
                        onPress={() => setInjuryBodyPart(part)}
                      >
                        <ThemedText style={{ color: injuryBodyPart === part ? palette.onPrimary : palette.text, ...Typography.caption }}>
                          {label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Description */}
            <View style={styles.injurySection}>
              <ThemedText type="defaultSemiBold" style={styles.injurySectionTitle}>Description *</ThemedText>
              <TextInput
                style={[
                  styles.injuryTextInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={injuryDescription}
                onChangeText={setInjuryDescription}
                placeholder="What happened? How did the injury occur?"
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Info Note */}
            <View style={[styles.injuryInfoNote, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <Ionicons name="information-circle" size={20} color={palette.tint} />
              <ThemedText style={{ color: palette.muted, ...Typography.small, flex: 1 }}>
                This injury will be logged to the athlete&apos;s health records and automatically shared with their parent/guardian.
              </ThemedText>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.injuryModalFooter, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
            <Button
              onPress={submitInjuryReport}
              disabled={savingInjury || !injuryBodyPart || !injuryDescription.trim()}
              style={{ flex: 1 }}
            >
              {savingInjury ? 'Submitting...' : 'Report Injury'}
            </Button>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterText: {
    ...Typography.smallSemiBold,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.sm,
  },
  // Roll Call Button
  rollCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  // Roll Call Modal Styles
  rollCallContainer: {
    flex: 1,
  },
  rollCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveRollCallButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  rollCallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  rollCallStatItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  rollCallStatDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  rollCallList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  rollCallItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  rollCallItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rollCallAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollCallActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  rollCallActionButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollCallQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderTopWidth: 1,
    paddingBottom: Spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  // Injury Button in Roll Call
  injuryButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
  },
  // Injury Modal Styles
  injuryModalContainer: {
    flex: 1,
  },
  injuryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  injuryModalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  injurySection: {
    marginBottom: Spacing.lg,
  },
  injurySectionTitle: {
    marginBottom: Spacing.sm,
  },
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  bodyPartCategory: {
    marginBottom: Spacing.md,
  },
  categoryLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  bodyPartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  bodyPartChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  injuryTextInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    minHeight: 100,
  },
  injuryInfoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  injuryModalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
