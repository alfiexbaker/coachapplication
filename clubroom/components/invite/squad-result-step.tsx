/**
 * SquadResultStep — Result step for squad bulk invite wizard.
 *
 * Wraps InviteResultCard in a step layout with animation.
 */

import React, { memo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { InviteResultCard } from '@/components/squad/InviteResultCard';
import type { BulkInviteResult, SquadSessionInvite } from '@/constants/types';

export interface SquadResultStepProps {
  result: BulkInviteResult;
  invitedMembers: SquadSessionInvite['invitedMembers'];
  squadName?: string;
  sessionTitle: string;
  onViewInvites: () => void;
  onDone: () => void;
}

export const SquadResultStep = memo(function SquadResultStep({
  result,
  invitedMembers,
  squadName,
  sessionTitle,
  onViewInvites,
  onDone,
}: SquadResultStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <InviteResultCard
        result={result}
        invitedMembers={invitedMembers}
        squadName={squadName}
        sessionTitle={sessionTitle}
        onViewInvites={onViewInvites}
        onDone={onDone}
        showDetails
      />
    </Animated.View>
  );
});
