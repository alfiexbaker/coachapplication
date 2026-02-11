import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import type { BulkInviteResult, SquadInvitedMember } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  getStatusConfig,
  InviteStatusHeader,
  InviteContextRow,
  InviteStatsBreakdown,
  InviteErrorDetails,
  InviteActionRow,
  CompactInviteResultInner,
} from './invite-result-sections';

interface InviteResultCardProps {
  result: BulkInviteResult;
  invitedMembers?: SquadInvitedMember[];
  squadName?: string;
  sessionTitle?: string;
  onViewInvites?: () => void;
  onRetryFailed?: (failedMemberIds: string[]) => void;
  onDone?: () => void;
  showDetails?: boolean;
}

export function InviteResultCard({
  result,
  invitedMembers = [],
  squadName,
  sessionTitle,
  onViewInvites,
  onRetryFailed,
  onDone,
  showDetails = true,
}: InviteResultCardProps) {
  const { colors: palette } = useTheme();

  const statusConfig = getStatusConfig(result, palette);

  const failedMemberIds = invitedMembers
    .filter((m) => m.status === 'FAILED')
    .map((m) => m.memberId);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={{ gap: Spacing.md }}>
        <InviteStatusHeader config={statusConfig} palette={palette} />

        <InviteContextRow
          squadName={squadName}
          sessionTitle={sessionTitle}
          palette={palette}
        />

        {showDetails && (
          <InviteStatsBreakdown
            sent={result.sent}
            failed={result.failed}
            skipped={result.skipped}
            palette={palette}
          />
        )}

        {showDetails && (
          <InviteErrorDetails errors={result.errors} palette={palette} />
        )}

        <InviteActionRow
          sent={result.sent}
          failed={result.failed}
          failedMemberIds={failedMemberIds}
          onViewInvites={onViewInvites}
          onRetryFailed={onRetryFailed}
          onDone={onDone}
          palette={palette}
        />
      </SurfaceCard>
    </Animated.View>
  );
}

export function CompactInviteResult({ result, onDismiss }: { result: BulkInviteResult; onDismiss?: () => void }) {
  const { colors: palette } = useTheme();
  return <CompactInviteResultInner result={result} onDismiss={onDismiss} palette={palette} />;
}
