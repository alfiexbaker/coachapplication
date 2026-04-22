import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Components, Radii, Spacing } from '@/constants/theme';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonCluster,
  SkeletonPill,
  SkeletonText,
} from './skeleton';

export type LoadingScope = 'screen' | 'section';

export type LoadingVariant =
  | 'list'
  | 'feed'
  | 'card'
  | 'detail'
  | 'hero'
  | 'form'
  | 'calendar'
  | 'schedule'
  | 'tab-pane';

export interface SkeletonVariantProps {
  scope?: LoadingScope;
}

function LoadingSurface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <SurfaceCard animateElevation={false} tactile={false} loading style={[styles.surface, style]}>
      {children}
    </SurfaceCard>
  );
}

function ListSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  const rows = scope === 'screen' ? 5 : 3;

  return (
    <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading list">
      {Array.from({ length: rows }).map((_, index) => (
        <Row key={index} align="center" gap="sm">
          <SkeletonCircle size={Components.avatar.sm} accessibilityLabel={`Loading list avatar ${index + 1}`} />
          <View style={styles.flex}>
            <SkeletonText
              lines={2}
              widths={['72%', '46%']}
              accessibilityLabel={`Loading list row ${index + 1}`}
            />
          </View>
          <SkeletonPill width={scope === 'screen' ? 72 : 56} height={24} />
        </Row>
      ))}
    </SkeletonCluster>
  );
}

function FeedSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  const cards = scope === 'screen' ? 3 : 2;

  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading feed">
      {Array.from({ length: cards }).map((_, index) => (
        <LoadingSurface key={index}>
          <SkeletonCluster gap={Spacing.sm}>
            <Row align="center" gap="sm">
              <SkeletonCircle size={44} accessibilityLabel={`Loading feed author ${index + 1}`} />
              <View style={styles.flex}>
                <SkeletonText lines={2} widths={['42%', '28%']} accessibilityLabel="Loading author text" />
              </View>
            </Row>
            <SkeletonText
              lines={scope === 'screen' ? 3 : 2}
              widths={['100%', '88%', '66%']}
              accessibilityLabel="Loading feed body"
            />
            <Skeleton height={scope === 'screen' ? 180 : 120} radius={Radii.card} accessibilityLabel="Loading feed media" />
            <Row gap="xs">
              <SkeletonPill width={64} />
              <SkeletonPill width={72} />
              <SkeletonPill width={58} />
            </Row>
          </SkeletonCluster>
        </LoadingSurface>
      ))}
    </SkeletonCluster>
  );
}

function CardSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  const cards = scope === 'screen' ? 3 : 2;

  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading cards">
      {Array.from({ length: cards }).map((_, index) => (
        <LoadingSurface key={index}>
          <SkeletonCluster gap={Spacing.sm}>
            <Skeleton
              height={scope === 'screen' ? 132 : 104}
              radius={Radii.card}
              accessibilityLabel={`Loading card hero ${index + 1}`}
            />
            <SkeletonText lines={2} widths={['62%', '86%']} accessibilityLabel="Loading card text" />
            <Row gap="xs">
              <SkeletonPill width={72} />
              <SkeletonPill width={60} />
            </Row>
          </SkeletonCluster>
        </LoadingSurface>
      ))}
    </SkeletonCluster>
  );
}

function HeroSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading detail hero">
      <LoadingSurface>
        <SkeletonCluster gap={Spacing.md}>
          <Skeleton
            height={scope === 'screen' ? 220 : 148}
            radius={Radii.card}
            accessibilityLabel="Loading hero media"
          />
          <SkeletonText lines={2} widths={['54%', '78%']} lineHeight={18} accessibilityLabel="Loading hero title" />
          <Row gap="xs">
            <SkeletonPill width={84} />
            <SkeletonPill width={72} />
            <SkeletonPill width={64} />
          </Row>
        </SkeletonCluster>
      </LoadingSurface>
      <LoadingSurface>
        <SkeletonCluster gap={Spacing.sm}>
          <Skeleton width="32%" height={14} accessibilityLabel="Loading section label" />
          <SkeletonText lines={3} widths={['100%', '92%', '64%']} accessibilityLabel="Loading detail section" />
        </SkeletonCluster>
      </LoadingSurface>
      {scope === 'screen' ? (
        <LoadingSurface>
          <SkeletonCluster gap={Spacing.sm}>
            <Skeleton width="28%" height={14} accessibilityLabel="Loading metadata heading" />
            <Row gap="xs">
              <SkeletonPill width={96} />
              <SkeletonPill width={82} />
            </Row>
          </SkeletonCluster>
        </LoadingSurface>
      ) : null}
    </SkeletonCluster>
  );
}

function FormSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  const fields = scope === 'screen' ? 4 : 3;

  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading form">
      <LoadingSurface>
        <SkeletonCluster gap={Spacing.md}>
          <Skeleton width="38%" height={18} accessibilityLabel="Loading form heading" />
          {Array.from({ length: fields }).map((_, index) => (
            <SkeletonCluster key={index} gap={Spacing.xs} accessibilityLabel={`Loading form field ${index + 1}`}>
              <Skeleton width={index % 2 === 0 ? '28%' : '42%'} height={12} />
              <Skeleton height={Components.input.height} radius={Radii.md} />
            </SkeletonCluster>
          ))}
        </SkeletonCluster>
      </LoadingSurface>
      <LoadingSurface>
        <SkeletonCluster gap={Spacing.sm}>
          <Skeleton width="24%" height={14} accessibilityLabel="Loading secondary form heading" />
          <Skeleton height={54} radius={Radii.md} accessibilityLabel="Loading action row" />
        </SkeletonCluster>
      </LoadingSurface>
    </SkeletonCluster>
  );
}

function ScheduleSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  const rows = scope === 'screen' ? 4 : 2;

  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading schedule">
      <Row justify="between" align="center">
        <Skeleton width={160} height={20} accessibilityLabel="Loading schedule heading" />
        <SkeletonPill width={96} />
      </Row>
      <Row gap="xs">
        <SkeletonPill width={72} />
        <SkeletonPill width={84} />
        <SkeletonPill width={68} />
      </Row>
      {Array.from({ length: rows }).map((_, index) => (
        <LoadingSurface key={index}>
          <Row align="center" gap="sm">
            <View style={styles.scheduleTimeRail}>
              <Skeleton width="70%" height={12} accessibilityLabel={`Loading day label ${index + 1}`} />
              <Skeleton width="48%" height={12} accessibilityLabel={`Loading time label ${index + 1}`} />
            </View>
            <View style={styles.flex}>
              <SkeletonText
                lines={2}
                widths={['62%', '86%']}
                accessibilityLabel={`Loading schedule row ${index + 1}`}
              />
            </View>
            <Skeleton width={48} height={48} radius={Radii.lg} accessibilityLabel="Loading status marker" />
          </Row>
        </LoadingSurface>
      ))}
    </SkeletonCluster>
  );
}

function TabPaneSkeleton({ scope = 'screen' }: SkeletonVariantProps) {
  return (
    <SkeletonCluster gap={Spacing.md} accessibilityLabel="Loading tab pane">
      <Row gap="xs">
        <SkeletonPill width={72} />
        <SkeletonPill width={84} />
        <SkeletonPill width={68} />
      </Row>
      <LoadingSurface>
        <SkeletonCluster gap={Spacing.sm}>
          <Skeleton width="36%" height={16} accessibilityLabel="Loading pane heading" />
          <SkeletonText
            lines={scope === 'screen' ? 3 : 2}
            widths={['100%', '92%', '62%']}
            accessibilityLabel="Loading pane content"
          />
        </SkeletonCluster>
      </LoadingSurface>
      <LoadingSurface>
        <Row gap="sm">
          <View style={styles.flex}>
            <Skeleton height={72} radius={Radii.card} accessibilityLabel="Loading pane metric one" />
          </View>
          <View style={styles.flex}>
            <Skeleton height={72} radius={Radii.card} accessibilityLabel="Loading pane metric two" />
          </View>
        </Row>
      </LoadingSurface>
    </SkeletonCluster>
  );
}

export const VARIANT_MAP: Record<LoadingVariant, React.FC<SkeletonVariantProps>> = {
  list: ListSkeleton,
  feed: FeedSkeleton,
  card: CardSkeleton,
  detail: HeroSkeleton,
  hero: HeroSkeleton,
  form: FormSkeleton,
  calendar: ScheduleSkeleton,
  schedule: ScheduleSkeleton,
  'tab-pane': TabPaneSkeleton,
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  surface: {
    padding: Spacing.md,
  },
  scheduleTimeRail: {
    width: 64,
    gap: Spacing.xs,
  },
});
