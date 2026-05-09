import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { Routes } from '@/navigation/routes';
import { socialFeedService } from '@/services/social-feed-service';
import { uiFeedback } from '@/services/ui-feedback';
import { formatCommercialModeLabel } from '@/utils/organization-commercial-mode';
import { formatOrganizationRoleLabel, parseOrganizationRole } from '@/contracts/club-governance';
import type { Club } from '@/constants/types';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const NEXT_STEPS = [
  {
    id: 'commercial',
    title: 'Review billing and support ownership',
    body: 'Confirm the family-facing money language before you start taking club bookings.',
    icon: 'briefcase-outline' as const,
    action: (clubId: string) => router.push(Routes.clubSettings({ clubId, section: 'commercial' })),
    actionLabel: 'Open commercial settings',
  },
  {
    id: 'invite',
    title: 'Invite your first staff member',
    body: 'Open invite controls to share a coach, head coach, or admin code.',
    icon: 'mail-open-outline' as const,
    action: (clubId: string) => router.push(Routes.clubSettings({ clubId, section: 'invites' })),
    actionLabel: 'Open invites',
  },
  {
    id: 'session',
    title: 'Create the first club session',
    body: 'Move straight into the club session flow so the org can start taking bookings.',
    icon: 'calendar-outline' as const,
    action: (clubId: string) =>
      router.push(
        Routes.sessionsCreateIntent({
          intent: 'new',
          source: 'manual',
          actingAs: 'club',
          clubId,
        }),
      ),
    actionLabel: 'Create session',
  },
  {
    id: 'ops',
    title: 'Check the operations path',
    body: 'Use the staffing and booking management surfaces the owner will rely on next.',
    icon: 'git-network-outline' as const,
    action: (clubId: string) => router.push(Routes.manageBookings({ clubId })),
    actionLabel: 'Open manage bookings',
  },
] as const;

export default function ClubSetupCompleteScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    clubId?: string;
    inviteCode?: string;
    inviteRole?: string;
  }>();
  const clubId = typeof params.clubId === 'string' ? params.clubId : '';
  const inviteCode = typeof params.inviteCode === 'string' ? params.inviteCode : '';
  const inviteRole = typeof params.inviteRole === 'string' ? params.inviteRole : '';

  const loadClub = useCallback(async (): Promise<Result<Club, ServiceError>> => {
    if (!clubId) {
      return err(serviceError('VALIDATION', 'Missing club setup context.'));
    }

    try {
      const nextClub = await socialFeedService.getClub(clubId);
      if (!nextClub) {
        return err(serviceError('NOT_FOUND', 'Club setup details could not be loaded.'));
      }
      return ok(nextClub);
    } catch (loadError) {
      return err(
        serviceError('UNKNOWN', 'Club setup details could not be loaded.', loadError),
      );
    }
  }, [clubId]);

  const { data: club, status, error, retry } = useScreen<Club>({
    load: loadClub,
    deps: [clubId],
    isEmpty: () => false,
    loadingStrategy: 'section-skeleton',
    dataKey: `club-setup-complete:${clubId || 'missing'}`,
  });

  const firstStaffRoleLabel = useMemo(() => {
    const parsed = parseOrganizationRole(inviteRole);
    return parsed ? formatOrganizationRoleLabel(parsed) : null;
  }, [inviteRole]);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    uiFeedback.showToast('Invite code copied', 'success');
  };

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Club Setup" subtitle="Finalizing setup" showBack centerTitle />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !club) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Club Setup" showBack centerTitle />
        <ErrorState
          title="Club setup unavailable"
          message={error?.message ?? 'Club setup details could not be loaded.'}
          error={error ?? undefined}
          onRetry={clubId ? retry : () => router.replace(Routes.MY_CLUBS)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Club Setup" centerTitle />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard style={styles.heroCard}>
          <View style={[styles.heroBadge, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={colors.tint} />
          </View>
          <ThemedText type="title" style={styles.centerText}>
            {club.name} is ready
          </ThemedText>
          <ThemedText style={[styles.heroCopy, { color: colors.muted }]}>
            The club now exists with {formatCommercialModeLabel(club.commercialMode)} booking
            language. Finish the first-run setup below so owners and staff do not need hidden
            knowledge.
          </ThemedText>
        </SurfaceCard>

        <SurfaceCard style={styles.summaryCard}>
          <ThemedText type="defaultSemiBold">Setup snapshot</ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
            Base details: {club.city}
            {club.country ? `, ${club.country}` : ''}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
            Billing mode: {formatCommercialModeLabel(club.commercialMode)}
          </ThemedText>
          <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
            Member invite: {club.inviteCode}
          </ThemedText>
        </SurfaceCard>

        {inviteCode && firstStaffRoleLabel ? (
          <SurfaceCard style={styles.codeCard}>
            <Row align="center" justify="between" gap="sm">
              <View style={styles.choiceCopy}>
                <ThemedText type="defaultSemiBold">{firstStaffRoleLabel} invite created</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted }]}>
                  Share this first staff code now or manage all invite codes in club settings.
                </ThemedText>
              </View>
              <Clickable
                style={[styles.copyButton, { borderColor: colors.border }]}
                onPress={() => handleCopyCode(inviteCode)}
              >
                <Ionicons name="copy-outline" size={16} color={colors.tint} />
                <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                  Copy
                </ThemedText>
              </Clickable>
            </Row>
            <ThemedText style={styles.inviteCode}>{inviteCode}</ThemedText>
          </SurfaceCard>
        ) : null}

        <View style={styles.steps}>
          {NEXT_STEPS.map((step, index) => (
            <SurfaceCard key={step.id} style={styles.stepCard}>
              <Row gap="sm" align="flex-start">
                <View style={[styles.stepIcon, { backgroundColor: withAlpha(colors.info, 0.1) }]}>
                  <Ionicons name={step.icon} size={18} color={colors.info} />
                </View>
                <View style={styles.choiceCopy}>
                  <ThemedText type="defaultSemiBold">
                    {index + 1}. {step.title}
                  </ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
                    {step.body}
                  </ThemedText>
                  <Clickable
                    style={[styles.stepButton, { borderColor: colors.border }]}
                    onPress={() => step.action(club.id)}
                  >
                    <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                      {step.actionLabel}
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={16} color={colors.tint} />
                  </Clickable>
                </View>
              </Row>
            </SurfaceCard>
          ))}
        </View>

        <Clickable
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.replace(Routes.club(club.id))}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="business-outline" size={18} color={colors.onPrimary} />
            <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
              Open club overview
            </ThemedText>
          </Row>
        </Clickable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  heroCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: { textAlign: 'center' },
  heroCopy: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  summaryCard: {
    gap: Spacing.xs,
  },
  codeCard: {
    gap: Spacing.sm,
  },
  copyButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  inviteCode: {
    ...Typography.subheading,
    fontFamily: 'monospace',
  },
  choiceCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  steps: {
    gap: Spacing.sm,
  },
  stepCard: {
    gap: Spacing.sm,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButton: {
    marginTop: Spacing.xs,
    minHeight: 40,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
