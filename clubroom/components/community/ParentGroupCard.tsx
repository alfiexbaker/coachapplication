import { memo } from 'react';

import type { ParentGroup } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { CompactGroupCardContent, FullGroupCardContent } from './ParentGroupCard-sections';

interface ParentGroupCardProps {
  group: ParentGroup;
  onPress?: () => void;
  compact?: boolean;
}

function ParentGroupCardComponent({ group, onPress, compact = false }: ParentGroupCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return <CompactGroupCardContent group={group} onPress={onPress} palette={palette} />;
  }

  return <FullGroupCardContent group={group} onPress={onPress} palette={palette} />;
}

export const ParentGroupCard = memo(ParentGroupCardComponent);
