/** Session Invite Detail — shows invite details with status, slots, and response actions. */

import { useState, useCallback, useMemo } from 'react';
import { ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { InviteCounterPropose } from '@/components/invite/invite-counter-propose';
import { InviteCounterDisplay } from '@/components/invite/invite-counter-display';
import { InviteActionBar } from '@/components/invite/invite-action-bar';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { inviteService as sessionInviteService, inviteRsvpService, inviteShareService } from '@/services/invite';
import { ServiceEvents } from '@/services/event-bus';
import type { TimeSlot, InviteRsvpResponse } from '@/constants/types';

const logger = createLogger('SessionInviteDetailScreen');

export default function SessionInviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { data: invite, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'Missing invite ID'));
      const data = await sessionInviteService.getInvite(id);
      return data ? ok(data) : err(serviceError('NOT_FOUND', 'Invite not found'));
    },
    deps: [id],
    events: [ServiceEvents.INVITE_ACCEPTED, ServiceEvents.INVITE_BOOKING_FAILED],
  });

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCounterPropose, setShowCounterPropose] = useState(false);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [responding, setResponding] = useState(false);
  const [rsvpResponses, setRsvpResponses] = useState<InviteRsvpResponse[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, maybe: 0, cantGo: 0 });
  const [currentRsvpStatus, setCurrentRsvpStatus] = useState<'going' | 'maybe' | 'cant_go' | null>(null);

  const isCoach = currentUser?.role === 'COACH';
  const isOwner = invite?.coachId === currentUser?.id;
  const isRecipient = invite?.parentId === currentUser?.id;
  const derivedStatus = useMemo(() => {
    if (!invite) return 'PENDING';
    return new Date(invite.expiresAt) < new Date() && invite.status === 'PENDING' ? 'EXPIRED' : invite.status;
  }, [invite]);
  const canRespond = derivedStatus === 'PENDING' && isRecipient;

  const invitationMessage = useMemo(() => {
    if (!invite) return '';
    const first = invite.coachName.split(' ')[0];
    const ath = invite.athleteNames.length === 1 ? invite.athleteNames[0] : `${invite.athleteNames.length} athletes`;
    return invite.clubName ? `Coach ${first} has invited ${ath} to ${invite.clubName}` : `Coach ${first} has invited ${ath} to a ${invite.sessionType.toLowerCase()}`;
  }, [invite]);

  const confirmAcceptance = useCallback(async () => {
    if (!invite || selectedSlot === null) return;
    setResponding(true);
    try {
      const result = await sessionInviteService.respondToInvite({ inviteId: invite.id, response: 'ACCEPTED', selectedSlot: invite.proposedSlots[selectedSlot] });
      setShowPaymentModal(false);
      if (!result.success) { Alert.alert('Booking Failed', result.error?.message ?? 'Could not create the booking.'); return; }
      Alert.alert('Accepted!', 'The session has been confirmed.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) { logger.error('Failed to accept invite', e); Alert.alert('Error', 'Failed to accept invite.'); }
    finally { setResponding(false); }
  }, [invite, selectedSlot]);

  const handleAccept = useCallback(async () => {
    if (!invite || selectedSlot === null) { Alert.alert('Select a time', 'Please select one of the proposed time slots'); return; }
    if (invite.priceUsd && invite.priceUsd > 0) { setShowPaymentModal(true); return; }
    await confirmAcceptance();
  }, [invite, selectedSlot, confirmAcceptance]);

  const handleDecline = useCallback(() => {
    Alert.alert('Decline Invite', 'Are you sure you want to decline this session invite?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        if (!invite) return;
        setResponding(true);
        try { await sessionInviteService.respondToInvite({ inviteId: invite.id, response: 'DECLINED' }); Alert.alert('Declined', 'The invite has been declined.', [{ text: 'OK', onPress: () => router.back() }]); }
        catch (e) { logger.error('Failed to decline invite', e); } finally { setResponding(false); }
      }},
    ]);
  }, [invite]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Invite', 'Are you sure you want to cancel this invite?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        if (!invite) return;
        try { await sessionInviteService.cancelInvite(invite.id); Alert.alert('Cancelled', 'The invite has been cancelled.', [{ text: 'OK', onPress: () => router.back() }]); }
        catch (e) { logger.error('Failed to cancel invite', e); }
      }},
    ]);
  }, [invite]);

  const handleCounterPropose = useCallback(async (slots: TimeSlot[], note: string) => {
    if (!invite) return;
    setResponding(true);
    try { await sessionInviteService.respondToInvite({ inviteId: invite.id, response: 'COUNTERED', counterProposal: slots, counterNote: note || undefined }); Alert.alert('Counter Proposal Sent', 'Your alternative times have been sent to the coach.', [{ text: 'OK', onPress: () => router.back() }]); }
    catch (e) { logger.error('Failed to send counter proposal', e); Alert.alert('Error', 'Failed to send counter proposal.'); }
    finally { setResponding(false); }
  }, [invite]);

  const handleAcceptCounter = useCallback(async (slot: TimeSlot) => {
    if (!invite) return;
    setResponding(true);
    try { const result = await sessionInviteService.acceptCounterProposal(invite.id, slot); if (!result.success) { Alert.alert('Booking Failed', result.error?.message ?? 'Could not create the booking.'); return; } Alert.alert('Accepted!', 'The session has been confirmed with the proposed time.', [{ text: 'OK', onPress: () => router.back() }]); }
    catch (e) { logger.error('Failed to accept counter proposal', e); Alert.alert('Error', 'Failed to accept counter proposal.'); }
    finally { setResponding(false); }
  }, [invite]);

  const handleShare = useCallback(async () => {
    if (!invite) return;
    const s = invite.proposedSlots[0];
    const d = s ? new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
    await inviteShareService.shareInvite(invite.id, invite.coachName, invite.sessionType, d);
  }, [invite]);

  const handleRsvp = useCallback(async (rs: 'going' | 'maybe' | 'cant_go') => {
    if (!invite || !currentUser) return;
    await inviteRsvpService.respondToInvite(invite.id, currentUser.id, currentUser.fullName || currentUser.username || 'User', rs, undefined, undefined, currentUser.avatar);
    setCurrentRsvpStatus(rs);
  }, [invite, currentUser]);

  const handleSelectSlot = useCallback((i: number) => setSelectedSlot(i), []);
  const handleShowCounter = useCallback(() => setShowCounterPropose(true), []);

  if (status === 'loading') return <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}><LoadingState variant="detail" /></SafeAreaView>;
  if (status === 'error') return <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}><ErrorState message={error?.message ?? 'Failed to load invite'} onRetry={retry} /></SafeAreaView>;
  if (status === 'empty' || !invite) return <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}><EmptyState icon="mail-outline" title="Invite Not Found" message="This invite could not be found. It may have been cancelled or removed." /></SafeAreaView>;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" justify="between" paddingH="lg" paddingV="md">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={24} color={colors.text} /></Clickable>
        <ThemedText type="title">Session Invite</ThemedText>
        <Row gap="sm" align="center">
          <Clickable onPress={handleShare} hitSlop={8} accessibilityLabel="Share invite"><Ionicons name="share-outline" size={22} color={colors.text} /></Clickable>
          {isOwner && derivedStatus === 'PENDING' && <Clickable onPress={handleCancel} hitSlop={8} accessibilityLabel="Cancel invite"><Ionicons name="trash-outline" size={22} color={colors.error} /></Clickable>}
        </Row>
      </Row>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {invite.coverImageUrl && <CoverImageHero imageUrl={invite.coverImageUrl} sessionType={invite.sessionType} height={240} />}
          <InviteStatusBanner status={derivedStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'COUNTERED' | 'MAYBE'} colors={colors} />
          {!isCoach && <Animated.View entering={FadeInDown.delay(50).springify()}><Row gap="sm" align="center" style={[s.msg, { backgroundColor: withAlpha(colors.tint, 0.06) }]}><Ionicons name="mail-outline" size={20} color={colors.tint} /><ThemedText style={[s.msgTxt, { color: colors.text }]}>{invitationMessage}</ThemedText></Row></Animated.View>}
          <InvitePersonCard invite={invite} isCoach={!!isCoach} colors={colors} />
          <InviteDetailsCard invite={invite} colors={colors} />
          {invite.proposedSlots[0]?.location && <Animated.View entering={FadeInDown.delay(160).springify()}><LocationMapPreview location={invite.proposedSlots[0].location} coordinates={invite.locationCoordinates} /></Animated.View>}
          {(rsvpCounts.going > 0 || rsvpCounts.maybe > 0) && <Animated.View entering={FadeInDown.delay(170).springify()}><SurfaceCard style={s.att}><AvatarStack attendees={rsvpResponses.filter((r) => r.status === 'going').map((r) => ({ id: r.userId, name: r.userName, photoUrl: r.userPhotoUrl }))} goingCount={rsvpCounts.going} maxVisible={5} onPress={() => setShowAttendeeModal(true)} /></SurfaceCard></Animated.View>}
          <InviteTypeCard inviteType={invite.inviteType || 'OPEN'} squadIds={invite.squadIds} isOwner={!!isOwner} colors={colors} onInvitePlayers={() => router.push(Routes.SESSION_INVITES_CREATE)} />
          <InviteSlotList slots={invite.proposedSlots} selectedSlot={selectedSlot} canRespond={canRespond} colors={colors} onSelectSlot={handleSelectSlot} />
          {canRespond && showCounterPropose && <InviteCounterPropose colors={colors} onClose={() => setShowCounterPropose(false)} onSubmit={handleCounterPropose} responding={responding} />}
          {derivedStatus === 'COUNTERED' && isOwner && invite.counterProposal && <InviteCounterDisplay counterProposal={invite.counterProposal} counterNote={invite.counterNote} colors={colors} onAcceptCounter={handleAcceptCounter} />}
          {derivedStatus === 'PENDING' && <Animated.View entering={FadeInDown.delay(300).springify()}><Row gap="xs" align="center" justify="center" style={[s.exp, { backgroundColor: withAlpha(colors.warning, 0.06) }]}><Ionicons name="time-outline" size={16} color={colors.warning} /><ThemedText style={{ color: colors.warning, ...Typography.small }}>Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</ThemedText></Row></Animated.View>}
        </ScrollView>
      </KeyboardAvoidingView>
      <InviteActionBar canRespond={canRespond} isOwner={!!isOwner} status={derivedStatus} showCounterPropose={showCounterPropose} responding={responding} selectedSlot={selectedSlot} currentRsvpStatus={currentRsvpStatus} colors={colors} onAccept={handleAccept} onDecline={handleDecline} onShowCounter={handleShowCounter} onRsvp={handleRsvp} />
      <AttendeeListModal visible={showAttendeeModal} onClose={() => setShowAttendeeModal(false)} responses={rsvpResponses} counts={rsvpCounts} />
      <PaymentModal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)} onPaymentComplete={confirmAcceptance} invite={invite} selectedSlot={selectedSlot !== null ? invite.proposedSlots[selectedSlot] : null} />
    </SafeAreaView>
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
});
