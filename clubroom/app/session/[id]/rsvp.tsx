import React, { useState, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, SectionSkeleton } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { RSVPFlow } from '@/components/session/rsvp-flow';
import { RSVPSummary } from '@/components/session/rsvp-summary';
import { rsvpService } from '@/services/rsvp-service';
import { groupSessionService } from '@/services/group-session-service';
import type { SessionRsvp } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';
import { getSessionRsvpChildName } from '@/utils/session-rsvp-display';
import { useOptionalParam, useRequiredParam } from '@/hooks/use-required-param';
import { uiFeedback } from '@/services/ui-feedback';

interface SessionInfo {
  id: string;
  title: string;
  scheduledAt: string;
  location: string;
}

interface RsvpLoadData {
  rsvp: SessionRsvp | null;
  sessionInfo: SessionInfo;
  totalRsvps: number;
  counts: {
    going: number;
    maybe: number;
    notGoing: number;
    pending: number;
  };
  responded: boolean;
  responseStatus: 'going' | 'not_going' | 'maybe' | null;
}

export default function RSVPScreen() {
  const sessionIdParam = useRequiredParam('id');
  const sessionId = sessionIdParam.valid ? sessionIdParam.value : '';
  const rsvpId = useOptionalParam('rsvpId');
  const { back, canGoBack } = useRouter();
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [responseOverride, setResponseOverride] = useState<{
    responded: boolean;
    responseStatus: 'going' | 'not_going' | 'maybe';
  } | null>(null);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  const loadData = async () => {
    try {
      if (!sessionId) {
        return err(serviceError('VALIDATION', 'Missing session ID.'));
      }

      const [session, allRsvps, counts] = await Promise.all([
        groupSessionService.getSession(sessionId),
        rsvpService.getForSession(sessionId),
        rsvpService.getSessionCounts(sessionId),
      ]);

      let loadedRsvp: SessionRsvp | null = null;
      let responded = false;
      let responseStatus: 'going' | 'not_going' | 'maybe' | null = null;

      if (rsvpId) {
        loadedRsvp = await rsvpService.getById(rsvpId);
        if (loadedRsvp && loadedRsvp.status !== 'pending') {
          responded = true;
          responseStatus = loadedRsvp.status as 'going' | 'not_going' | 'maybe';
        }
      } else if (currentUser && !isCoach) {
        const userRsvps = allRsvps.filter((r) => r.userId === currentUser.id);
        const pending = userRsvps.find((r) => r.status === 'pending');
        if (pending) {
          loadedRsvp = pending;
        } else if (userRsvps.length > 0) {
          const latest = userRsvps[0];
          loadedRsvp = latest;
          responded = true;
          responseStatus = latest.status as 'going' | 'not_going' | 'maybe';
        }
      }

      const firstSlot = session?.schedule?.[0];
      const scheduledAt = firstSlot
        ? new Date(`${firstSlot.date}T${firstSlot.startTime}:00`).toISOString()
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const sessionInfo: SessionInfo = {
        id: sessionId,
        title: session?.title || 'Training Session',
        scheduledAt,
        location: session?.location || 'Location to be confirmed',
      };

      return ok<RsvpLoadData>({
        rsvp: loadedRsvp,
        sessionInfo,
        totalRsvps: allRsvps.length,
        counts,
        responded,
        responseStatus,
      });
    } catch {
      return err(serviceError('UNKNOWN', 'Failed to load RSVP data.'));
    }
  };

  const { data, status, error, retry } = useScreen<RsvpLoadData>({
    load: loadData,
    deps: [sessionId, rsvpId, currentUser?.id, isCoach],
    isEmpty: (value) => !value.sessionInfo,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });

  if (!sessionIdParam.valid) {
    return renderShell(<ErrorState message="Invalid RSVP link." onRetry={() => back()} />);
  }

  const rsvp = data?.rsvp ?? null;
  const sessionInfo = data?.sessionInfo ?? null;
  const responded = responseOverride?.responded ?? data?.responded ?? false;
  const responseStatus = responseOverride?.responseStatus ?? data?.responseStatus ?? null;

  const handleRespond = async (status: 'going' | 'not_going' | 'maybe'): Promise<boolean> => {
    if (!rsvp) return false;

    try {
      await rsvpService.respond(rsvp.id, status);
      setResponseOverride({ responded: true, responseStatus: status });

      const statusLabels: Record<string, string> = {
        going: 'attending',
        not_going: 'not attending',
        maybe: 'maybe attending',
      };

      uiFeedback.showToast(`You've confirmed ${getSessionRsvpChildName(rsvp)} is ${statusLabels[status]}.`);
      if (canGoBack()) back();
      return true;
    } catch {
      uiFeedback.showToast('Failed to submit your response. Please try again.', 'error');
      return false;
    }
  };
  const renderScreen = ({
    title,
    content,
    safeAreaStyle,
  }: {
    title: string;
    content: ReactNode;
    safeAreaStyle?: StyleProp<ViewStyle>;
  }) => (
    <>
      <Stack.Screen options={{ title }} />
      <SafeAreaView
        style={[styles.safeArea, safeAreaStyle, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {content}
      </SafeAreaView>
    </>
  );

  if (status === 'loading') {
    return renderScreen({
      title: 'RSVP',
      content: (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <SectionSkeleton variant="detail" titleWidth="34%" />
        </ScrollView>
      ),
    });
  }

  if (status === 'error') {
    return renderScreen({
      title: 'RSVP',
      content: (
        <ErrorState
          message={error?.message ?? 'Failed to load RSVP data.'}
          title="Unable to Load RSVP"
          onRetry={retry}
        />
      ),
    });
  }

  if (status === 'empty' || !sessionInfo) {
    return renderScreen({
      title: 'RSVP',
      content: (
        <ErrorState
          message="This session RSVP could not be found."
          title="RSVP Not Found"
          onRetry={retry}
        />
      ),
    });
  }

  if (isCoach) {
    return renderScreen({
      title: 'Attendance',
      content: (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.sessionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ThemedText style={[styles.cardLabel, { color: colors.muted }]}>Session</ThemedText>
            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>
              {sessionInfo.title}
            </ThemedText>
            <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
              {new Date(sessionInfo.scheduledAt).toLocaleString('en-GB')}
            </ThemedText>
            <ThemedText style={[styles.cardMeta, { color: colors.muted }]}>
              {sessionInfo.location}
            </ThemedText>
          </View>
          <RSVPSummary sessionId={sessionInfo.id} />
        </ScrollView>
      ),
    });
  }

  if (!rsvp) {
    return renderScreen({
      title: 'RSVP',
      content: (
        <ErrorState
          message="This RSVP may have expired or already been handled."
          title="RSVP Not Found"
          onRetry={retry}
        />
      ),
    });
  }

  if (responded && responseStatus) {
    const statusConfig = {
      going: {
        icon: 'checkmark-circle' as const,
        color: colors.success,
        label: 'Going',
        message: `${getSessionRsvpChildName(rsvp)} is confirmed for this session.`,
      },
      not_going: {
        icon: 'close-circle' as const,
        color: colors.error,
        label: 'Not Going',
        message: `${getSessionRsvpChildName(rsvp)} will not attend this session.`,
      },
      maybe: {
        icon: 'help-circle' as const,
        color: colors.warning,
        label: 'Maybe',
        message: `You've marked ${getSessionRsvpChildName(rsvp)} as maybe for this session.`,
      },
    };

    const config = statusConfig[responseStatus];

    return renderScreen({
      title: 'RSVP',
      safeAreaStyle: styles.centerContainer,
      content: (
        <>
          <Ionicons name={config.icon} size={64} color={config.color} />
          <ThemedText style={[styles.confirmedTitle, { color: config.color }]}>
            {config.label}
          </ThemedText>
          <ThemedText style={[styles.confirmedMessage, { color: colors.muted }]}>
            {config.message}
          </ThemedText>
          <ThemedText style={[styles.confirmedSession, { color: colors.text }]}>
            {sessionInfo.title}
          </ThemedText>
        </>
      ),
    });
  }

  return renderScreen({
    title: 'RSVP',
    content: (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RSVPFlow
          sessionId={sessionInfo.id}
          sessionTitle={sessionInfo.title}
          sessionDate={sessionInfo.scheduledAt}
          location={sessionInfo.location}
          childName={getSessionRsvpChildName(rsvp)}
          rsvpId={rsvp.id}
          onRespond={handleRespond}
        />
      </ScrollView>
    ),
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.lg + 20,
    gap: Spacing.md,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardLabel: {
    ...Typography.caption,
  },
  cardTitle: {
    ...Typography.subheading,
  },
  cardMeta: {
    ...Typography.small,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmedTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  confirmedMessage: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  confirmedSession: {
    ...Typography.bodySemiBold,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
