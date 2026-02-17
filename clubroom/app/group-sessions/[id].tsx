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

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Routes } from '@/navigation/routes';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { WaitlistBanner } from '@/components/group/waitlist-banner';
import { GroupSessionHero } from '@/components/group/group-session-hero';
import { GroupSessionDetails } from '@/components/group/group-session-details';
import { GroupSessionCoachActions } from '@/components/group/group-session-coach-actions';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { RsvpMiniBar } from '@/components/group/rsvp-mini-bar';
import { DeadlineBadge } from '@/components/group/deadline-badge';
import { StatusBanner } from '@/components/group/session-status-banner';
import { RsvpSummaryCard } from '@/components/group/rsvp-summary-card';
import { FamilyRegistrationCard } from '@/components/group/family-registration-card';
import { WhosGoingCard } from '@/components/group/whos-going-card';
import { ChildSelector } from '@/components/group/child-selector';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGroupSession } from '@/hooks/use-group-session';
import { groupSessionService } from '@/services/group-session-service';
import { getGroupSessionClubLabel } from '@/utils/group-display';

export default function GroupSessionDetailScreen() {
  const { colors } = useTheme();
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
    rsvpCounts,
    handleRegister,
    handleUnregister,
    handleRsvpRespond,
    handleCancel,
    handleSendReminder,
    toButtonStatus,
    cancellationPolicy,
    deadline,
    isDeadlinePassed,
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

  // -------------------------------------------------------------------------
  // Loading / Error / Empty states
  // -------------------------------------------------------------------------

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <ErrorState
          message={error?.message || 'Failed to load group session details.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !session) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {header}
        <EmptyState
          icon="calendar-outline"
          title="Session not found"
          message="This session may have been removed."
          actionLabel="Go Back"
          onPressAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------

  const capacityColor = isFull ? colors.error : spotsLeft <= 3 ? colors.warning : colors.success;
  const clubLabel = getGroupSessionClubLabel(session);
  const isCancelled = session.status === 'CANCELLED';
  const isCompleted = session.status === 'COMPLETED';
  const canRegister = isActive && !isCoach && !isFull;
  const canJoinWaitlist = isActive && !isCoach && isFull && session.waitlistEnabled;
  const canRegisterMore = canRegister && unregisteredChildren.length > 0 && isRegistered;
  const showRegisterFooter = isActive && !isCoach && !isFull && (!isRegistered || canRegisterMore);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {header}
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
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{session.title}</ThemedText>
              {clubLabel && (
                <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.xxs }]}>
                  by {clubLabel}
                </ThemedText>
              )}
            </View>
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
            <ChildSelector children={unregisteredChildren} selectedId={selectedChildId} onSelect={setSelectedChildId} />
          )}

          {/* Child Selector (for first registration when multi-kid) */}
          {!isRegistered && !isCoach && hasMultipleKids && isActive && (
            <ChildSelector children={children} selectedId={selectedChildId} onSelect={setSelectedChildId} />
          )}

          {/* Deadline for unregistered users */}
          {!isRegistered && !isCoach && session.registrationDeadline && isActive && (
            <DeadlineBadge deadline={session.registrationDeadline} />
          )}

          {/* Waitlist Banner */}
          {canJoinWaitlist && !isRegistered && (
            <WaitlistBanner waitlistCount={session.waitlistCount} onJoinWaitlist={handleRegister} loading={registering} />
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

          {/* Cancellation Policy — shown to parents considering registration */}
          {!isCoach && cancellationPolicy && (
            <CancellationPolicyCard coachId={session.coachId} policy={cancellationPolicy} />
          )}

          {isCoach && (
            <GroupSessionCoachActions sessionId={id} rosterCount={roster.length} onCancel={handleCancel} />
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
          <Button onPress={handleRegister} disabled={registering}>
            {registering ? 'Registering...' : canRegisterMore ? 'Add Child' : 'Register Now'}
          </Button>
        </Row>
      )}
    </SafeAreaView>
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
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
