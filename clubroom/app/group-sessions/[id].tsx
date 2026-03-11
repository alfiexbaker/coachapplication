/**
 * Group Session Detail Screen
 *
 * Full detail view for a group training session.
 * Handles: discovery -> registration -> RSVP -> multi-child -> coach management.
 *
 * States: loading, error, empty, cancelled, completed, active (registered/unregistered).
 * Multi-child: parent picks child -> registers -> each child gets own RSVP.
 * Coach: sees RSVP summary + send reminders + roster + cancel session.
 */

import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { ChildSelector } from '@/components/group/child-selector';
import { DeadlineBadge } from '@/components/group/deadline-badge';
import { FamilyRegistrationCard } from '@/components/group/family-registration-card';
import { GroupSessionCoachActions } from '@/components/group/group-session-coach-actions';
import { GroupSessionDetails } from '@/components/group/group-session-details';
import { GroupSessionHero } from '@/components/group/group-session-hero';
import { RsvpMiniBar } from '@/components/group/rsvp-mini-bar';
import { RsvpSummaryCard } from '@/components/group/rsvp-summary-card';
import { StatusBanner } from '@/components/group/session-status-banner';
import { WaitlistBanner } from '@/components/group/waitlist-banner';
import { WhosGoingCard } from '@/components/group/whos-going-card';
import { Button } from '@/components/primitives/button';
import { Column } from '@/components/primitives/column';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useGroupSession } from '@/hooks/use-group-session';
import { useTheme } from '@/hooks/useTheme';
import { groupSessionService } from '@/services/group-session-service';
import { calendarService } from '@/services/calendar-service';
import { CalendarExportButton } from '@/components/calendar/CalendarExportButton';
import { getGroupSessionClubLabel } from '@/utils/group-display';
import { getGroupSessionOfferDisplay } from '@/utils/session-offer-display';
import { formatInUserTimezone } from '@/utils/timezone';
import { useRequiredParam } from '@/hooks/use-required-param';

