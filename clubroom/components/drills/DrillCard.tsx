/**
 * DrillCard Component
 *
 * Displays a drill from the coach's library with title, description,
 * category, duration, and difficulty badge. Supports video indicator.
 */

import type { Drill } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { CompactDrillCard, FullDrillCardContent } from './drill-card-sections';

interface DrillCardProps {
  drill: Drill;
  onPress?: () => void;
  compact?: boolean;
  showAssignmentCount?: boolean;
}

export function DrillCard({
  drill,
  onPress,
  compact = false,
  showAssignmentCount = false,
}: DrillCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return <CompactDrillCard drill={drill} onPress={onPress} palette={palette} />;
  }

  return (
    <FullDrillCardContent
      drill={drill}
      onPress={onPress}
      showAssignmentCount={showAssignmentCount}
      palette={palette}
    />
  );
}
