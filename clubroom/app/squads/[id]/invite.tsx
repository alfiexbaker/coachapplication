/**
 * Squad Invite Screen
 *
 * Dedicated screen for sending bulk session invites from a specific squad.
 * All state/logic in useSquadInvite hook. Form sections extracted to components.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { SquadMemberSelect } from '@/components/squad/SquadMemberSelect';
import { BulkInviteButton } from '@/components/squad/BulkInviteButton';
import { InviteResultCard } from '@/components/squad/InviteResultCard';
import { SquadInviteSessionForm } from '@/components/squad/squad-invite-session-form';
import { SquadInviteHistory } from '@/components/squad/squad-invite-history';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSquadInvite } from '@/hooks/use-squad-invite';

export default function SquadInviteScreen() {
  const { colors: palette } = useTheme();
  const s = useSquadInvite();

  if (s.status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (s.status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message={s.error?.message || 'Failed to load squad invite data.'}
          onRetry={s.retry}
        />
      </SafeAreaView>
    );
  }

  if (s.status === 'empty' || !s.squad) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="people-outline"
          title="Squad not found"
          message="This squad could not be loaded."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (s.viewMode === 'result' && s.inviteResult) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Invites Sent"
          centerTitle
          containerStyle={styles.header}
          right={
            <Clickable accessibilityLabel="Close" onPress={s.handleDone} hitSlop={8}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          }
        />
        <ScrollView contentContainerStyle={styles.content}>
          <InviteResultCard
            result={s.inviteResult.result}
            invitedMembers={s.inviteResult.squadInvite.invitedMembers}
            squadName={s.squad.name}
            sessionTitle={s.sessionTitle}
            onViewInvites={s.handleViewInvites}
            onDone={s.handleDone}
            showDetails
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Invite Squad"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={styles.header}
      />

      {/* Squad Banner */}
      <Row
        align="center"
        gap="md"
        style={[styles.banner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
      >
        <View style={[styles.bannerIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="people" size={20} color={palette.tint} />
        </View>
        <View style={styles.bannerInfo}>
          <ThemedText type="defaultSemiBold">{s.squad.name}</ThemedText>
          <ThemedText style={[styles.bannerMeta, { color: palette.muted }]}>
            {s.members.length} athletes {'\u2022'} {s.squad.level}
          </ThemedText>
        </View>
      </Row>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={s.refreshing} onRefresh={s.onRefresh} />}
      >
        <SquadInviteHistory history={s.inviteHistory} />

        <SquadInviteSessionForm
          sessionTitle={s.sessionTitle}
          sessionType={s.sessionType}
          focus={s.focus}
          slotDate={s.slotDate}
          slotStartTime={s.slotStartTime}
          slotEndTime={s.slotEndTime}
          slotLocation={s.slotLocation}
          proposedSlots={s.proposedSlots}
          onTitleChange={s.setSessionTitle}
          onTypeChange={s.setSessionType}
          onFocusChange={s.setFocus}
          onSlotDateChange={s.setSlotDate}
          onSlotStartChange={s.setSlotStartTime}
          onSlotEndChange={s.setSlotEndTime}
          onSlotLocationChange={s.setSlotLocation}
          onAddSlot={s.addTimeSlot}
          onRemoveSlot={s.removeTimeSlot}
        />

        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Select Athletes
          </ThemedText>
          <SquadMemberSelect
            squadId={s.squadId}
            selectedMemberIds={s.selectedMemberIds}
            onSelectionChange={s.setSelectedMemberIds}
            showSelectAll
            showNotificationCount
            maxHeight={300}
          />
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <BulkInviteButton
          selectedCount={s.selectedMemberIds.length}
          notificationCount={s.uniqueParentCount}
          onPress={s.sendBulkInvites}
          loading={s.sendingInvites}
          disabled={!s.canSend}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  backButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  banner: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: { flex: 1, gap: Spacing.micro },
  bannerMeta: { ...Typography.caption },
  content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.body, marginBottom: Spacing.xs },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
