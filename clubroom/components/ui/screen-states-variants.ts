import type React from 'react';

import {
  CardSkeleton,
  FeedSkeleton,
  FormSkeleton,
  HeroSkeleton,
  ListSkeleton,
  ScheduleSkeleton,
  TabPaneSkeleton,
  type LoadingVariant,
  type SkeletonVariantProps,
} from './screen-states-sections';

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
