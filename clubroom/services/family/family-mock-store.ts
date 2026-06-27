import type { FamilyAccount, FamilyGuardian, FamilyMember, GuardianInvite } from '@/constants/types';

function cloneFamilyGuardian(guardian: FamilyGuardian): FamilyGuardian {
  return {
    ...guardian,
    permissions: [...guardian.permissions],
    childAccess: [...guardian.childAccess],
  };
}

function cloneFamilyMember(member: FamilyMember): FamilyMember {
  return { ...member };
}

function cloneGuardianInvite(invite: GuardianInvite): GuardianInvite {
  return {
    ...invite,
    permissions: [...invite.permissions],
    childAccess: [...invite.childAccess],
  };
}

function cloneFamilyAccount(account: FamilyAccount): FamilyAccount {
  return {
    ...account,
    guardians: account.guardians.map(cloneFamilyGuardian),
    children: account.children.map(cloneFamilyMember),
    pendingInvites: account.pendingInvites.map(cloneGuardianInvite),
  };
}

let mockFamilyAccounts: FamilyAccount[] = [];
let mockGuardianInvites: GuardianInvite[] = [];

export function loadMockFamilyAccounts(): FamilyAccount[] {
  return mockFamilyAccounts.map(cloneFamilyAccount);
}

export function saveMockFamilyAccounts(accounts: FamilyAccount[]): void {
  mockFamilyAccounts = accounts.map(cloneFamilyAccount);
}

export function loadMockGuardianInvites(): GuardianInvite[] {
  return mockGuardianInvites.map(cloneGuardianInvite);
}

export function saveMockGuardianInvites(invites: GuardianInvite[]): void {
  mockGuardianInvites = invites.map(cloneGuardianInvite);
}

export function resetMockFamilyStore(): void {
  mockFamilyAccounts = [];
  mockGuardianInvites = [];
}
