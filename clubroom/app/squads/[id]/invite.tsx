/**
 * Squad Invite Screen
 *
 * Dedicated screen for sending bulk session invites from a specific squad.
 * All state/logic in useSquadInvite hook. Form sections extracted to components.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SquadMemberSelect } from '@/components/squad/SquadMemberSelect';
import { BulkInviteButton } from '@/components/squad/BulkInviteButton';
import { InviteResultCard } from '@/components/squad/InviteResultCard';
import { SquadInviteSessionForm } from '@/components/squad/squad-invite-session-form';
import { SquadInviteHistory } from '@/components/squad/squad-invite-history';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSquadInvite } from '@/hooks/use-squad-invite';

export default function SquadInviteScreen() {
  const { colors: palette } = useTheme();
  const s = useSquadInvite();

  if (s.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading squad...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!s.squad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={palette.error} />
          <ThemedText style={{ color: palette.error, marginTop: Spacing.md }}>Squad not found</ThemedText>
          <Clickable onPress={() => router.back()} style={[styles.backButton, { borderColor: palette.border }]}>
            <ThemedText>Go Back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  if (s.viewMode === 'result' && s.inviteResult) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <ThemedText type="title">Invites Sent</ThemedText>
          <Clickable accessibilityLabel="Close" onPress={s.handleDone} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <InviteResultCard
            result={s.inviteResult.result} invitedMembers={s.inviteResult.squadInvite.invitedMembers}
            squadName={s.squad.name} sessionTitle={s.sessionTitle}
            onViewInvites={s.handleViewInvites} onDone={s.handleDone} showDetails
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Invite Squad</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Squad Banner */}
      <View style={[styles.banner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <View style={[styles.bannerIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="people" size={20} color={palette.tint} />
        </View>
        <View style={styles.bannerInfo}>
          <ThemedText type="defaultSemiBold">{s.squad.name}</ThemedText>
          <ThemedText style={[styles.bannerMeta, { color: palette.muted }]}>
            {s.members.length} athletes {'\u2022'} {s.squad.level}
          </ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SquadInviteHistory history={s.inviteHistory} />

        <SquadInviteSessionForm
          sessionTitle={s.sessionTitle} sessionType={s.sessionType} focus={s.focus}
          slotDate={s.slotDate} slotStartTime={s.slotStartTime} slotEndTime={s.slotEndTime} slotLocation={s.slotLocation}
          proposedSlots={s.proposedSlots} onTitleChange={s.setSessionTitle} onTypeChange={s.setSessionType}
          onFocusChange={s.setFocus} onSlotDateChange={s.setSlotDate} onSlotStartChange={s.setSlotStartTime}
          onSlotEndChange={s.setSlotEndTime} onSlotLocationChange={s.setSlotLocation}
          onAddSlot={s.addTimeSlot} onRemoveSlot={s.removeTimeSlot}
        />

        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Select Athletes</ThemedText>
          <SquadMemberSelect
            squadId={s.squadId} selectedMemberIds={s.selectedMemberIds}
            onSelectionChange={s.setSelectedMemberIds} showSelectAll showNotificationCount maxHeight={300}
          />
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <BulkInviteButton
          selectedCount={s.selectedMemberIds.length} notificationCount={s.uniqueParentCount}
          onPress={s.sendBulkInvites} loading={s.sendingInvites} disabled={!s.canSend}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  backButton: { marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: Radii.md, marginBottom: Spacing.md },
  bannerIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  bannerInfo: { flex: 1, gap: Spacing.micro },
  bannerMeta: { ...Typography.caption },
  content: { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { ...Typography.body, marginBottom: Spacing.xs },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
