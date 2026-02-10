/**
 * Multi-Week Invite Card
 *
 * Displayed when a recurring invite has weekSlots.
 * Each week is shown as a toggleable row (accept/decline per week).
 * Creates a BookingSeries for the accepted weeks only.
 */

import { useState, useCallback } from 'react';
import { Platform, FlatList } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionInvite, WeekAcceptance } from '@/constants/types';
import { sessionInviteService } from '@/services/invite/session-invite-service';
import { createLogger } from '@/utils/logger';

import {
  WeekSeparator,
  WeekToggleRow,
  InviteHeader,
  SelectionControls,
  TotalRow,
  styles,
} from './multi-week-invite-card-sections';

const logger = createLogger('MultiWeekInviteCard');

interface MultiWeekInviteCardProps {
  invite: SessionInvite;
  onResponded?: () => void;
}

export function MultiWeekInviteCard({
  invite,
  onResponded,
}: MultiWeekInviteCardProps) {
  const { colors: palette } = useTheme();

  const initialWeekSlots = invite.weekSlots ?? [];
  const [weekAcceptances, setWeekAcceptances] = useState<WeekAcceptance[]>(initialWeekSlots);
  const [submitting, setSubmitting] = useState(false);

  const acceptedCount = weekAcceptances.filter((w) => w.accepted).length;
  const totalCount = weekAcceptances.length;
  const pricePerSession = invite.priceUsd ?? 0;
  const totalCost = pricePerSession * acceptedCount;

  const handleToggle = useCallback((weekDate: string) => {
    setWeekAcceptances((prev) =>
      prev.map((w) =>
        w.weekDate === weekDate ? { ...w, accepted: !w.accepted } : w
      )
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await sessionInviteService.respondToRecurringInvite(
        invite.id,
        weekAcceptances
      );

      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onResponded?.();
      } else {
        logger.error('Failed to respond to recurring invite', { error: result.error });
      }
    } catch (error) {
      logger.error('Error responding to recurring invite', error);
    } finally {
      setSubmitting(false);
    }
  }, [invite.id, weekAcceptances, onResponded]);

  const handleSelectAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWeekAcceptances((prev) => prev.map((w) => ({ ...w, accepted: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setWeekAcceptances((prev) => prev.map((w) => ({ ...w, accepted: false })));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: WeekAcceptance }) => (
      <WeekToggleRow week={item} onToggle={handleToggle} palette={palette} />
    ),
    [handleToggle, palette]
  );

  const keyExtractor = useCallback((item: WeekAcceptance) => item.weekDate, []);

  return (
    <SurfaceCard style={styles.card}>
      <InviteHeader
        coachName={invite.coachName}
        sessionType={invite.sessionType}
        focus={invite.focus}
        totalWeeks={totalCount}
        palette={palette}
      />

      <Row align="center" gap="xs">
        <Ionicons name="person-outline" size={16} color={palette.muted} />
        <ThemedText style={[Typography.small, { color: palette.text }]}>
          For: {invite.athleteNames.join(', ')}
        </ThemedText>
      </Row>

      <Divider />

      <SelectionControls
        acceptedCount={acceptedCount}
        totalCount={totalCount}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        palette={palette}
      />

      <FlatList
        data={weekAcceptances}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        ItemSeparatorComponent={WeekSeparator}
      />

      <Divider />

      <TotalRow
        acceptedCount={acceptedCount}
        totalCost={totalCost}
        palette={palette}
      />

      <Button
        variant="primary"
        onPress={handleSubmit}
        disabled={acceptedCount === 0 || submitting}
      >
        {submitting
          ? 'Booking...'
          : acceptedCount === 0
          ? 'Select weeks to accept'
          : `Accept ${acceptedCount} Week${acceptedCount !== 1 ? 's' : ''}`}
      </Button>
    </SurfaceCard>
  );
}
