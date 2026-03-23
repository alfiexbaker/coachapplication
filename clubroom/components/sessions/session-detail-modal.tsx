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
import { SessionOwnershipSection } from './session-ownership-section';

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
    canManageOffering,
    canReassignOwnership,
    assigneeOptions,
    selectedAssigneeId,
    setSelectedAssigneeId,
    reassigningOwnership,
    ownershipTimeline,
    ownerCoachName,
    clubLabel,
    registeredCount,
    offPlatformParticipants,
    totalParticipants,
    draftOffPlatformParticipants,
    savingOffPlatform,
    isFull,
    isRegistered,
    isSessionInPast,
    canLeaveReview,
    canOpenBookingDetail,
    postSessionMessage,
    children,
    bookableChildren,
    hasMultipleKids,
    selectedChildIds,
    toggleSelectedChildId,
    canAddAnotherChild,
    weeksToBook,
    setWeeksToBook,
    sessionAwards,
    userNameMap,
    showInstanceManagement,
    setShowInstanceManagement,
    upcomingInstances,
    handleCancelInstance,
    handleCancelBooking,
    handleOpenReview,
    handleOpenBookingDetail,
    handleMessageCoach,
    handleReportProblem,
    handleBookAgain,
    handleEndSeries,
    handleReassignOwnership,
    handleAdjustOffPlatform,
    handleSaveOffPlatformParticipants,
    handleBook,
    formatSchedule,
  } = useSessionDetailModal(visible, offering, onClose, onUpdate);

  if (!offering) return null;

  const isInviteOnlyOffering = isMyOffering && offering.inviteType === 'CLOSED';
  const invitedAthleteCount = offering.invitedAthleteIds?.length ?? 0;
  const showAttendeeList = offering.sessionType === 'group' && (isMyOffering || isRegistered);
  const showOwnershipSection = isCoach || canManageOffering;
  const needsBookingSelection = bookableChildren.length > 0 && selectedChildIds.length === 0;
  const bookingFooterDisabled = isFull || needsBookingSelection;

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
            offPlatformParticipants={offPlatformParticipants}
            totalParticipants={totalParticipants}
            sessionAwards={sessionAwards}
            formatSchedule={formatSchedule}
          />

          {showOwnershipSection ? (
            <SessionOwnershipSection
              actingAs={offering.actingAs}
              clubLabel={clubLabel}
              ownerCoachName={ownerCoachName}
              canReassign={canReassignOwnership}
              assigneeOptions={assigneeOptions}
              selectedAssigneeId={selectedAssigneeId}
              onSelectAssignee={(value) => setSelectedAssigneeId(value)}
              onReassign={handleReassignOwnership}
              reassigning={reassigningOwnership}
              timeline={ownershipTimeline}
            />
          ) : null}

          {showAttendeeList && (
            <SessionRegistrations
              offering={offering}
              registeredCount={registeredCount}
              viewer={isMyOffering ? 'coach' : 'registered-athlete'}
              currentUserId={currentUser?.id}
              userNameMap={userNameMap}
            />
          )}

          {canManageOffering && offering.sessionType === 'group' && (
            <View
              style={[
                styles.offPlatformCard,
                { borderColor: palette.border, backgroundColor: withAlpha(palette.tint, 0.04) },
              ]}
            >
              <Row align="center" justify="between" gap="sm">
                <View style={styles.offPlatformInfo}>
                  <ThemedText type="defaultSemiBold">Off-platform attendees</ThemedText>
                  <ThemedText style={[styles.offPlatformMeta, { color: palette.muted }]}>
                    Track walk-ins and offline payments for reconciliation.
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.offPlatformCount,
                    { backgroundColor: withAlpha(palette.tint, 0.12) },
                  ]}
                >
                  <ThemedText style={[styles.offPlatformCountText, { color: palette.tint }]}>
                    {draftOffPlatformParticipants}
                  </ThemedText>
                </View>
              </Row>

              <Row gap="xs">
                <Clickable
                  onPress={() => handleAdjustOffPlatform(-1)}
                  disabled={savingOffPlatform || draftOffPlatformParticipants <= 0}
                  accessibilityLabel="Decrease off-platform attendee count"
                  style={[
                    styles.counterButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      opacity: savingOffPlatform || draftOffPlatformParticipants <= 0 ? 0.55 : 1,
                    },
                  ]}
                >
                  <Ionicons name="remove" size={18} color={palette.text} />
                </Clickable>

                <Clickable
                  onPress={() => handleAdjustOffPlatform(1)}
                  disabled={savingOffPlatform}
                  accessibilityLabel="Increase off-platform attendee count"
                  style={[
                    styles.counterButton,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      opacity: savingOffPlatform ? 0.55 : 1,
                    },
                  ]}
                >
                  <Ionicons name="add" size={18} color={palette.text} />
                </Clickable>

                <Clickable
                  onPress={handleSaveOffPlatformParticipants}
                  disabled={savingOffPlatform || draftOffPlatformParticipants === offPlatformParticipants}
                  accessibilityLabel="Save off-platform attendee count"
                  style={[
                    styles.offPlatformSaveButton,
                    {
                      backgroundColor: palette.tint,
                      opacity:
                        savingOffPlatform || draftOffPlatformParticipants === offPlatformParticipants
                          ? 0.55
                          : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.offPlatformSaveText, { color: palette.onPrimary }]}>
                    {savingOffPlatform ? 'Saving...' : 'Save'}
                  </ThemedText>
                </Clickable>
              </Row>
            </View>
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
              isSessionInPast={isSessionInPast}
              canAddAnotherChild={canAddAnotherChild}
              canLeaveReview={canLeaveReview}
              canOpenBookingDetail={canOpenBookingDetail}
              postSessionMessage={postSessionMessage}
              isRecurring={offering.isRecurring ?? false}
              hasMultipleKids={hasMultipleKids}
              childOptions={bookableChildren}
              selectedChildIds={selectedChildIds}
              onToggleChild={toggleSelectedChildId}
              weeksToBook={weeksToBook}
              onSetWeeks={setWeeksToBook}
              onCancelBooking={handleCancelBooking}
              onLeaveReview={handleOpenReview}
              onOpenBookingDetail={handleOpenBookingDetail}
              onMessageCoach={handleMessageCoach}
              onReportProblem={handleReportProblem}
              onBookAgain={handleBookAgain}
            />
          )}
        </ScrollView>

        {/* Continue Booking footer */}
        {!isCoach && !isSessionInPast && (!isRegistered || canAddAnotherChild) && (
          <View
            style={[styles.footer, { borderTopColor: palette.border, ...Shadows[scheme].card }]}
          >
            <Clickable
              onPress={handleBook}
              disabled={bookingFooterDisabled}
              style={[
                styles.bookButton,
                {
                  backgroundColor: bookingFooterDisabled ? palette.muted : palette.tint,
                  ...Shadows[scheme].card,
                },
              ]}
            >
              <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
                {isFull
                  ? 'Session Full'
                  : needsBookingSelection
                    ? "Choose who's attending"
                  : isRegistered && canAddAnotherChild
                    ? selectedChildIds.length > 1
                      ? `Add ${selectedChildIds.length} family members`
                      : 'Add family member'
                    : selectedChildIds.length > 1
                      ? `Continue (${selectedChildIds.length} attending)`
                      : bookableChildren.length === 0
                        ? 'Book this session'
                        : 'Continue to booking'}
              </ThemedText>
            </Clickable>
          </View>
        )}

        {/* Coach Complete Session footer */}
        {isMyOffering && totalParticipants > 0 && (
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
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  content: { flex: 1, padding: Spacing.md },
  offPlatformCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  offPlatformInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  offPlatformMeta: {
    fontSize: scaleFont(13),
  },
  offPlatformCount: {
    minWidth: 44,
    minHeight: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  offPlatformCountText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
  },
  counterButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offPlatformSaveButton: {
    flex: 1,
    borderRadius: Radii.md,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  offPlatformSaveText: {
    fontSize: scaleFont(13),
    fontWeight: '700',
  },
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
  footer: { padding: Spacing.md, borderTopWidth: 0 },
  bookButton: { paddingVertical: 18, borderRadius: Radii.md, alignItems: 'center' },
  bookButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
  completeButton: { paddingVertical: 18, borderRadius: Radii.md },
  completeButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
});
