/** Session Invite Detail — shows invite details with status, slots, and response actions. */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';
import { createLogger } from '@/utils/logger';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { ok, err, serviceError } from '@/types/result';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { CoverImageHero } from '@/components/invite/cover-image-hero';
import { AvatarStack } from '@/components/invite/avatar-stack';
import { AttendeeListModal } from '@/components/invite/attendee-list-modal';
import { LocationMapPreview } from '@/components/invite/location-map-preview';
import { PaymentModal } from '@/components/payment/payment-modal';
import { InviteStatusBanner } from '@/components/invite/invite-status-banner';
import { InvitePersonCard } from '@/components/invite/invite-person-card';
import { InviteDetailsCard } from '@/components/invite/invite-details-card';
import { InviteTypeCard } from '@/components/invite/invite-type-card';
import { InviteSlotList } from '@/components/invite/invite-slot-list';
import { InviteActionBar } from '@/components/invite/invite-action-bar';
import { InviteRsvpStats } from '@/components/invite/invite-rsvp-stats';
import { InviteChildHeader } from '@/components/invite/invite-child-header';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useToast } from '@/components/ui/toast';
import { useAppAlert } from '@/components/ui/app-alert';
import {
  inviteService as sessionInviteService,
  inviteRsvpService,
  inviteShareService,
} from '@/services/invite';
import { ServiceEvents } from '@/services/event-bus';
import type { InviteRsvpResponse } from '@/constants/types';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
} from '@/utils/session-invite-display';
import { useChildContext } from '@/hooks/use-child-context';
import { formatInUserTimezone } from '@/utils/timezone';

const logger = createLogger('SessionInviteDetailScreen');

