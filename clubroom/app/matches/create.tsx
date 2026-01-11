import { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/primitives/chip';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { MatchType, ClubSquad } from '@/constants/types';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { bulkInviteService } from '@/services/bulk-invite-service';
import { withRoleGuard } from '@/components/auth/with-role-guard';

const MATCH_TYPES: { type: MatchType; label: string; icon: string }[] = [
  { type: 'FRIENDLY', label: 'Friendly', icon: 'people-outline' },
  { type: 'LEAGUE', label: 'League', icon: 'podium-outline' },
  { type: 'CUP', label: 'Cup', icon: 'trophy-outline' },
  { type: 'TOURNAMENT', label: 'Tournament', icon: 'medal-outline' },
];

// Default club ID for demo
const DEFAULT_CLUB_ID = 'club_lions';

type Step = 'details' | 'schedule' | 'squad' | 'review';

function CreateMatchScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [matchType, setMatchType] = useState<MatchType>('LEAGUE');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('14');
  const [notes, setNotes] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<ClubSquad | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [squadMemberCount, setSquadMemberCount] = useState(0);
  const [autoInvite, setAutoInvite] = useState(true);

  // Load squads on mount
  useEffect(() => {
    loadSquads();
  }, []);

  // Load selected squad info when changed
  useEffect(() => {
    if (selectedSquadId) {
      loadSquadInfo();
    }
  }, [selectedSquadId]);

  const loadSquads = async () => {
    try {
      const data = await squadService.getSquads(DEFAULT_CLUB_ID);
      setSquads(data.filter(s => !s.name.toLowerCase().includes('staff')));
    } catch (error) {
      console.error('Failed to load squads:', error);
    }
  };

  const loadSquadInfo = async () => {
    if (!selectedSquadId) return;
    try {
      const squad = await squadService.getSquad(selectedSquadId);
      setSelectedSquad(squad);
      const members = await squadService.getSquadMembers(selectedSquadId);
      setSquadMemberCount(members.length);
    } catch (error) {
      console.error('Failed to load squad info:', error);
    }
  };

  const steps: Step[] = ['details', 'schedule', 'squad', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const validateStep = (): boolean => {
    switch (step) {
      case 'details':
        if (!opponent.trim()) {
          Alert.alert('Missing Information', 'Please enter the opponent name.');
          return false;
        }
        if (!venue.trim()) {
          Alert.alert('Missing Information', 'Please enter the venue.');
          return false;
        }
        return true;
      case 'schedule':
        if (!date.trim()) {
          Alert.alert('Missing Information', 'Please enter the match date.');
          return false;
        }
        if (!kickoffTime.trim()) {
          Alert.alert('Missing Information', 'Please enter the kickoff time.');
          return false;
        }
        return true;
      case 'squad':
        if (!selectedSquadId) {
          Alert.alert('Missing Information', 'Please select a squad.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const title = `${selectedSquad?.name || 'Team'} vs ${opponent}`;

      if (autoInvite && selectedSquadId) {
        // Use bulk invite service to create match with auto-invites
        const result = await bulkInviteService.inviteSquadToMatch({
          squadId: selectedSquadId,
          squadName: selectedSquad?.name || 'Team',
          matchTitle: title,
          opponent,
          isHome,
          date,
          kickoffTime,
          venue,
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          matchType,
          notes: notes || undefined,
        });

        Alert.alert(
          'Match Created!',
          `${title} created and ${result.inviteResult.successful} availability request${result.inviteResult.successful !== 1 ? 's' : ''} sent to squad members.`,
          [
            {
              text: 'View Match',
              onPress: () => router.replace({
                pathname: '/matches/[id]',
                params: { id: result.match.id },
              }),
            },
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // Create match without auto-invite
        const match = await matchService.createMatch({
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          squadId: selectedSquadId || undefined,
          squadName: selectedSquad?.name,
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          title,
          matchType,
          opponent,
          isHome,
          date,
          kickoffTime,
          meetTime: meetTime || undefined,
          venue,
          address: address || undefined,
          maxPlayers: parseInt(maxPlayers, 10) || 14,
          notes: notes || undefined,
        });

        Alert.alert(
          'Match Created!',
          `${title} has been created.`,
          [
            {
              text: 'View Match',
              onPress: () => router.replace({
                pathname: '/matches/[id]',
                params: { id: match.id },
              }),
            },
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Match Details</ThemedText>

      {/* Match Type */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Match Type</ThemedText>
        <View style={styles.typeGrid}>
          {MATCH_TYPES.map((t) => {
            const isSelected = matchType === t.type;
            const color = matchService.getMatchTypeColor(t.type);
            return (
              <TouchableOpacity
                key={t.type}
                style={[
                  styles.typeButton,
                  { borderColor: isSelected ? color : palette.border },
                  isSelected && { backgroundColor: `${color}15` },
                ]}
                onPress={() => setMatchType(t.type)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={20}
                  color={isSelected ? color : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.typeLabel,
                    { color: isSelected ? color : palette.text },
                  ]}
                >
                  {t.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Opponent */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Opponent *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., Hackney FC"
          placeholderTextColor={palette.muted}
          value={opponent}
          onChangeText={setOpponent}
        />
      </View>

      {/* Home/Away */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Location</ThemedText>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { borderColor: isHome ? palette.tint : palette.border },
              isHome && { backgroundColor: `${palette.tint}15` },
            ]}
            onPress={() => setIsHome(true)}
          >
            <Ionicons name="home" size={18} color={isHome ? palette.tint : palette.muted} />
            <ThemedText style={{ color: isHome ? palette.tint : palette.text }}>Home</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { borderColor: !isHome ? palette.tint : palette.border },
              !isHome && { backgroundColor: `${palette.tint}15` },
            ]}
            onPress={() => setIsHome(false)}
          >
            <Ionicons name="airplane" size={18} color={!isHome ? palette.tint : palette.muted} />
            <ThemedText style={{ color: !isHome ? palette.tint : palette.text }}>Away</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Venue */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Venue *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., Bradwell Sports Ground"
          placeholderTextColor={palette.muted}
          value={venue}
          onChangeText={setVenue}
        />
      </View>

      {/* Address */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Address (optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="Full address for parents"
          placeholderTextColor={palette.muted}
          value={address}
          onChangeText={setAddress}
        />
      </View>
    </View>
  );

  const renderScheduleStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Schedule</ThemedText>

      {/* Date */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Date *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="YYYY-MM-DD (e.g., 2026-01-25)"
          placeholderTextColor={palette.muted}
          value={date}
          onChangeText={setDate}
        />
      </View>

      {/* Kickoff Time */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Kickoff Time *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="HH:MM (e.g., 14:00)"
          placeholderTextColor={palette.muted}
          value={kickoffTime}
          onChangeText={setKickoffTime}
        />
      </View>

      {/* Meet Time */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Meeting Time (optional)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="HH:MM (e.g., 13:30)"
          placeholderTextColor={palette.muted}
          value={meetTime}
          onChangeText={setMeetTime}
        />
        <ThemedText style={[styles.helpText, { color: palette.muted }]}>
          When players should arrive (recommended 30min before kickoff)
        </ThemedText>
      </View>

      {/* Max Players */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Squad Size</ThemedText>
        <TextInput
          style={[styles.input, styles.smallInput, { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }]}
          placeholder="14"
          placeholderTextColor={palette.muted}
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
        />
        <ThemedText style={[styles.helpText, { color: palette.muted }]}>
          Maximum number of players for the match day squad
        </ThemedText>
      </View>

      {/* Notes */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Coach Notes (optional)</ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }
          ]}
          placeholder="Any special instructions or reminders for parents..."
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderSquadStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Select Squad</ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Choose the squad playing in this match
      </ThemedText>

      <View style={styles.squadList}>
        {squads.map((squad) => {
          const isSelected = selectedSquadId === squad.id;
          return (
            <TouchableOpacity
              key={squad.id}
              style={[
                styles.squadCard,
                { borderColor: isSelected ? palette.tint : palette.border },
                isSelected && { backgroundColor: `${palette.tint}10` },
              ]}
              onPress={() => setSelectedSquadId(squad.id)}
            >
              <View style={[styles.squadIcon, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="people" size={24} color={palette.tint} />
              </View>
              <View style={styles.squadInfo}>
                <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                <View style={styles.squadMetaRow}>
                  <View style={[styles.ageChip, { backgroundColor: `${palette.tint}10` }]}>
                    <ThemedText style={{ fontSize: 11, color: palette.tint }}>
                      {squadService.getAgeGroupLabel(squad)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.squadMeta, { color: palette.muted }]}>
                    {squad.memberCount} players
                  </ThemedText>
                </View>
              </View>
              <View style={styles.squadCheck}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                ) : (
                  <View style={[styles.emptyCheck, { borderColor: palette.border }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {squads.length === 0 && (
          <View style={styles.emptySquads}>
            <Ionicons name="people-outline" size={48} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>No squads found</ThemedText>
          </View>
        )}
      </View>

      {selectedSquadId && (
        <View style={[styles.autoInviteRow, { borderTopColor: palette.border }]}>
          <View style={styles.autoInviteInfo}>
            <ThemedText type="defaultSemiBold">Auto-invite Squad</ThemedText>
            <ThemedText style={[styles.autoInviteDesc, { color: palette.muted }]}>
              Send availability requests to all {squadMemberCount} squad members
            </ThemedText>
          </View>
          <Switch
            value={autoInvite}
            onValueChange={setAutoInvite}
            trackColor={{ false: palette.border, true: palette.tint }}
          />
        </View>
      )}
    </View>
  );

  const renderReviewStep = () => {
    const typeColor = matchService.getMatchTypeColor(matchType);

    return (
      <View style={styles.stepContent}>
        <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Review Match</ThemedText>

        <SurfaceCard style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {matchService.formatMatchType(matchType)}
              </ThemedText>
            </View>
            <View style={[styles.homeAwayBadge, { backgroundColor: palette.surface }]}>
              <Ionicons name={isHome ? 'home' : 'airplane'} size={12} color={palette.muted} />
              <ThemedText style={[styles.homeAwayText, { color: palette.muted }]}>
                {isHome ? 'Home' : 'Away'}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.reviewTitle}>
            {selectedSquad?.name || 'Team'} vs {opponent}
          </ThemedText>

          <View style={styles.reviewDetails}>
            <View style={styles.reviewRow}>
              <Ionicons name="calendar" size={18} color={palette.tint} />
              <ThemedText>{date || 'Date not set'}</ThemedText>
            </View>
            <View style={styles.reviewRow}>
              <Ionicons name="time" size={18} color={palette.tint} />
              <ThemedText>
                Kickoff: {kickoffTime || '--:--'}
                {meetTime && ` (Meet: ${meetTime})`}
              </ThemedText>
            </View>
            <View style={styles.reviewRow}>
              <Ionicons name="location" size={18} color={palette.tint} />
              <ThemedText>{venue}</ThemedText>
            </View>
            <View style={styles.reviewRow}>
              <Ionicons name="people" size={18} color={palette.tint} />
              <ThemedText>{selectedSquad?.name} ({squadMemberCount} players)</ThemedText>
            </View>
            <View style={styles.reviewRow}>
              <Ionicons name="person" size={18} color={palette.tint} />
              <ThemedText>Squad size: {maxPlayers}</ThemedText>
            </View>
          </View>

          {notes && (
            <View style={[styles.notesBox, { backgroundColor: palette.surface }]}>
              <ThemedText style={[styles.notesLabel, { color: palette.muted }]}>Notes:</ThemedText>
              <ThemedText style={styles.notesText}>{notes}</ThemedText>
            </View>
          )}

          {autoInvite && (
            <View style={[styles.inviteInfo, { backgroundColor: `${palette.success}10` }]}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <ThemedText style={{ color: palette.success }}>
                Invites will be sent to all squad members
              </ThemedText>
            </View>
          )}
        </SurfaceCard>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PageContainer
          header={
            <PageHeader
              title="Create Match"
              subtitle={`Step ${currentStepIndex + 1} of ${steps.length}`}
              showBack
              onBackPress={handleBack}
            />
          }
          gap={0}
          horizontalSpacing={0}
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            {steps.map((s, index) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  { backgroundColor: index <= currentStepIndex ? palette.tint : palette.border },
                ]}
              />
            ))}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'details' && renderDetailsStep()}
            {step === 'schedule' && renderScheduleStep()}
            {step === 'squad' && renderSquadStep()}
            {step === 'review' && renderReviewStep()}
          </ScrollView>

          {/* Footer buttons */}
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            {step === 'review' ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: palette.tint }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ThemedText style={styles.primaryButtonText}>Creating...</ThemedText>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <ThemedText style={styles.primaryButtonText}>Create Match</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: palette.tint }]}
                onPress={handleNext}
              >
                <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </PageContainer>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: 18,
    marginBottom: Spacing.sm,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  smallInput: {
    width: 100,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  squadList: {
    gap: Spacing.sm,
  },
  squadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
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
    fontSize: 13,
  },
  squadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ageChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  stepSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  emptySquads: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  squadCheck: {},
  emptyCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  autoInviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
  },
  autoInviteInfo: {
    flex: 1,
  },
  autoInviteDesc: {
    fontSize: 13,
  },
  reviewCard: {
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  homeAwayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  homeAwayText: {
    fontSize: 12,
  },
  reviewTitle: {
    fontSize: 20,
  },
  reviewDetails: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notesBox: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    gap: 4,
  },
  notesLabel: {
    fontSize: 12,
  },
  notesText: {
    fontSize: 14,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default withRoleGuard(CreateMatchScreen, ['COACH', 'ADMIN']);
