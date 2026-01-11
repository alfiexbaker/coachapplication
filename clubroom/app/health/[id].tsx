/**
 * Injury Detail Screen
 *
 * Shows detailed information about a specific injury including
 * recovery timeline, notes, and actions to update status.
 */

import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { RecoveryTimeline } from '@/components/health';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Injury } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

/**
 * Injury detail screen showing full injury information and recovery timeline.
 */
export default function InjuryDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  // State
  const [injury, setInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteProgress, setNoteProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const userId = currentUser?.id ?? 'user1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  // Load injury
  const loadInjury = useCallback(async () => {
    if (!id) return;
    try {
      const data = await injuryService.getInjuryById(id);
      setInjury(data);
      if (data) {
        setNoteProgress(data.recoveryPercent);
      }
    } catch (error) {
      console.error('Failed to load injury:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      loadInjury();
    }, [loadInjury])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInjury();
  }, [loadInjury]);

  // Add recovery note
  const handleAddNote = useCallback(async () => {
    if (!injury || !noteText.trim()) return;

    setSaving(true);
    try {
      const updated = await injuryService.addRecoveryNote(
        injury.id,
        noteText.trim(),
        userId,
        userName,
        noteProgress
      );
      if (updated) {
        setInjury(updated);
        setNoteText('');
        setShowAddNote(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [injury, noteText, noteProgress, userId, userName]);

  // Mark as healed
  const handleMarkHealed = useCallback(() => {
    if (!injury) return;

    Alert.alert(
      'Mark as Healed',
      'Are you sure this injury has fully healed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Healed',
          onPress: async () => {
            setSaving(true);
            try {
              const updated = await injuryService.markAsHealed(injury.id);
              if (updated) {
                setInjury(updated);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              console.error('Failed to mark as healed:', error);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [injury]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingState}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!injury) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>Injury not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const severityInfo = injuryService.getSeverityInfo(injury.severity);
  const statusInfo = injuryService.getStatusInfo(injury.status);
  const bodyPartLabel = injuryService.getBodyPartLabel(injury.bodyPart);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}15` }]}>
          <Ionicons
            name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={statusInfo.color}
          />
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Injury summary */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <ThemedText type="title">{bodyPartLabel}</ThemedText>
              <View style={[styles.severityBadge, { backgroundColor: `${severityInfo.color}15` }]}>
                <ThemedText style={[styles.severityText, { color: severityInfo.color }]}>
                  {severityInfo.label}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              {injury.description}
            </ThemedText>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {injuryService.formatDate(injury.occurredAt)}
                </ThemedText>
              </View>
              {injury.sharedWithCoach && (
                <View style={styles.metaItem}>
                  <Ionicons name="share-social-outline" size={16} color={palette.tint} />
                  <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                    Shared with coach
                  </ThemedText>
                </View>
              )}
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Recovery timeline */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <RecoveryTimeline injury={injury} />
        </Animated.View>

        {/* Add note section */}
        {injury.status !== 'HEALED' && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.addNoteSection}>
            {!showAddNote ? (
              <Button
                variant="secondary"
                onPress={() => {
                  setShowAddNote(true);
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint }}>Add Recovery Note</ThemedText>
                </View>
              </Button>
            ) : (
              <SurfaceCard style={styles.addNoteCard}>
                <ThemedText type="subtitle" style={styles.addNoteTitle}>
                  Add Recovery Note
                </ThemedText>

                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: palette.background,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="How are you feeling? Any improvements?"
                  placeholderTextColor={palette.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
                      Recovery Progress
                    </ThemedText>
                    <ThemedText style={[styles.progressValue, { color: statusInfo.color }]}>
                      {noteProgress}%
                    </ThemedText>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    value={noteProgress}
                    onValueChange={setNoteProgress}
                    minimumTrackTintColor={statusInfo.color}
                    maximumTrackTintColor={palette.border}
                    thumbTintColor={statusInfo.color}
                  />
                </View>

                <View style={styles.addNoteButtons}>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      setShowAddNote(false);
                      setNoteText('');
                      setNoteProgress(injury.recoveryPercent);
                    }}
                    style={styles.addNoteButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleAddNote}
                    disabled={!noteText.trim() || saving}
                    style={styles.addNoteButton}
                  >
                    {saving ? 'Saving...' : 'Save Note'}
                  </Button>
                </View>
              </SurfaceCard>
            )}
          </Animated.View>
        )}

        {/* Actions */}
        {injury.status !== 'HEALED' && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.actionsSection}>
            <Button
              onPress={handleMarkHealed}
              disabled={saving}
              style={[styles.healedButton, { backgroundColor: palette.success }]}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <ThemedText style={styles.healedButtonText}>Mark as Healed</ThemedText>
              </View>
            </Button>
          </Animated.View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    gap: 4,
  },
  statusText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  severityText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  description: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
  addNoteSection: {
    marginTop: Spacing.lg,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addNoteCard: {
    padding: Spacing.md,
  },
  addNoteTitle: {
    marginBottom: Spacing.md,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: scaleFont(15),
    minHeight: 80,
    marginBottom: Spacing.md,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: scaleFont(13),
  },
  progressValue: {
    fontSize: scaleFont(16),
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  addNoteButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addNoteButton: {
    flex: 1,
  },
  actionsSection: {
    marginTop: Spacing.lg,
  },
  healedButton: {
    marginTop: Spacing.sm,
  },
  healedButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
