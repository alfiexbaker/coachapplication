export const INVITE_CODES = [
  {
    code: 'clubroom-coach',
    status: 'active' as const,
    schoolId: 'school-1',
    schoolName: 'Southgate Academy',
    currentUses: 0,
    maxUses: 10,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
