import type { InviteCode } from '@/constants/types';

const now = Date.now();
const yearFromNowIso = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();

export const INVITE_CODE_SEEDS: InviteCode[] = [
  {
    id: 'seed_invite_code_1',
    code: 'RIVER2026A',
    schoolId: 'school1',
    schoolName: 'Riverside Academy',
    createdBy: 'admin-1',
    createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: yearFromNowIso,
    maxUses: 25,
    currentUses: 7,
    status: 'active',
  },
  {
    id: 'seed_invite_code_2',
    code: 'ELITE2026B',
    schoolId: 'school2',
    schoolName: 'Elite Sports Centre',
    createdBy: 'admin-1',
    createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: yearFromNowIso,
    maxUses: 20,
    currentUses: 3,
    status: 'active',
  },
];
