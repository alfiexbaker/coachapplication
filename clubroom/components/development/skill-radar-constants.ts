import { Dimensions } from 'react-native';

import { Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CHART_SIZE = Math.min(SCREEN_WIDTH - Spacing.lg * 4, 260);
export const CENTER = CHART_SIZE / 2;
export const MAX_LEVEL = 10;
export const OUTER_RADIUS = CHART_SIZE / 2 - 40;
export const NUM_RINGS = 5;