export default function GroupSessionDetailScreen() {
  const { colors } = useTheme();
  const idParam = useRequiredParam('id');
  const hook = useGroupSession();
  const {
    id,
    session,
    roster,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    registering,
    responding,
    isCoach,
    isRegistered,
    isWaitlisted,
    isActive,
    isFull,
    isFree,
    spotsLeft,
    children,
    hasMultipleKids,
    selectedChildId,
    setSelectedChildId,
    unregisteredChildren,
    myRegistrations,
    waitlistPosition,
    waitlistTotal,
    rsvpCounts,
    handleRegister,
    handleUnregister,
    handleRsvpRespond,
    handleCancel,
    handleSendReminder,
    toButtonStatus,
    cancellationPolicy,
  } = hook;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(Routes.HOME);
    }
  };

  const header = (
    <PageHeader title="Session Details" showBack centerTitle onBackPress={handleBack} />
  );
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {header}
      {content}
    </SafeAreaView>
  );

  // -------------------------------------------------------------------------
  // Loading / Error / Empty states
  // -------------------------------------------------------------------------

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (!idParam.valid) {
    return renderShell(<ErrorState message="Invalid session link." onRetry={handleBack} />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState
        message={error?.message || 'Failed to load group session details.'}
        onRetry={retry}
      />,
    );
  }

  if (status === 'empty' || !session) {
    return renderShell(
      <EmptyState
        icon="calendar-outline"
        title="Session not found"
        message="This session may have been removed."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------

  const capacityColor = isFull ? colors.error : spotsLeft <= 3 ? colors.warning : colors.success;
  const clubLabel = getGroupSessionClubLabel(session);
  const offerDisplay = getGroupSessionOfferDisplay(session);
  const isCancelled = session.status === 'CANCELLED';
  const isCompleted = session.status === 'COMPLETED';
  const isPastRegistrationDeadline = Boolean(
    session.registrationDeadline && new Date(session.registrationDeadline).getTime() < Date.now(),
  );
  const canRegister = isActive && !isCoach && !isFull && !isPastRegistrationDeadline;
  const canJoinWaitlist = isActive && !isCoach && isFull && session.waitlistEnabled;
  const canRegisterMore = canRegister && unregisteredChildren.length > 0 && isRegistered;
  const showRegisterFooter =
    isActive &&
    !isCoach &&
    !isFull &&
    (!isRegistered || (isRegistered && unregisteredChildren.length > 0));
  const registrationDeadlineLabel = session.registrationDeadline
    ? formatInUserTimezone(session.registrationDeadline, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return renderShell(
    <>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <GroupSessionHero session={session} isCoach={isCoach} />

        <View style={styles.content}>
          {/* Status Banners */}
          {isCancelled && (
            <StatusBanner icon="close-circle" label="This session has been cancelled" color={colors.error} />
          )}
          {isCompleted && (
            <StatusBanner icon="checkmark-circle" label="This session has been completed" color={colors.success} />
          )}
          {isPastRegistrationDeadline && !isCoach && (
            <Row
              align="center"
              gap="xs"
              style={[styles.closedBanner, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
            >
              <Ionicons name="time-outline" size={18} color={colors.warning} />
              <Column flex>
                <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.warning }]}>
                  Registration closed
                </ThemedText>
                {registrationDeadlineLabel && (
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Deadline was {registrationDeadlineLabel}
                  </ThemedText>
                )}
              </Column>
            </Row>
          )}

          {/* RSVP FIRST — "Who's Going?" for multi-child, single card for solo */}
          {isRegistered && !isCoach && isActive && (
            children.length > 0 ? (
              <WhosGoingCard
                registrations={myRegistrations}
                deadline={session.registrationDeadline}
                responding={responding}
                onRsvpRespond={handleRsvpRespond}
                onUnregister={handleUnregister}
                toButtonStatus={toButtonStatus}
              />
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {session.registrationDeadline && (
                  <DeadlineBadge deadline={session.registrationDeadline} />
                )}
                {myRegistrations.map((fr) => (
                  <FamilyRegistrationCard
                    key={fr.registration.id}
                    familyReg={fr}
                    isActive={isActive}
                    showChildName={false}
                    statusDetail={offerDisplay.registrationLabel}
                    responding={responding}
                    onRsvpRespond={(s) => handleRsvpRespond(fr, s)}
                    onUnregister={() => handleUnregister(fr)}
                    toButtonStatus={toButtonStatus}
                  />
                ))}
              </View>
            )
          )}

          {/* Coach RSVP Summary — also elevated to top */}
          {isCoach && rsvpCounts.total > 0 && (
            <View style={{ gap: Spacing.sm }}>
              <RsvpMiniBar counts={rsvpCounts} />
              {session.registrationDeadline && (
                <DeadlineBadge deadline={session.registrationDeadline} />
              )}
              <RsvpSummaryCard
                counts={rsvpCounts}
                onSendReminder={rsvpCounts.pending > 0 ? handleSendReminder : undefined}
              />
            </View>
          )}

          {/* Title & Price */}
          <Row justify="between" align="start">
            <Column flex>
              <ThemedText type="title">{session.title}</ThemedText>
              {clubLabel && (
                <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.xxs }]}>
                  by {clubLabel}
                </ThemedText>
              )}
            </Column>
            <Column align="flex-end">
              <ThemedText style={[Typography.title, { color: colors.tint }]}>
                {isFree
                  ? 'Free'
                  : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
              </ThemedText>
              {!isFree && (
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>per person</ThemedText>
              )}
            </Column>
          </Row>

          {/* Registrations for completed/non-active sessions (below title) */}
          {isRegistered && !isCoach && !isActive && (
            children.length > 0 ? (
              <WhosGoingCard
                registrations={myRegistrations}
                deadline={null}
                responding={responding}
                onRsvpRespond={handleRsvpRespond}
                onUnregister={handleUnregister}
                toButtonStatus={toButtonStatus}
              />
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {myRegistrations.map((fr) => (
                  <FamilyRegistrationCard
                    key={fr.registration.id}
                    familyReg={fr}
                    isActive={isActive}
                    showChildName={false}
                    statusDetail={offerDisplay.registrationLabel}
                    responding={responding}
                    onRsvpRespond={(s) => handleRsvpRespond(fr, s)}
                    onUnregister={() => handleUnregister(fr)}
                    toButtonStatus={toButtonStatus}
                  />
                ))}
              </View>
            )
          )}

          {/* Child Selector (for registering another child) */}
          {canRegisterMore && (
            <ChildSelector
              options={unregisteredChildren}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          )}

          {/* Child Selector (for first registration when multi-kid) */}
          {!isRegistered && !isCoach && hasMultipleKids && isActive && (
            <ChildSelector
              options={children}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />
          )}

          {/* Deadline for unregistered users */}
          {!isRegistered && !isCoach && session.registrationDeadline && isActive && (
            <DeadlineBadge deadline={session.registrationDeadline} />
          )}

          {/* Waitlist Banner */}
          {canJoinWaitlist && !isRegistered && (
            <WaitlistBanner
              waitlistCount={session.waitlistCount}
              onJoinWaitlist={handleRegister}
              loading={registering}
            />
          )}

          {isWaitlisted && (
            <WaitlistBanner
              waitlistCount={waitlistTotal || session.waitlistCount}
              userPosition={waitlistPosition}
              alreadyJoined
              onJoinWaitlist={handleRegister}
            />
          )}

          {/* Capacity Badge */}
          {isActive && (
            <Row
              align="center"
              gap="xs"
              style={[styles.capacityBadge, { backgroundColor: withAlpha(capacityColor, 0.09) }]}
            >
              <Ionicons name={isFull ? 'warning' : 'people'} size={18} color={capacityColor} />
              <ThemedText style={[Typography.bodySmallSemiBold, { color: capacityColor }]}>
                {isFull
                  ? `Full${session.waitlistEnabled ? ` \u00B7 ${session.waitlistCount} on waitlist` : ''}`
                  : `${spotsLeft} of ${session.maxParticipants} spots left`}
              </ThemedText>
            </Row>
          )}

          <GroupSessionDetails session={session} />

          {/* Calendar Export */}
          <CalendarExportButton
            onExport={() => calendarService.exportGroupSessionToCalendar(session)}
            label="Add to Calendar"
            variant="secondary"
            size="medium"
          />

          {/* Cancellation Policy — shown to parents considering registration */}
          {!isCoach && cancellationPolicy && (
            <CancellationPolicyCard coachId={session.coachId} policy={cancellationPolicy} />
          )}

          {isCoach && (
            <GroupSessionCoachActions
              sessionId={id}
              rosterCount={roster?.length ?? 0}
              onCancel={handleCancel}
            />
          )}
        </View>
      </ScrollView>

      {/* Registration Footer */}
      {showRegisterFooter && (
        <Row
          align="center"
          justify="between"
          style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}
        >
          <View>
            <ThemedText style={[Typography.heading, { color: colors.tint }]}>
              {isFree ? 'Free' : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              {canRegisterMore
                ? `Register another child \u00B7 ${spotsLeft} left`
                : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
            </ThemedText>
          </View>
          <Button onPress={handleRegister} disabled={registering || isPastRegistrationDeadline}>
            {registering
              ? 'Registering...'
              : isPastRegistrationDeadline
                ? 'Registration Closed'
              : canRegisterMore
                  ? 'Add Child'
                  : 'Register Now'}
          </Button>
        </Row>
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  capacityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignSelf: 'flex-start',
  },
  closedBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
