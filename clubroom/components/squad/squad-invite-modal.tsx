/**
 * Squad Invite Modal
 *
 * Full-featured modal for inviting squads to sessions, matches, or events.
 * Supports:
 * - Single or multiple squad selection
 * - Member preview with exclusion capability
 * - Send confirmation
 */

import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SquadInviteModal');
import type { ClubSquad, SquadMember, TimeSlot } from '@/constants/types';
import { squadService } from '@/services/squad-service';
import {
  inviteService as bulkInviteService,
  type SquadInvitePreview,
} from '@/services/invite-service';

type InviteType = 'SESSION' | 'MATCH' | 'EVENT';
type Step = 'squads' | 'preview' | 'confirm';

interface SquadInviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: { squadInviteId: string; successful: number; failed: number }) => void;
  clubId: string;
  inviteType: InviteType;
  targetId: string;
  targetTitle: string;
  // Session-specific props
  sessionProps?: {
    coachId: string;
    coachName: string;
    coachPhotoUrl?: string;
    clubName?: string;
    proposedSlots: TimeSlot[];
    sessionType: string;
    focus: string;
    notes?: string;
    priceUsd?: number;
  };
  // Match-specific props
  matchProps?: {
    opponent: string;
    homeAway: 'HOME' | 'AWAY';
    location: string;
    scheduledAt: string;
    coachId: string;
    coachName: string;
    notes?: string;
  };
  // Event-specific props
  eventProps?: {
    description: string;
    eventType: 'TOURNAMENT' | 'SOCIAL' | 'TRAINING_CAMP' | 'PRESENTATION' | 'FUNDRAISER' | 'OTHER';
    location: string;
    startDate: string;
    endDate?: string;
    maxParticipants?: number;
    priceUsd?: number;
    createdBy: string;
    createdByName: string;
  };
  // Pre-select squads (for match auto-invite)
  preSelectedSquadIds?: string[];
  multiSelect?: boolean;
}

