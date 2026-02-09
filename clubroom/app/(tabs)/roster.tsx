/** RosterScreen — Coach athlete roster / directory. Decomposed into sub-components. */

import { useState, useMemo, useRef, useCallback } from 'react';
import { ActionSheetIOS, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { RosterSearchBar } from '@/components/roster/roster-search-bar';
import { RosterFilterChips, type StatusFilter } from '@/components/roster/roster-filter-chips';
import { RosterQuickActions } from '@/components/roster/roster-quick-actions';
import { RosterSelectionBar, RosterFloatingInvite } from '@/components/roster/roster-selection-bar';
import { RosterList } from '@/components/roster/roster-list';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { Spacing, Components } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { rosterService, type RemovalReason, type AthleteRemovalRecord } from '@/services/roster-service';
import { ServiceEvents } from '@/services/event-bus';
import type { RosterEntry } from '@/constants/types';
import { ok, err } from '@/types/result';

export default function RosterScreen() {
  const { currentUser } = useAuth();
  const { showUndoToast, showToast } = useToast();
  const coachId = currentUser?.id || 'coach_1';

  const { data: roster, status, error, colors, retry } = useScreen<RosterEntry[]>({
    load: async () => {
      if (!currentUser?.id) return ok([]);
      try {
        const data = await rosterService.getRoster(currentUser.id);
        return ok(data);
      } catch (e) {
        return err({ code: 'UNKNOWN' as const, message: 'Failed to load roster' });
      }
    },
    deps: [currentUser?.id],
    events: [ServiceEvents.BOOKING_CREATED, ServiceEvents.SESSION_COMPLETED, ServiceEvents.BOOKING_CONFIRMED],
    isEmpty: () => false,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectionMode, setSelectionMode] = useState<'none' | 'selecting'>('none');
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [selectedAthleteForRemoval, setSelectedAthleteForRemoval] = useState<RosterEntry | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const lastRemovalRef = useRef<AthleteRemovalRecord | null>(null);
  const rosterData = roster ?? [];

  const stats = useMemo(() => ({
    total: rosterData.length,
    active: rosterData.filter((r) => r.status === 'ACTIVE').length,
    paused: rosterData.filter((r) => r.status === 'PAUSED').length,
    graduated: rosterData.filter((r) => r.status === 'GRADUATED').length,
  }), [rosterData]);

  const filteredRoster = useMemo(() => {
    let filtered = rosterData;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.athleteName.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [rosterData, statusFilter, search]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => (m === 'none' ? 'selecting' : 'none'));
    setSelectedAthletes(new Set());
  }, []);

  const toggleAthleteSelection = useCallback((athleteId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev);
      next.has(athleteId) ? next.delete(athleteId) : next.add(athleteId);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedAthletes(new Set(filteredRoster.map((r) => r.athleteId)));
  }, [filteredRoster]);

  const clearSelection = useCallback(() => setSelectedAthletes(new Set()), []);

  const handleInviteSelected = useCallback(() => {
    if (selectedAthletes.size === 0) {
      showToast('Please select at least one athlete', 'error');
      return;
    }
    router.push(Routes.SESSION_INVITES_GROUP);
    setSelectionMode('none');
    setSelectedAthletes(new Set());
  }, [selectedAthletes.size, showToast]);

  const handleQuickInviteAll = useCallback(() => {
    const active = rosterData.filter((r) => r.status === 'ACTIVE');
    if (active.length === 0) { showToast('No active athletes to invite', 'error'); return; }
    Alert.alert('Invite Entire Roster', `Send session invites to all ${active.length} active athletes?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => router.push(Routes.SESSION_INVITES_GROUP) },
    ]);
  }, [rosterData, showToast]);

  const handleAthletePress = useCallback((entry: RosterEntry) => {
    router.push(Routes.rosterAthlete(entry.athleteId));
  }, []);

  const handleRemoveAthlete = useCallback((entry: RosterEntry) => {
    setSelectedAthleteForRemoval(entry);
    setShowRemovalModal(true);
  }, []);

  const handleLongPress = useCallback((entry: RosterEntry) => {
    const title = entry.athleteName;
    const msg = `${entry.totalSessions} sessions | ${rosterService.formatStatus(entry.status)}`;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'View Details', 'Remove from Roster'], destructiveButtonIndex: 2, cancelButtonIndex: 0, title, message: msg },
        (i) => { if (i === 1) router.push(Routes.rosterAthlete(entry.athleteId)); else if (i === 2) handleRemoveAthlete(entry); },
      );
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => router.push(Routes.rosterAthlete(entry.athleteId)) },
        { text: 'Remove from Roster', style: 'destructive', onPress: () => handleRemoveAthlete(entry) },
      ]);
    }
  }, [handleRemoveAthlete]);

  const handleConfirmRemoval = useCallback(async (reason: RemovalReason, customReason?: string, archive?: boolean) => {
    if (!selectedAthleteForRemoval) return;
    setIsRemoving(true);
    try {
      const result = await rosterService.removeAthlete(coachId, selectedAthleteForRemoval.athleteId, reason, { customReason, archive });
      if (!result.success) { showToast(result.error.message, 'error'); return; }
      const record = result.data;
      lastRemovalRef.current = record;
      setShowRemovalModal(false);
      setSelectedAthleteForRemoval(null);
      retry();
      showUndoToast(`${record.athleteName} removed from roster`, async () => {
        try { await rosterService.undoRemoval(coachId, record.id); retry(); showToast('Athlete restored', 'success'); }
        catch { showToast('Failed to restore athlete', 'error'); }
      });
    } catch { showToast('Failed to remove athlete', 'error'); }
    finally { setIsRemoving(false); }
  }, [selectedAthleteForRemoval, coachId, showToast, showUndoToast, retry]);

  const handleCloseModal = useCallback(() => {
    setShowRemovalModal(false);
    setSelectedAthleteForRemoval(null);
  }, []);

  const handleModalConfirm = useCallback((reason: string, customReason?: string, archive?: boolean) => {
    void handleConfirmRemoval(reason as RemovalReason, customReason, archive);
  }, [handleConfirmRemoval]);

  if (!currentUser) return null;
  if (status === 'loading') return <LoadingState variant="list" />;
  if (status === 'error') return <ErrorState message={error?.message ?? 'Failed to load roster'} onRetry={retry} />;

  const isSelecting = selectionMode === 'selecting';

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="Roster"
          subtitle="Your athletes"
          rightElement={
            <Row gap="md" align="center">
              <Clickable onPress={toggleSelectionMode} hitSlop={8} accessibilityLabel={isSelecting ? 'Cancel selection' : 'Select athletes'} accessibilityRole="button">
                <Ionicons name={isSelecting ? 'close' : 'checkbox-outline'} size={Components.icon.lg} color={isSelecting ? colors.error : colors.text} />
              </Clickable>
              <Clickable onPress={() => router.push(Routes.SESSION_INVITES_GROUP)} hitSlop={8} accessibilityLabel="Send invites" accessibilityRole="button">
                <Ionicons name="mail-outline" size={Components.icon.lg} color={colors.text} />
              </Clickable>
            </Row>
          }
        />
      }
      gap={Spacing.md}
    >
      {isSelecting && (
        <RosterSelectionBar selectedCount={selectedAthletes.size} onSelectAll={selectAllVisible} onClear={clearSelection} />
      )}
      {!isSelecting && stats.active > 0 && (
        <RosterQuickActions activeCount={stats.active} onInviteAll={handleQuickInviteAll} />
      )}
      <RosterSearchBar value={search} onChangeText={setSearch} />
      <RosterFilterChips statusFilter={statusFilter} onFilterChange={setStatusFilter} stats={stats} />

      {filteredRoster.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No matches found' : 'No athletes yet'}
          message={search ? 'Try a different search term' : 'Athletes will appear here after they book sessions with you'}
        />
      ) : (
        <RosterList
          roster={filteredRoster}
          selectionMode={isSelecting}
          selectedAthletes={selectedAthletes}
          onAthletePress={handleAthletePress}
          onToggleSelection={toggleAthleteSelection}
          onRemove={handleRemoveAthlete}
          onLongPress={handleLongPress}
        />
      )}

      {isSelecting && selectedAthletes.size > 0 && (
        <RosterFloatingInvite selectedCount={selectedAthletes.size} onPress={handleInviteSelected} />
      )}

      <RemovalConfirmationModal
        visible={showRemovalModal}
        onClose={handleCloseModal}
        onConfirm={handleModalConfirm}
        type="athlete"
        name={selectedAthleteForRemoval?.athleteName || ''}
        isLoading={isRemoving}
      />
    </PageContainer>
  );
}
