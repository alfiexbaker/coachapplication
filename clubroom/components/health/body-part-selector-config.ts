import type { BodyPartCategory } from '@/constants/types';

export const CATEGORIES: { id: BodyPartCategory; label: string; icon: string }[] = [
  { id: 'HEAD', label: 'Head & Neck', icon: 'person-outline' },
  { id: 'UPPER_BODY', label: 'Upper Body', icon: 'body-outline' },
  { id: 'CORE', label: 'Core & Back', icon: 'fitness-outline' },
  { id: 'LOWER_BODY', label: 'Lower Body', icon: 'footsteps-outline' },
];
