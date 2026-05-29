import { useState } from 'react';
import { FlatList, StyleSheet, View, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ParticipantCard } from '@/components/group/participant-card';
import { RollCallModal } from '@/components/group/roll-call-modal';
import { InjuryReportModal } from '@/components/group/injury-report-modal';
import { QuickRateModal } from '@/components/group/quick-rate-modal';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useGroupRoster, type RosterFilter } from '@/hooks/use-group-roster';
import { useRequiredParam } from '@/hooks/use-required-param';
import { getGroupRegistrationAthleteName } from '@/utils/group-display';
import type { GroupRegistration, SessionRsvp } from '@/constants/types';
import type { QuickRateAthlete } from '@/hooks/use-quick-rate';

export default function SessionRosterScreen() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const { colors } = useTheme();
  const { currentUser } = useAuth();

  const {
    session,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    filter,
    setFilter,
    rsvpCounts,
    getRsvpForRegistration,
    showRollCall,
    setShowRollCall,
    rollCallAttendance,
    rollCallStats,
    rollCallParticipants,
    showInjuryReport,
    setShowInjuryReport,
    selectedParticipant,
    injuryBodyPart,
    setInjuryBodyPart,
    injurySeverity,
    setInjurySeverity,
    injuryDescription,
    setInjuryDescription,
    savingInjury,
    filteredRoster,
    filters,
    registeredCount,
    waitlistedCount,
    handleMarkAttendance,
    handleCancelRegistration,
    startRollCall,
    markRollCallStatus,
    markAllPresent,
    resetRollCall,
    saveRollCall,
    openInjuryReport,
    submitInjuryReport,
  } = useGroupRoster(id);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  const [quickRateAthlete, setQuickRateAthlete] = useState<QuickRateAthlete | null>(null);
  const [showQuickRate, setShowQuickRate] = useState(false);

  const handleRecognise = (reg: GroupRegistration) => {
    const name = getGroupRegistrationAthleteName(reg);
    setQuickRateAthlete({ athleteId: reg.athleteId, athleteName: name });
    setShowQuickRate(true);
  };

  const handleQuickRateSaved = () => {
    setShowQuickRate(false);
    setQuickRateAthlete(null);
  };
  const filterItems = getRosterFilterItems(filters, filter, colors, setFilter);
  const rosterItems = getRosterItems(
    filteredRoster,
    getRsvpForRegistration,
    handleMarkAttendance,
    handleCancelRegistration,
    handleRecognise,
  );

  if (!idParam.valid) {
    return renderShell(
      <ErrorState message="Invalid session roster link." onRetry={() => router.back()} />,
    );
  }

  if (status === 'loading') {
    return renderShell(<LoadingState variant="list" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message || 'Failed to load session roster.'} onRetry={retry} />,
    );
  }

  if (status === 'empty' || !session) {
    return renderShell(
      <EmptyState
        icon="people-outline"
        title="Session not found"
        message="This session could not be loaded."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderShell(
    <>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <Column flex>
          <ThemedText type="title">Roster</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
            {session?.title}
          </ThemedText>
        </Column>
        {registeredCount > 0 && (
          <Clickable
            style={[styles.rollCallBtn, { backgroundColor: colors.success }]}
            onPress={startRollCall}
          >
            <Row align="center" gap="xs">
              <Ionicons name="clipboard-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.onPrimary }]}>
                Roll Call
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>

      <Row gap="sm" style={styles.statsRow}>
        {[
          { value: registeredCount, label: 'Registered', color: colors.tint },
          { value: waitlistedCount, label: 'Waitlist', color: colors.warning },
          { value: session?.maxParticipants || 0, label: 'Capacity', color: colors.success },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="heading" style={{ color: s.color }}>
              {s.value}
            </ThemedText>
            <ThemedText
              style={[Typography.caption, { color: colors.muted, marginTop: Spacing.micro }]}
            >
              {s.label}
            </ThemedText>
          </View>
        ))}
      </Row>

      {/* RSVP Summary */}
      {rsvpCounts.total > 0 && (
        <Row gap="xs" style={styles.rsvpRow}>
          {[
            { count: rsvpCounts.going, label: 'Going', color: colors.success },
            { count: rsvpCounts.maybe, label: 'Maybe', color: colors.warning },
            { count: rsvpCounts.notGoing, label: "Can't", color: colors.error },
            { count: rsvpCounts.pending, label: 'Pending', color: colors.muted },
          ].map((item) => (
            <Row key={item.label} align="center" gap="xxs" style={styles.rsvpChip}>
              <View style={[styles.rsvpDot, { backgroundColor: item.color }]} />
              <ThemedText style={[Typography.smallSemiBold, { color: item.color }]}>
                {item.count}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                {item.label}
              </ThemedText>
            </Row>
          ))}
        </Row>
      )}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: 24,
          gap: Spacing.xs,
        }}
        data={filterItems}
        keyExtractor={keyRosterFilterItem}
        renderItem={renderRosterFilterItem}
      />

      <FlatList
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
        data={rosterItems}
        keyExtractor={keyRosterItem}
        renderItem={renderRosterItem}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No participants"
            message={
              filter !== 'all'
                ? `No ${filter} participants yet`
                : 'No one has registered for this session yet'
            }
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <RollCallModal
        visible={showRollCall}
        sessionTitle={session?.title}
        participants={rollCallParticipants}
        attendance={rollCallAttendance}
        stats={rollCallStats}
        colors={colors}
        onClose={() => setShowRollCall(false)}
        onMarkStatus={markRollCallStatus}
        onMarkAllPresent={markAllPresent}
        onReset={resetRollCall}
        onSave={saveRollCall}
        onReportInjury={openInjuryReport}
      />

      <InjuryReportModal
        visible={showInjuryReport}
        athleteName={
          selectedParticipant ? getGroupRegistrationAthleteName(selectedParticipant) : undefined
        }
        bodyPart={injuryBodyPart}
        severity={injurySeverity}
        description={injuryDescription}
        saving={savingInjury}
        colors={colors}
        onClose={() => setShowInjuryReport(false)}
        onBodyPartChange={setInjuryBodyPart}
        onSeverityChange={setInjurySeverity}
        onDescriptionChange={setInjuryDescription}
        onSubmit={submitInjuryReport}
      />

      <QuickRateModal
        visible={showQuickRate}
        athlete={quickRateAthlete}
        sessionId={id}
        coachId={currentUser?.id ?? ''}
        coachName={currentUser?.fullName ?? 'Coach'}
        onClose={() => setShowQuickRate(false)}
        onSaved={handleQuickRateSaved}
      />
    </>,
  );
}