export default function SessionInviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { showAlert } = useAppAlert();
  const { isMultiChild, getChildById } = useChildContext();
  const {
    data: invite,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
  } = useScreen({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'Missing invite ID'));
      const data = await sessionInviteService.getInvite(id);
      return data ? ok(data) : err(serviceError('NOT_FOUND', 'Invite not found'));
    },
    deps: [id],
    events: [
      ServiceEvents.INVITE_ACCEPTED,
      ServiceEvents.INVITE_BOOKING_FAILED,
      ServiceEvents.INVITE_RSVP_RESPONDED,
    ],
  });

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [responding, setResponding] = useState(false);
  const [rsvpResponses, setRsvpResponses] = useState<InviteRsvpResponse[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, maybe: 0, cantGo: 0 });
  const [currentRsvpStatus, setCurrentRsvpStatus] = useState<'going' | 'maybe' | 'cant_go' | null>(
    null,
  );

  const isCoach = currentUser?.role === 'COACH';
  const isOwner = invite?.coachId === currentUser?.id;
  const isRecipient = invite?.parentId === currentUser?.id;
  const coachName = useMemo(() => (invite ? getSessionInviteCoachName(invite) : 'Coach'), [invite]);
  const athleteNames = useMemo(
    () => (invite ? getSessionInviteAthleteNames(invite) : []),
    [invite],
  );
  const derivedStatus = useMemo(() => {
    if (!invite) return 'PENDING';
    if (invite.status === 'COUNTERED') return 'PENDING';
    return new Date(invite.expiresAt) < new Date() && invite.status === 'PENDING'
      ? 'EXPIRED'
      : invite.status;
  }, [invite]);
  const canRespond = derivedStatus === 'PENDING' && isRecipient;
  const totalRsvpResponses = rsvpCounts.going + rsvpCounts.maybe + rsvpCounts.cantGo;

  useEffect(() => {
    if (!invite || !currentUser) {
      setRsvpResponses([]);
      setRsvpCounts({ going: 0, maybe: 0, cantGo: 0 });
      setCurrentRsvpStatus(null);
      return;
    }

    let isMounted = true;

    const loadRsvpData = async () => {
      const [responsesResult, countsResult] = await Promise.all([
        inviteRsvpService.getResponses(invite.id),
        inviteRsvpService.getCounts(invite.id),
      ]);

      if (!isMounted) return;

      const responses = responsesResult.success
        ? responsesResult.data
        : (invite.rsvpResponses ?? []);
      const counts = countsResult.success
        ? countsResult.data
        : (invite.rsvpCounts ?? { going: 0, maybe: 0, cantGo: 0 });

      setRsvpResponses(responses);
      setRsvpCounts(counts);

      const own = responses.find((r) => r.userId === currentUser.id);
      setCurrentRsvpStatus(own?.status ?? null);
    };

    void loadRsvpData();

    return () => {
      isMounted = false;
    };
  }, [invite, currentUser]);

  const invitationMessage = useMemo(() => {
    if (!invite) return '';
    const first = coachName.split(' ')[0];
    const ath = athleteNames.length === 1 ? athleteNames[0] : `${athleteNames.length} athletes`;
    return invite.clubName
      ? `Coach ${first} has invited ${ath} to ${invite.clubName}`
      : `Coach ${first} has invited ${ath} to a ${invite.sessionType.toLowerCase()}`;
  }, [athleteNames, coachName, invite]);

  const confirmAcceptance = useCallback(async () => {
    if (!invite || selectedSlot === null) return;
    setResponding(true);
    try {
      const result = await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot: invite.proposedSlots[selectedSlot],
      });
      setShowPaymentModal(false);
      if (!result.success) {
        showAlert('Booking Failed', result.error?.message ?? 'Could not create the booking.');
        return;
      }
      showToast('Invite accepted!', 'success');
      const acceptedInvite = result.data;
      if (acceptedInvite.bookingId) {
        router.replace(Routes.booking(acceptedInvite.bookingId));
      } else if (acceptedInvite.existingSessionId) {
        router.replace(Routes.groupSession(acceptedInvite.existingSessionId));
      } else {
        router.replace(Routes.GROUP_SESSIONS);
      }
    } catch (e) {
      logger.error('Failed to accept invite', e);
      showAlert('Error', 'Failed to accept invite.');
    } finally {
      setResponding(false);
    }
  }, [invite, selectedSlot, showAlert, showToast]);

  const handleAccept = useCallback(async () => {
    if (!invite || selectedSlot === null) {
      showAlert('Select a time', 'Please select one of the proposed time slots');
      return;
    }
    if (invite.price && invite.price > 0) {
      setShowPaymentModal(true);
      return;
    }
    await confirmAcceptance();
  }, [invite, selectedSlot, confirmAcceptance, showAlert]);

  const handleDecline = useCallback(() => {
    showAlert('Decline Invite', 'Are you sure you want to decline this session invite?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          if (!invite) return;
          setResponding(true);
          try {
            await sessionInviteService.respondToInvite({
              inviteId: invite.id,
              response: 'DECLINED',
            });
            showAlert('Declined', 'The invite has been declined.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (e) {
            logger.error('Failed to decline invite', e);
          } finally {
            setResponding(false);
          }
        },
      },
    ]);
  }, [invite, showAlert]);

  const handleCancel = useCallback(() => {
    showAlert('Cancel Invite', 'Are you sure you want to cancel this invite?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!invite) return;
          try {
            await sessionInviteService.cancelInvite(invite.id);
            showAlert('Cancelled', 'The invite has been cancelled.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (e) {
            logger.error('Failed to cancel invite', e);
          }
        },
      },
    ]);
  }, [invite, showAlert]);

  const handleShare = useCallback(async () => {
    if (!invite) return;
    const s = invite.proposedSlots[0];
    const d = s
      ? formatInUserTimezone(`${s.date}T${s.startTime || '00:00'}`, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : '';
    await inviteShareService.shareInvite(invite.id, coachName, invite.sessionType, d);
  }, [coachName, invite]);

  const handleRsvp = useCallback(
    async (rs: 'going' | 'maybe' | 'cant_go') => {
      if (!invite || !currentUser) return;
      const result = await inviteRsvpService.respondToInvite(
        invite.id,
        currentUser.id,
        currentUser.fullName || currentUser.username || 'User',
        rs,
        undefined,
        undefined,
        currentUser.avatar,
      );
      if (!result.success) {
        showAlert('Could not RSVP', result.error.message);
        return;
      }
      setCurrentRsvpStatus(rs);

      const [responsesResult, countsResult] = await Promise.all([
        inviteRsvpService.getResponses(invite.id),
        inviteRsvpService.getCounts(invite.id),
      ]);
      if (responsesResult.success) setRsvpResponses(responsesResult.data);
      if (countsResult.success) setRsvpCounts(countsResult.data);
    },
    [invite, currentUser, showAlert],
  );

  const handleSendReminder = useCallback(async () => {
    if (!invite) return;

    const result = await sessionInviteService.sendInviteReminder(invite.id);
    if (!result.success) {
      showAlert('Reminder not sent', result.error.message);
      return;
    }

    showAlert('Reminder sent', "We've nudged the parent to respond to this invite.");
  }, [invite, showAlert]);

  const handleSelectSlot = useCallback((i: number) => setSelectedSlot(i), []);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (status === 'loading')
    return renderShell(<LoadingState variant="detail" />);
  if (status === 'error')
    return renderShell(<ErrorState message={error?.message ?? 'Failed to load invite'} onRetry={retry} />);
  if (status === 'empty' || !invite)
    return renderShell(
      <EmptyState
        icon="mail-outline"
        title="Invite Not Found"
        message="This invite could not be found. It may have been cancelled or removed."
      />,
    );

  return renderShell(
    <>
      <Row gap="md" align="center" justify="between" paddingH="lg" paddingV="md">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title">Session Invite</ThemedText>
        <Row gap="sm" align="center">
          <Clickable onPress={handleShare} hitSlop={8} accessibilityLabel="Share invite">
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Clickable>
          {isOwner && derivedStatus === 'PENDING' && (
            <Clickable onPress={handleCancel} hitSlop={8} accessibilityLabel="Cancel invite">
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Clickable>
          )}
        </Row>
      </Row>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
        >
          {invite.coverImageUrl && (
            <CoverImageHero
              imageUrl={invite.coverImageUrl}
              sessionType={invite.sessionType}
              height={240}
            />
          )}
          <InviteStatusBanner
            status={
              derivedStatus as
                | 'PENDING'
                | 'ACCEPTED'
                | 'DECLINED'
                | 'EXPIRED'
                | 'MAYBE'
            }
            colors={colors}
          />
          {!isCoach && invite.athleteIds.length > 0 && (
            <InviteChildHeader
              childIds={invite.athleteIds}
              getChildById={getChildById}
              isMultiChild={isMultiChild}
            />
          )}
          {!isCoach && (
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <Row
                gap="sm"
                align="center"
                style={[s.msg, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
              >
                <Ionicons name="mail-outline" size={20} color={colors.tint} />
                <ThemedText style={[s.msgTxt, { color: colors.text }]}>
                  {invitationMessage}
                </ThemedText>
              </Row>
            </Animated.View>
          )}
          <InvitePersonCard invite={invite} isCoach={!!isCoach} colors={colors} />
          <InviteDetailsCard invite={invite} colors={colors} />
          {invite.proposedSlots[0]?.location && (
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <LocationMapPreview
                location={invite.proposedSlots[0].location}
                coordinates={invite.locationCoordinates}
              />
            </Animated.View>
          )}
          {totalRsvpResponses > 0 && (
            <Animated.View entering={FadeInDown.delay(170).springify()}>
              <SurfaceCard style={s.att}>
                <AvatarStack
                  attendees={rsvpResponses
                    .filter((r) => r.status === 'going')
                    .map((r) => ({ id: r.userId, name: r.userName, photoUrl: r.userPhotoUrl }))}
                  goingCount={rsvpCounts.going}
                  maxVisible={5}
                  onPress={() => setShowAttendeeModal(true)}
                />
              </SurfaceCard>
            </Animated.View>
          )}
          {totalRsvpResponses > 0 && (
            <Animated.View entering={FadeInDown.delay(175).springify()}>
              <InviteRsvpStats counts={rsvpCounts} colors={colors} />
            </Animated.View>
          )}
          <InviteTypeCard
            inviteType={invite.inviteType || 'OPEN'}
            squadIds={invite.squadIds}
            isOwner={!!isOwner}
            colors={colors}
            onInvitePlayers={() => router.push(Routes.SESSION_INVITES_CREATE)}
          />
          <InviteSlotList
            slots={invite.proposedSlots}
            selectedSlot={selectedSlot}
            canRespond={canRespond}
            colors={colors}
            onSelectSlot={handleSelectSlot}
          />
          {derivedStatus === 'PENDING' && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Row
                gap="xs"
                align="center"
                justify="center"
                style={[s.exp, { backgroundColor: withAlpha(colors.warning, 0.06) }]}
              >
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <ThemedText style={{ color: colors.warning, ...Typography.small }}>
                  Expires{' '}
                  {formatInUserTimezone(invite.expiresAt, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                </ThemedText>
              </Row>
              {isOwner && (
                <Clickable
                  onPress={handleSendReminder}
                  style={[s.reminderBtn, { borderColor: colors.tint }]}
                  accessibilityLabel="Send reminder to parent"
                >
                  <Row align="center" justify="center" gap="xs">
                    <Ionicons name="notifications-outline" size={16} color={colors.tint} />
                    <ThemedText style={{ color: colors.tint, ...Typography.bodySemiBold }}>
                      Send Reminder
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <InviteActionBar
        canRespond={canRespond}
        isOwner={!!isOwner}
        status={derivedStatus}
        responding={responding}
        selectedSlot={selectedSlot}
        currentRsvpStatus={currentRsvpStatus}
        colors={colors}
        onAccept={handleAccept}
        onDecline={handleDecline}
        onRsvp={handleRsvp}
      />
      <AttendeeListModal
        visible={showAttendeeModal}
        onClose={() => setShowAttendeeModal(false)}
        responses={rsvpResponses}
        counts={rsvpCounts}
      />
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={confirmAcceptance}
        invite={invite}
        selectedSlot={selectedSlot !== null ? invite.proposedSlots[selectedSlot] : null}
      />
    </>,
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  msg: { padding: Spacing.md, borderRadius: Radii.md },
  msgTxt: { ...Typography.subheading, flex: 1, lineHeight: 22 },
  att: { padding: Spacing.md },
  exp: { padding: Spacing.md, borderRadius: Radii.md },
  reminderBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
  },
});
