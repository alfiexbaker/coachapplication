/**
 * Group Session Detail Screen
 *
 * Full detail view for a group training session.
 * Handles: discovery → registration → RSVP → multi-child → coach management.
 *
 * States: loading, error, empty, cancelled, completed, active (registered/unregistered).
 * Multi-child: parent picks child → registers → each child gets own RSVP.
 * Coach: sees RSVP summary + send reminders + roster + cancel session.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { WaitlistBanner } from '@/components/group/waitlist-banner';
import { GroupSessionHero } from '@/components/group/group-session-hero';
import { GroupSessionDetails } from '@/components/group/group-session-details';
import { GroupSessionCoachActions } from '@/components/group/group-session-coach-actions';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGroupSession, type FamilyRegistration } from '@/hooks/use-group-session';
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
  } = hook;

  const header = (
    <PageHeader title="Session Details" showBack centerTitle onBackPress={() => router.back()} />
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
          onPressAction={() => router.back()}
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
  // Can register more kids (has unregistered children and session is open)
  const canRegisterMore = canRegister && unregisteredChildren.length > 0 && isRegistered;
  // Show the footer register CTA
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
          {/* ─── Status Banners ─── */}
          {isCancelled && (
            <StatusBanner
              icon="close-circle"
              label="This session has been cancelled"
              color={colors.error}
            />
          )}
          {isCompleted && (
            <StatusBanner
              icon="checkmark-circle"
              label="This session has been completed"
              color={colors.success}
            />
          )}

          {/* ─── Title & Price ─── */}
          <Row justify="between" align="start">
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{session.title}</ThemedText>
              {clubLabel && (
                <ThemedText
                  style={[Typography.small, { color: colors.muted, marginTop: Spacing.xxs }]}
                >
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
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                  per person
                </ThemedText>
              )}
            </Column>
          </Row>

          {/* ─── RSVP Summary (Coach View) ─── */}
          {isCoach && rsvpCounts.total > 0 && (
            <RsvpSummaryCard
              counts={rsvpCounts}
              colors={colors}
              onSendReminder={rsvpCounts.pending > 0 ? handleSendReminder : undefined}
            />
          )}

          {/* ─── Your Registrations + RSVP (Parent View) ─── */}
          {isRegistered && !isCoach && (
            <View style={{ gap: Spacing.sm }}>
              {myRegistrations.map((fr) => (
                <FamilyRegistrationCard
                  key={fr.registration.id}
                  familyReg={fr}
                  isActive={isActive}
                  showChildName={children.length > 0}
                  colors={colors}
                  responding={responding}
                  onRsvpRespond={(s) => handleRsvpRespond(fr, s)}
                  onUnregister={() => handleUnregister(fr)}
                  toButtonStatus={toButtonStatus}
                />
              ))}
            </View>
          )}

          {/* ─── Child Selector (for registering another child) ─── */}
          {canRegisterMore && (
            <ChildSelector
              children={unregisteredChildren}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
              colors={colors}
            />
          )}

          {/* ─── Child Selector (for first registration when multi-kid) ─── */}
          {!isRegistered && !isCoach && hasMultipleKids && isActive && (
            <ChildSelector
              children={children}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
              colors={colors}
            />
          )}

          {/* ─── Waitlist Banner ─── */}
          {canJoinWaitlist && !isRegistered && (
            <WaitlistBanner
              waitlistCount={session.waitlistCount}
              onJoinWaitlist={handleRegister}
              loading={registering}
            />
          )}

          {/* ─── Capacity Badge ─── */}
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
            <GroupSessionCoachActions
              sessionId={id}
              rosterCount={roster.length}
              onCancel={handleCancel}
            />
          )}
        </View>
      </ScrollView>

      {/* ─── Registration Footer ─── */}
      {showRegisterFooter && (
        <Row
          align="center"
          justify="between"
          style={[
            styles.footer,
            { backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          <View>
            <ThemedText style={[Typography.heading, { color: colors.tint }]}>
              {isFree
                ? 'Free'
                : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
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

// =============================================================================
// Sub-components (inline — kept in same file for locality)
// =============================================================================

/** Cancelled / Completed status banner */
function StatusBanner({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}) {
  return (
    <Row
      align="center"
      gap="xs"
      style={[styles.statusBanner, { backgroundColor: withAlpha(color, 0.09) }]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <ThemedText style={[Typography.bodySemiBold, { color }]}>{label}</ThemedText>
    </Row>
  );
}

/** Coach RSVP summary — "5 Going · 2 Maybe · 1 Can't · 3 Pending" */
function RsvpSummaryCard({
  counts,
  colors,
  onSendReminder,
}: {
  counts: { going: number; maybe: number; notGoing: number; pending: number; total: number };
  colors: Record<string, string>;
  onSendReminder?: () => void;
}) {
  const items = [
    { count: counts.going, label: 'Going', color: colors.success, icon: 'checkmark-circle' as const },
    { count: counts.maybe, label: 'Maybe', color: colors.warning, icon: 'help-circle' as const },
    { count: counts.notGoing, label: "Can't", color: colors.error, icon: 'close-circle' as const },
    { count: counts.pending, label: 'Pending', color: colors.muted, icon: 'time' as const },
  ];

  return (
    <SurfaceCard style={styles.rsvpSummaryCard}>
      <Row align="center" justify="between">
        <ThemedText type="defaultSemiBold">Attendance</ThemedText>
        {onSendReminder && (
          <Clickable
            onPress={onSendReminder}
            style={[styles.reminderBtn, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
            accessibilityLabel="Send reminders to non-responders"
          >
            <Row align="center" gap="xxs">
              <Ionicons name="notifications-outline" size={14} color={colors.tint} />
              <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                Remind ({counts.pending})
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>
      <Row gap="sm" style={{ marginTop: Spacing.sm }}>
        {items.map((item) => (
          <View key={item.label} style={[styles.rsvpStat, { backgroundColor: withAlpha(item.color, 0.06) }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
            <ThemedText style={[Typography.heading, { color: item.color }]}>{item.count}</ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{item.label}</ThemedText>
          </View>
        ))}
      </Row>
    </SurfaceCard>
  );
}

/** Per-child registration card with RSVP buttons */
function FamilyRegistrationCard({
  familyReg,
  isActive,
  showChildName,
  colors,
  responding,
  onRsvpRespond,
  onUnregister,
  toButtonStatus: toBtnStatus,
}: {
  familyReg: FamilyRegistration;
  isActive: boolean;
  showChildName: boolean;
  colors: Record<string, string>;
  responding: boolean;
  onRsvpRespond: (status: 'going' | 'maybe' | 'cant_go') => void;
  onUnregister: () => void;
  toButtonStatus: (s: string) => 'going' | 'maybe' | 'cant_go' | null;
}) {
  const isWaitlisted = familyReg.registration.status === 'WAITLISTED';
  const currentRsvp = familyReg.rsvp ? toBtnStatus(familyReg.rsvp.status) : null;
  const statusColor = isWaitlisted ? colors.warning : colors.success;
  const statusIcon = isWaitlisted ? 'time' : 'checkmark-circle';
  const statusLabel = isWaitlisted ? 'Waitlisted' : 'Registered';

  return (
    <SurfaceCard style={styles.familyCard}>
      {/* Header: status + child name + cancel */}
      <Row align="center" gap="sm">
        <View
          style={[styles.regIcon, { backgroundColor: withAlpha(statusColor, 0.12) }]}
        >
          <Ionicons name={statusIcon} size={20} color={statusColor} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">
            {showChildName ? familyReg.childName : statusLabel}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {isWaitlisted
              ? "We'll notify you when a spot opens"
              : showChildName
                ? statusLabel
                : `Since ${new Date(familyReg.registration.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
          </ThemedText>
        </View>
        {isActive && (
          <Clickable
            onPress={onUnregister}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            accessibilityLabel="Cancel registration"
          >
            <Ionicons name="close" size={16} color={colors.error} />
          </Clickable>
        )}
      </Row>

      {/* RSVP buttons — only for registered (not waitlisted) on active sessions */}
      {isActive && !isWaitlisted && (
        <View style={{ marginTop: Spacing.sm }}>
          <ThemedText style={[Typography.caption, { color: colors.muted, marginBottom: Spacing.xs }]}>
            {showChildName ? `Is ${familyReg.childName} coming?` : 'Are you coming?'}
          </ThemedText>
          <RsvpButtonGroup
            currentStatus={currentRsvp}
            onRespond={onRsvpRespond}
            disabled={responding}
            compact
          />
        </View>
      )}
    </SurfaceCard>
  );
}

/** Child picker for multi-kid parents */
function ChildSelector({
  children: childOptions,
  selectedId,
  onSelect,
  colors,
}: {
  children: { id: string; name: string; initials: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: Record<string, string>;
}) {
  if (childOptions.length === 0) return null;

  return (
    <SurfaceCard style={styles.childSelectorCard}>
      <ThemedText type="defaultSemiBold">Select Child</ThemedText>
      <Row gap="xs" style={{ marginTop: Spacing.xs, flexWrap: 'wrap' }}>
        {childOptions.map((child) => {
          const isSelected = child.id === selectedId;
          return (
            <Clickable
              key={child.id}
              onPress={() => onSelect(child.id)}
              style={[
                styles.childChip,
                {
                  backgroundColor: isSelected ? colors.tint : withAlpha(colors.muted, 0.06),
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
              accessibilityLabel={`Select ${child.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                <View
                  style={[
                    styles.childAvatar,
                    {
                      backgroundColor: isSelected
                        ? withAlpha('#FFFFFF', 0.25)
                        : withAlpha(colors.tint, 0.12),
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.micro,
                      { color: isSelected ? '#FFFFFF' : colors.tint, fontSize: 10 },
                    ]}
                  >
                    {child.initials}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    Typography.bodySmallSemiBold,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {child.name}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </SurfaceCard>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  statusBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
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
  // RSVP Summary (Coach)
  rsvpSummaryCard: { padding: Spacing.md },
  reminderBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    minHeight: 32,
    justifyContent: 'center',
  },
  rsvpStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.micro,
  },
  // Family Registration Card
  familyCard: { padding: Spacing.md },
  regIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Child Selector
  childSelectorCard: { padding: Spacing.md },
  childChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  childAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
