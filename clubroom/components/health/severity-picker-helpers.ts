import type { InjurySeverity } from '@/constants/types';

export interface SeverityOption {
  value: InjurySeverity;
  description: string;
  examples: string;
}

export const SEVERITY_OPTIONS: SeverityOption[] = [
  {
    value: 'MINOR',
    description: 'Can continue with some discomfort',
    examples: 'Slight strain, minor bruise, small cut',
  },
  {
    value: 'MODERATE',
    description: 'Needs rest but recovers in 1-2 weeks',
    examples: 'Sprain, muscle pull, significant bruising',
  },
  {
    value: 'SEVERE',
    description: 'Requires medical attention',
    examples: 'Fracture, torn ligament, severe swelling',
  },
];
