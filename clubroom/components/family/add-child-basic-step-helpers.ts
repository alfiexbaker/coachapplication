import type { Gender, Relationship } from '@/services/child-service';

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export const RELATIONSHIPS: { id: Relationship; label: string }[] = [
  { id: 'SON', label: 'Son' },
  { id: 'DAUGHTER', label: 'Daughter' },
  { id: 'WARD', label: 'Ward' },
  { id: 'GRANDCHILD', label: 'Grandchild' },
  { id: 'OTHER', label: 'Other' },
];