interface RosterFilterSource {
  key: RosterFilter;
  label: string;
  count?: number;
}

interface RosterFilterItem extends RosterFilterSource {
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function getRosterFilterItems(
  filters: RosterFilterSource[],
  selectedFilter: RosterFilter,
  colors: ThemeColors,
  onSelectFilter: (filter: RosterFilter) => void,
): RosterFilterItem[] {
  return filters.map((filter) => ({
    ...filter,
    isActive: selectedFilter === filter.key,
    colors,
    onPress: () => onSelectFilter(filter.key),
  }));
}

function keyRosterFilterItem(item: RosterFilterItem): string {
  return item.key;
}

function renderRosterFilterItem({ item }: ListRenderItemInfo<RosterFilterItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: item.isActive ? item.colors.tint : item.colors.surface,
          borderColor: item.isActive ? item.colors.tint : item.colors.border,
        },
      ]}
    >
      <ThemedText
        style={[
          Typography.smallSemiBold,
          { color: item.isActive ? item.colors.onPrimary : item.colors.text },
        ]}
      >
        {item.label}
        {item.count !== undefined ? ` (${item.count})` : ''}
      </ThemedText>
    </Clickable>
  );
}

interface RosterItem {
  key: string;
  index: number;
  registration: GroupRegistration;
  rsvp: SessionRsvp | null | undefined;
  onMarkAttendance: (attended: boolean) => void;
  onCancel: () => void;
  onRecognise: () => void;
}

function getRosterItems(
  roster: GroupRegistration[],
  getRsvpForRegistration: (registration: GroupRegistration) => SessionRsvp | null | undefined,
  handleMarkAttendance: (registration: GroupRegistration, attended: boolean) => void,
  handleCancelRegistration: (registration: GroupRegistration) => void,
  handleRecognise: (registration: GroupRegistration) => void,
): RosterItem[] {
  return roster.map((registration, index) => ({
    key: registration.id,
    index,
    registration,
    rsvp: getRsvpForRegistration(registration),
    onMarkAttendance: (attended) => handleMarkAttendance(registration, attended),
    onCancel: () => handleCancelRegistration(registration),
    onRecognise: () => handleRecognise(registration),
  }));
}

function keyRosterItem(item: RosterItem): string {
  return item.key;
}

function renderRosterItem({ item }: ListRenderItemInfo<RosterItem>) {
  return (
    <Animated.View entering={FadeInDown.delay(item.index * 50).springify()}>
      <ParticipantCard
        registration={item.registration}
        rsvp={item.rsvp}
        onMarkAttendance={item.onMarkAttendance}
        onCancel={item.onCancel}
        onRecognise={item.onRecognise}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rollCallBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  statsRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radii.md },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  rsvpRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  rsvpChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  rsvpDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
});
