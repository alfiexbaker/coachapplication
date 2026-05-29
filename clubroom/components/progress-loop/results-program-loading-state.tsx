import { StyleSheet, View } from 'react-native';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Radii, Spacing } from '@/constants/theme';

interface ResultsProgramLoadingStateProps {
  isCoachView: boolean;
}

export const ResultsProgramLoadingState = function ResultsProgramLoadingState({
  isCoachView,
}: ResultsProgramLoadingStateProps) {
  return (
    <Column gap="sm" style={styles.container}>
      <SurfaceCard loading style={styles.heroCard}>
        <Row align="center" gap="sm">
          <View style={styles.ringPlaceholder}>
            <Skeleton width={96} height={96} radius={Radii.full} />
          </View>
          <Column style={styles.heroMetrics} gap="xs">
            <Skeleton width="75%" height={16} />
            <Skeleton width="95%" height={14} />
            <Row gap="xs" wrap>
              <Skeleton width={88} height={42} />
              <Skeleton width={88} height={42} />
              <Skeleton width={88} height={42} />
            </Row>
          </Column>
        </Row>
      </SurfaceCard>

      {!isCoachView ? (
        <SurfaceCard loading>
          <Skeleton width="100%" height={54} radius={Radii.pill} />
        </SurfaceCard>
      ) : null}

      <Column gap="sm">
        {Array.from({ length: 3 }).map((_, index) => (
          <SurfaceCard key={index} loading>
            <Column gap="xs">
              <Row align="center" justify="between" gap="xs">
                <Skeleton width="48%" height={16} />
                <Skeleton width={82} height={20} radius={Radii.pill} />
              </Row>
              <Skeleton width="100%" height={14} />
              <Skeleton width="88%" height={14} />
              <Skeleton width="40%" height={42} radius={Radii.md} />
            </Column>
          </SurfaceCard>
        ))}
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  heroCard: {
    minHeight: 170,
  },
  ringPlaceholder: {
    minWidth: 104,
    alignItems: 'center',
  },
  heroMetrics: {
    flex: 1,
  },
});
