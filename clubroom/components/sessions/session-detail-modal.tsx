/**
 * SessionDetailModal — Composition root for session detail modal.
 * Sub-components: SessionInfoSection, SessionRegistrations, SessionInstanceManager, SessionBookingOptions
 * Hook: useSessionDetailModal
 */
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Radii, Shadows, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { SessionOffering } from '@/constants/types';
import { useSessionDetailModal } from '@/hooks/use-session-detail-modal';
import { SessionInfoSection } from './session-info-section';
import { SessionRegistrations } from './session-registrations';
import { SessionInstanceManager } from './session-instance-manager';
import { SessionBookingOptions } from './session-booking-options';

interface SessionDetailModalProps {
  visible: boolean;
  offering: SessionOffering | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function SessionDetailModal({
  visible,
  offering,
  onClose,
  onUpdate,
}: SessionDetailModalProps) {
  const { colors: palette, scheme } = useTheme();
  const {
    currentUser,
    isCoach,
    isMyOffering,
    registeredCount,
    isFull,
    isRegistered,
    children,
    hasMultipleKids,
    selectedChildId,
    setSelectedChildId,
    weeksToBook,
    setWeeksToBook,
    sessionAwards,
    userNameMap,
    showInstanceManagement,
    setShowInstanceManagement,
    upcomingInstances,
    handleCancelInstance,
    handleCancelBooking,
    handleEndSeries,
    handleBook,
    formatSchedule,
  } = useSessionDetailModal(visible, offering, onClose, onUpdate);

  if (!offering) return null;

  const isInviteOnlyOffering = isMyOffering && offering.inviteType === 'CLOSED';
  const invitedAthleteCount = offering.invitedAthleteIds?.length ?? 0;
  const showAttendeeList = offering.sessionType === 'group' && (isMyOffering || isRegistered);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <PageHeader
          title="Session Details"
          showBack
          onBackPress={onClose}
          backIcon="close"
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: palette.border }]}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SessionInfoSection
            offering={offering}
            isMyOffering={isMyOffering}
            registeredCount={registeredCount}
            sessionAwards={sessionAwards}
            formatSchedule={formatSchedule}
          />

          {showAttendeeList && (
            <SessionRegistrations
              offering={offering}
              registeredCount={registeredCount}
              viewer={isMyOffering ? 'coach' : 'registered-athlete'}
              currentUserId={currentUser?.id}
              userNameMap={userNameMap}
            />
          )}

          {isInviteOnlyOffering && (
            <View
              style={[
                styles.inviteManageCard,
                { borderColor: palette.border, backgroundColor: withAlpha(palette.tint, 0.04) },
              ]}
            >
              <Row align="center" justify="between">
                <View style={styles.inviteManageInfo}>
                  <ThemedText type="defaultSemiBold">Invite-Only Access</ThemedText>
                  <ThemedText style={[styles.inviteManageMeta, { color: palette.muted }]}>
                    {invitedAthleteCount} invited
                  </ThemedText>
                </View>
                <Clickable
                  onPress={() => {
                    onClose();
                    router.push(Routes.sessionInvitesCreateForOffering(offering.id));
                  }}
                  style={[styles.inviteManageButton, { backgroundColor: palette.tint }]}
                  accessibilityLabel="Invite athletes to this session"
                >
                  <Row align="center" gap="xxs">
                    <Ionicons name="person-add-outline" size={16} color={palette.onPrimary} />
                    <ThemedText style={[styles.inviteManageButtonText, { color: palette.onPrimary }]}>
                      Invite Athletes
                    </ThemedText>
                  </Row>
                </Clickable>
              </Row>
            </View>
          )}

          {isMyOffering && offering.isRecurring && (
            <SessionInstanceManager
              showInstanceManagement={showInstanceManagement}
              onToggle={() => setShowInstanceManagement(!showInstanceManagement)}
              upcomingInstances={upcomingInstances}
              onCancelInstance={handleCancelInstance}
              onEndSeries={handleEndSeries}
            />
          )}

          {!isCoach && (
            <SessionBookingOptions
              isRegistered={isRegistered}
              isRecurring={offering.isRecurring ?? false}
              hasMultipleKids={hasMultipleKids}
              childOptions={children}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              weeksToBook={weeksToBook}
              onSetWeeks={setWeeksToBook}
              onCancelBooking={handleCancelBooking}
            />
          )}
        </ScrollView>

        {/* Book Now footer */}
        {!isCoach && !isRegistered && (
          <View
            style={[styles.footer, { borderTopColor: palette.border, ...Shadows[scheme].card }]}
          >
            <Clickable
              onPress={handleBook}
              disabled={isFull}
              style={[
                styles.bookButton,
                { backgroundColor: isFull ? palette.muted : palette.tint, ...Shadows[scheme].card },
              ]}
            >
              <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
                {isFull ? 'Session Full' : 'Book Now'}
              </ThemedText>
            </Clickable>
          </View>
        )}

        {/* Coach Complete Session footer */}
        {isMyOffering && registeredCount > 0 && (
          <View
            style={[styles.footer, { borderTopColor: palette.border, ...Shadows[scheme].card }]}
          >
            <Clickable
              onPress={() => {
                onClose();
                router.push(Routes.sessionComplete(offering.id));
              }}
              style={[
                styles.completeButton,
                { backgroundColor: palette.success, ...Shadows[scheme].card },
              ]}
            >
              <Row align="center" justify="center" gap={10}>
                <Ionicons name="checkmark-circle" size={22} color={palette.onSuccess} />
                <ThemedText style={[styles.completeButtonText, { color: palette.onSuccess }]}>
                  Complete Session
                </ThemedText>
              </Row>
            </Clickable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  content: { flex: 1, padding: 20 },
  inviteManageCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inviteManageInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  inviteManageMeta: {
    fontSize: scaleFont(13),
  },
  inviteManageButton: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  inviteManageButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '700',
  },
  footer: { padding: 20, borderTopWidth: 0 },
  bookButton: { paddingVertical: 18, borderRadius: Radii.md, alignItems: 'center' },
  bookButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
  completeButton: { paddingVertical: 18, borderRadius: Radii.md },
  completeButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
});
