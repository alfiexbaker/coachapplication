import * as Linking from 'expo-linking';
import type { ClubRole } from '@/constants/types';

export interface ParsedClubInviteInput {
  code: string;
  role?: ClubRole;
}

export function parseClubInviteInput(rawValue: string): ParsedClubInviteInput | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toUpperCase();
  if (!normalized.includes('://') && !normalized.includes('INVITECODE=')) {
    return { code: normalized.replace(/[^A-Z0-9-]/g, '') };
  }

  try {
    const parsed = Linking.parse(trimmed);
    const params = parsed.queryParams ?? {};
    const inviteCode = typeof params.inviteCode === 'string' ? params.inviteCode : undefined;
    const inviteRole = typeof params.inviteRole === 'string' ? params.inviteRole : undefined;
    if (!inviteCode) {
      return null;
    }

    return {
      code: inviteCode.trim().toUpperCase(),
      role: (inviteRole?.trim().toUpperCase() as ClubRole | undefined) ?? undefined,
    };
  } catch {
    return null;
  }
}

export function buildClubInviteLink(code: string, role?: ClubRole): string {
  return Linking.createURL('club/my-clubs', {
    queryParams: {
      inviteCode: code,
      ...(role ? { inviteRole: role } : {}),
    },
  });
}