export function SquadInviteModal({
  visible,
  onClose,
  onSuccess,
  clubId,
  inviteType,
  targetId,
  targetTitle,
  sessionProps,
  matchProps,
  eventProps,
  preSelectedSquadIds = [],
  multiSelect = true,
}: SquadInviteModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [step, setStep] = useState<Step>('squads');
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(preSelectedSquadIds);
  const [preview, setPreview] = useState<SquadInvitePreview[]>([]);
  const [excludedMemberIds, setExcludedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSquads();
      setStep('squads');
      setSelectedSquadIds(preSelectedSquadIds);
      setExcludedMemberIds([]);
    }
  }, [visible, clubId]);

  const loadSquads = async () => {
    setLoading(true);
    try {
      let data = await squadService.getSquads(clubId);
      data = data.filter((s) => !s.name.toLowerCase().includes('staff'));
      setSquads(data);
    } catch (error) {
      logger.error('Failed to load squads', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const previews = await Promise.all(
        selectedSquadIds.map((id) =>
          bulkInviteService.getSquadInvitePreview(id, excludedMemberIds)
        )
      );
      setPreview(previews);
    } catch (error) {
      logger.error('Failed to load preview', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSquad = (squadId: string) => {
    if (multiSelect) {
      setSelectedSquadIds((prev) =>
        prev.includes(squadId)
          ? prev.filter((id) => id !== squadId)
          : [...prev, squadId]
      );
    } else {
      setSelectedSquadIds([squadId]);
    }
  };

  const toggleMemberExclusion = (athleteId: string) => {
    setExcludedMemberIds((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const totalMembers = useMemo(() => {
    return preview.reduce((sum, p) => sum + p.memberCount, 0);
  }, [preview]);

  const totalParents = useMemo(() => {
    const allParentIds = new Set<string>();
    preview.forEach((p) => {
      p.members.forEach((m) => allParentIds.add(m.parentId));
    });
    return allParentIds.size;
  }, [preview]);

  const handleNextStep = async () => {
    if (step === 'squads') {
      await loadPreview();
      setStep('preview');
    } else if (step === 'preview') {
      setStep('confirm');
    }
  };

  const handlePrevStep = () => {
    if (step === 'preview') {
      setStep('squads');
    } else if (step === 'confirm') {
      setStep('preview');
    } else {
      onClose();
    }
  };

  const handleSendInvites = async () => {
    setSending(true);
    try {
      let result;

      if (inviteType === 'SESSION' && sessionProps) {
        // Invite to session
        if (selectedSquadIds.length === 1) {
          result = await bulkInviteService.inviteSquadToSession({
            sessionId: targetId,
            sessionTitle: targetTitle,
            squadId: selectedSquadIds[0],
            coachId: sessionProps.coachId,
            coachName: sessionProps.coachName,
            coachPhotoUrl: sessionProps.coachPhotoUrl,
            clubName: sessionProps.clubName,
            proposedSlots: sessionProps.proposedSlots,
            sessionType: sessionProps.sessionType,
            focus: sessionProps.focus,
            notes: sessionProps.notes,
            priceUsd: sessionProps.priceUsd,
            excludeMemberIds: excludedMemberIds,
          });
        } else {
          // Multiple squads - call for each
          let totalSuccess = 0;
          let totalFailed = 0;
          let lastId = '';

          for (const squadId of selectedSquadIds) {
            const squadResult = await bulkInviteService.inviteSquadToSession({
              sessionId: targetId,
              sessionTitle: targetTitle,
              squadId,
              coachId: sessionProps.coachId,
              coachName: sessionProps.coachName,
              coachPhotoUrl: sessionProps.coachPhotoUrl,
              clubName: sessionProps.clubName,
              proposedSlots: sessionProps.proposedSlots,
              sessionType: sessionProps.sessionType,
              focus: sessionProps.focus,
              notes: sessionProps.notes,
              priceUsd: sessionProps.priceUsd,
              excludeMemberIds: excludedMemberIds,
            });
            totalSuccess += squadResult.successful;
            totalFailed += squadResult.failed;
            lastId = squadResult.squadInviteId || '';
          }

          result = {
            successful: totalSuccess,
            failed: totalFailed,
            errors: [],
            squadInviteId: lastId,
          };
        }
      } else if (inviteType === 'MATCH' && matchProps) {
        // Create match and invite squad
        const squad = squads.find((s) => s.id === selectedSquadIds[0]);
        const matchResult = await bulkInviteService.inviteSquadToMatch({
          squadId: selectedSquadIds[0],
          squadName: squad?.name || 'Squad',
          matchTitle: `${squad?.name || 'Team'} vs ${matchProps.opponent}`,
          opponent: matchProps.opponent,
          isHome: matchProps.homeAway === 'HOME',
          date: matchProps.scheduledAt.split('T')[0],
          kickoffTime: matchProps.scheduledAt.split('T')[1]?.substring(0, 5) || '10:00',
          venue: matchProps.location,
          clubId,
          clubName: 'Lions FC Academy',
          coachId: matchProps.coachId,
          coachName: matchProps.coachName,
          notes: matchProps.notes,
          excludeMemberIds: excludedMemberIds,
        });
        result = matchResult.inviteResult;
      } else if (inviteType === 'EVENT' && eventProps) {
        // Create event and invite squads
        const eventResult = await bulkInviteService.inviteSquadsToEvent({
          clubId,
          clubName: 'Lions FC Academy',
          title: targetTitle,
          description: eventProps.description,
          eventType: eventProps.eventType,
          date: eventProps.startDate.split('T')[0],
          startTime: eventProps.startDate.split('T')[1]?.substring(0, 5) || '10:00',
          endTime: eventProps.endDate?.split('T')[1]?.substring(0, 5),
          venue: eventProps.location,
          squadIds: selectedSquadIds,
          createdBy: eventProps.createdBy,
          createdByName: eventProps.createdByName,
          price: eventProps.priceUsd,
          maxAttendees: eventProps.maxParticipants,
          excludeMemberIds: excludedMemberIds,
        });
        result = eventResult.inviteResult;
      }

      if (result) {
        onSuccess({
          squadInviteId: result.squadInviteId || '',
          successful: result.successful,
          failed: result.failed,
        });
        onClose();
      }
    } catch (error) {
      logger.error('Failed to send invites', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const canProceed = () => {
    if (step === 'squads') return selectedSquadIds.length > 0;
    if (step === 'preview') return totalMembers > 0;
    return true;
  };

  const renderSquadsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        {multiSelect ? 'Select Squads to Invite' : 'Select Squad'}
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        {inviteType === 'SESSION' && 'All athletes in the selected squad(s) will receive an invite'}
        {inviteType === 'MATCH' && 'Squad members will be asked about their availability'}
        {inviteType === 'EVENT' && 'Select which squads should be invited to this event'}
      </ThemedText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading squads...</ThemedText>
        </View>
      ) : (
        <View style={styles.squadList}>
          {squads.map((squad) => {
            const isSelected = selectedSquadIds.includes(squad.id);
            const ageGroup = squadService.getAgeGroupLabel(squad);

            return (
              <Clickable
                key={squad.id}
                onPress={() => toggleSquad(squad.id)}
                style={[
                  styles.squadItem,
                  {
                    backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <View style={[styles.squadIcon, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="people" size={24} color={palette.tint} />
                </View>
                <View style={styles.squadInfo}>
                  <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                  <View style={styles.squadMeta}>
                    <View style={[styles.metaChip, { backgroundColor: `${palette.tint}10` }]}>
                      <ThemedText style={{ fontSize: 11, color: palette.tint }}>{ageGroup}</ThemedText>
                    </View>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {squad.memberCount} athletes
                    </ThemedText>
                  </View>
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
      )}
    </Animated.View>
  );

  const renderPreviewStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Preview Invites
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Review who will be invited. Tap to exclude specific athletes.
      </ThemedText>

      {/* Summary */}
      <View style={[styles.previewSummary, { backgroundColor: `${palette.tint}10` }]}>
        <View style={styles.summaryItem}>
          <ThemedText type="title" style={{ color: palette.tint }}>{totalMembers}</ThemedText>
          <ThemedText style={{ color: palette.tint, fontSize: 12 }}>Athletes</ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.tint }]} />
        <View style={styles.summaryItem}>
          <ThemedText type="title" style={{ color: palette.tint }}>{totalParents}</ThemedText>
          <ThemedText style={{ color: palette.tint, fontSize: 12 }}>Notifications</ThemedText>
        </View>
      </View>

      {/* Member list by squad */}
      {preview.map((squadPreview) => (
        <SurfaceCard key={squadPreview.squadId} style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Ionicons name="people" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
              {squadPreview.squadName}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              {squadPreview.memberCount} athletes
            </ThemedText>
          </View>

          <View style={styles.memberList}>
            {squadPreview.members.map((member) => {
              const isExcluded = excludedMemberIds.includes(member.athleteId);
              return (
                <Clickable
                  key={member.athleteId}
                  onPress={() => toggleMemberExclusion(member.athleteId)}
                  style={[
                    styles.memberItem,
                    {
                      backgroundColor: isExcluded ? palette.surface : 'transparent',
                      opacity: isExcluded ? 0.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <ThemedText
                      style={[
                        { fontSize: 14 },
                        isExcluded && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {member.athleteName}
                    </ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 11 }}>
                      {member.parentName}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={isExcluded ? 'close-circle' : 'checkmark-circle'}
                    size={20}
                    color={isExcluded ? palette.error : palette.tint}
                  />
                </Clickable>
              );
            })}
          </View>
        </SurfaceCard>
      ))}

      {excludedMemberIds.length > 0 && (
        <View style={[styles.excludedNote, { backgroundColor: `${palette.warning}10` }]}>
          <Ionicons name="information-circle" size={16} color={palette.warning} />
          <ThemedText style={{ color: palette.warning, fontSize: 12, flex: 1 }}>
            {excludedMemberIds.length} athlete{excludedMemberIds.length !== 1 ? 's' : ''} excluded from invite
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderConfirmStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <View style={styles.confirmContent}>
        <View style={[styles.confirmIcon, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="paper-plane" size={48} color={palette.tint} />
        </View>

        <ThemedText type="subtitle" style={styles.confirmTitle}>
          Ready to Send?
        </ThemedText>

        <ThemedText style={[styles.confirmText, { color: palette.muted }]}>
          {inviteType === 'SESSION' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive session invites for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
          {inviteType === 'MATCH' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive availability requests for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
          {inviteType === 'EVENT' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive event invitations for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
        </ThemedText>

        <SurfaceCard style={styles.confirmSummary}>
          <View style={styles.confirmRow}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }}>{targetTitle}</ThemedText>
          </View>
          <View style={styles.confirmRow}>
            <Ionicons name="people-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }}>
              {preview.map((p) => p.squadName).join(', ')}
            </ThemedText>
          </View>
          {inviteType === 'SESSION' && sessionProps?.focus && (
            <View style={styles.confirmRow}>
              <Ionicons name="football-outline" size={18} color={palette.muted} />
              <ThemedText style={{ flex: 1 }}>{sessionProps.focus}</ThemedText>
            </View>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
          {inviteType === 'SESSION' && 'Parents will have 7 days to respond to the invite.'}
          {inviteType === 'MATCH' && 'Parents will be notified immediately and can update availability anytime.'}
          {inviteType === 'EVENT' && 'Parents will receive a notification with event details.'}
        </ThemedText>
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handlePrevStep}>
            <Ionicons
              name={step === 'squads' ? 'close' : 'arrow-back'}
              size={24}
              color={palette.text}
            />
          </Clickable>
          <ThemedText type="subtitle">
            Invite Squad{multiSelect && selectedSquadIds.length > 1 ? 's' : ''}
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {(['squads', 'preview', 'confirm'] as Step[]).map((s, index) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      ['squads', 'preview', 'confirm'].indexOf(step) >= index
                        ? palette.tint
                        : palette.border,
                  },
                ]}
              >
                {['squads', 'preview', 'confirm'].indexOf(step) > index && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              {index < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        ['squads', 'preview', 'confirm'].indexOf(step) > index
                          ? palette.tint
                          : palette.border,
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'squads' && renderSquadsStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'confirm' && renderConfirmStep()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'confirm' ? (
            <Clickable
              onPress={handleSendInvites}
              disabled={sending}
              style={[
                styles.primaryButton,
                { backgroundColor: palette.tint, opacity: sending ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" />
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                {sending ? 'Sending...' : `Send ${totalParents} Invite${totalParents !== 1 ? 's' : ''}`}
              </ThemedText>
            </Clickable>
          ) : (
            <Clickable
              onPress={handleNextStep}
              disabled={!canProceed() || loading}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: palette.tint,
                  opacity: canProceed() && !loading ? 1 : 0.5,
                },
              ]}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
                {step === 'squads' ? 'Preview Members' : 'Continue'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Clickable>
          )}
        </View>
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 60,
    height: 2,
    marginHorizontal: 4,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: 20,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  squadList: {
    gap: Spacing.sm,
  },
  squadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: {
    flex: 1,
    gap: 2,
  },
  squadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    opacity: 0.3,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberList: {
    gap: Spacing.xs,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
  excludedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  confirmContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  confirmTitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confirmText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  confirmSummary: {
    width: '100%',
    gap: Spacing.sm,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  disclaimer: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
});
