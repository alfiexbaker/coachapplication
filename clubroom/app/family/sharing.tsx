/**
 * Family Sharing Screen
 *
 * Allows parents to view/invite/manage guardians with access to
 * their children's sports schedule.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SharingGuardiansSection } from '@/components/family/sharing-guardians-section';
import { SharingPendingInvites } from '@/components/family/sharing-pending-invites';
import { SharingInviteModal } from '@/components/family/sharing-invite-modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/skeleton';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useFamilySharing } from '@/hooks/use-family-sharing';

export default function FamilySharingScreen() {
  const { colors } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    family,
    showInviteModal,
    setShowInviteModal,
    inviteEmail,
    setInviteEmail,
    inviteEmailTouched,
    setInviteEmailTouched,
    inviteEmailError,
    inviteName,
    setInviteName,
    inviteRole,
    setInviteRole,
    inviteRelationship,
    setInviteRelationship,
    inviteMessage,
    setInviteMessage,
    inviting,
    handleInvite,
    handleRemoveGuardian,
    handleCancelInvite,
  } = useFamilySharing();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderScreenShell = (content: ReactNode) =>
    renderShell(
      <>
        <PageHeader title="Family Sharing" showBack onBackPress={() => router.back()} />
        {content}
      </>,
    );

  if (status === 'loading') {
    return renderScreenShell(
      <View style={styles.content}>
        <SurfaceCard style={[styles.introCard, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
          <SkeletonCircle size={40} accessibilityLabel="Loading sharing icon" />
          <Skeleton width="58%" height={20} accessibilityLabel="Loading sharing title" />
          <SkeletonText
            lines={2}
            widths={['88%', '64%']}
            style={styles.centeredSkeletonText}
            accessibilityLabel="Loading sharing explanation"
          />
        </SurfaceCard>
        <LoadingState variant="card" />
      </View>,
    );
  }

  if (status === 'error') {
    return renderScreenShell(
      <ErrorState
        message={error?.message || 'Failed to load family sharing settings.'}
        onRetry={retry}
      />,
    );
  }

  if (status === 'empty' || !family) {
    return renderScreenShell(
      <EmptyState
        icon="people-outline"
        title="Family account unavailable"
        message="Set up your family account to invite guardians and share schedule access."
        actionLabel="Retry"
        onPressAction={retry}
      />,
    );
  }

  return renderScreenShell(
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SurfaceCard style={[styles.introCard, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
          <View style={{ marginBottom: Spacing.xs }}>
            <Ionicons name="people-circle" size={40} color={colors.tint} />
          </View>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            Share access with family members
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted, textAlign: 'center' }]}>
            Invite your partner, grandparents, or caregivers to view schedules, book sessions, and
            track your children&apos;s progress.
          </ThemedText>
        </SurfaceCard>

        {family?.guardians && (
          <SharingGuardiansSection guardians={family.guardians} onRemove={handleRemoveGuardian} />
        )}

        {family?.pendingInvites && (
          <SharingPendingInvites invites={family.pendingInvites} onCancel={handleCancelInvite} />
        )}

        <Clickable
          style={[styles.inviteButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowInviteModal(true)}
        >
          <Row align="center" justify="center" gap="sm">
            <Ionicons name="person-add" size={22} color={colors.onPrimary} />
            <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
              Invite Family Member
            </ThemedText>
          </Row>
        </Clickable>
      </ScrollView>

      <SharingInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteEmail={inviteEmail}
        onEmailChange={(value) => {
          setInviteEmailTouched(true);
          setInviteEmail(value);
        }}
        emailError={inviteEmailError}
        onEmailBlur={() => setInviteEmailTouched(true)}
        inviteName={inviteName}
        onNameChange={setInviteName}
        inviteRole={inviteRole}
        onRoleChange={setInviteRole}
        inviteRelationship={inviteRelationship}
        onRelationshipChange={setInviteRelationship}
        inviteMessage={inviteMessage}
        onMessageChange={setInviteMessage}
        inviting={inviting}
        onSend={handleInvite}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl * 2, gap: Spacing.md },
  introCard: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  centeredSkeletonText: { alignItems: 'center', width: '100%' },
  inviteButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.sm },
});
