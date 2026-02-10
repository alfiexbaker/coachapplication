import type { School } from '@/constants/types';

const nowIso = new Date().toISOString();

export const SCHOOL_SEEDS: School[] = [
  {
    id: 'school1',
    name: 'Riverside Academy',
    address: '12 Riverside Way',
    city: 'London',
    state: 'England',
    zipCode: 'SW1A 1AA',
    photoUrl: 'https://picsum.photos/seed/riverside-academy/200',
    description: 'Youth football pathway with technical and performance coaching.',
    activeCoachesCount: 8,
    createdAt: nowIso,
  },
  {
    id: 'school2',
    name: 'Elite Sports Centre',
    address: '88 Northfield Road',
    city: 'Manchester',
    state: 'England',
    zipCode: 'M1 1AE',
    photoUrl: 'https://picsum.photos/seed/elite-sports-centre/200',
    description: 'Multi-age academy focused on game intelligence and development plans.',
    activeCoachesCount: 11,
    createdAt: nowIso,
  },
];
