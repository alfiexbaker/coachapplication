/**
 * RSVP Screen Route
 *
 * Loads the session data and user's RSVP, then renders the RSVPFlow component.
 * Accessible via: /session/:id/rsvp
 *
 * Query params:
 *   - rsvpId: The specific RSVP record to respond to
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { RSVPFlow } from '@/components/session/rsvp-flow';
import { rsvpService } from '@/services/rsvp-service';
import type { SessionRsvp } from '@/constants/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SessionInfo {
  id: string;
  title: string;
  scheduledAt: string;
  location: string;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function RSVPScreen() {
  const { id: sessionId, rsvpId } = useLocalSearchParams<{ id: string; rsvpId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [rsvp, setRsvp] = useState<SessionRsvp | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [responded, setResponded] = useState(false);
  const [responseStatus, setResponseStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null);

  const loadData = useCallback(async () => {
    try {
      // If a specific rsvpId is provided, load that RSVP directly
      if (rsvpId) {
        const loadedRsvp = await rsvpService.getById(rsvpId);
        if (loadedRsvp) {
          setRsvp(loadedRsvp);

          // If already responded, show that status
          if (loadedRsvp.status !== 'pending') {
            setResponded(true);
            setResponseStatus(loadedRsvp.status as 'going' | 'not_going' | 'maybe');
          }
        }
      } else if (sessionId) {
        // Load all RSVPs for this session and find the current user's
        // For MVP, use the first pending RSVP found
        const sessionRsvps = await rsvpService.getForSession(sessionId);
        const pending = sessionRsvps.find((r) => r.status === 'pending');
        if (pending) {
          setRsvp(pending);
        } else if (sessionRsvps.length > 0) {
          // Already responded - show the latest
          const latest = sessionRsvps[0];
          setRsvp(latest);
          setResponded(true);
          setResponseStatus(latest.status as 'going' | 'not_going' | 'maybe');
        }
      }

      // Build session info (in real app, fetch from session service)
      if (sessionId) {
        setSessionInfo({
          id: sessionId,
          title: 'Training Session',
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Hackney Marshes, Pitch 3',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to load RSVP data.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, rsvpId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (status: 'going' | 'not_going' | 'maybe') => {
    if (!rsvp) return;

    try {
      await rsvpService.respond(rsvp.id, status);
      setResponded(true);
      setResponseStatus(status);

      const statusLabels: Record<string, string> = {
        going: 'attending',
        not_going: 'not attending',
        maybe: 'maybe attending',
      };

      Alert.alert(
        'Response Recorded',
        `You've confirmed ${rsvp.childName || 'your child'} is ${statusLabels[status]}.`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              }
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Failed to submit your response. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'RSVP' }} />
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <LoadingState variant="detail" />
        </View>
      </>
    );
  }

  // No RSVP found
  if (!rsvp || !sessionInfo) {
    return (
      <>
        <Stack.Screen options={{ title: 'RSVP' }} />
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <ErrorState message="This RSVP may have expired or already been handled." title="RSVP Not Found" onRetry={loadData} />
        </View>
      </>
    );
  }

  // Already responded
  if (responded && responseStatus) {
    const statusConfig = {
      going: {
        icon: 'checkmark-circle' as const,
        color: colors.success,
        label: 'Going',
        message: `${rsvp.childName || 'Your child'} is confirmed for this session.`,
      },
      not_going: {
        icon: 'close-circle' as const,
        color: colors.error,
        label: 'Not Going',
        message: `${rsvp.childName || 'Your child'} will not attend this session.`,
      },
      maybe: {
        icon: 'help-circle' as const,
        color: colors.warning,
        label: 'Maybe',
        message: `You've marked ${rsvp.childName || 'your child'} as maybe for this session.`,
      },
    };

    const config = statusConfig[responseStatus];

    return (
      <>
        <Stack.Screen options={{ title: 'RSVP' }} />
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <Ionicons name={config.icon} size={64} color={config.color} />
          <ThemedText style={[styles.confirmedTitle, { color: config.color }]}>
            {config.label}
          </ThemedText>
          <ThemedText style={[styles.confirmedMessage, { color: colors.muted }]}>{config.message}</ThemedText>
          <ThemedText style={[styles.confirmedSession, { color: colors.text }]}>{sessionInfo.title}</ThemedText>
        </View>
      </>
    );
  }

  // RSVP Flow
  return (
    <>
      <Stack.Screen options={{ title: 'RSVP' }} />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RSVPFlow
          sessionId={sessionInfo.id}
          sessionTitle={sessionInfo.title}
          sessionDate={sessionInfo.scheduledAt}
          location={sessionInfo.location}
          childName={rsvp.childName || 'Your Child'}
          rsvpId={rsvp.id}
          onRespond={handleRespond}
        />
      </ScrollView>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.sm,
    paddingBottom: Spacing.lg + 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  errorTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  errorMessage: {
    ...Typography.body,
    textAlign: 'center',
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
