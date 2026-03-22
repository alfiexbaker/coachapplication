import type { ChildInfo } from '@/types/child-context';

export interface ProfileSubjectOption {
  id: string;
  name: string;
  initials: string;
  colorCode?: string;
  kind: 'self' | 'child';
}

export function buildProfileSubjectOptions({
  currentUser,
  children,
  includeSelf = true,
}: {
  currentUser?: { id?: string | null; name?: string | null; fullName?: string | null } | null;
  children: ChildInfo[];
  includeSelf?: boolean;
}): ProfileSubjectOption[] {
  const childOptions: ProfileSubjectOption[] = children.map((child) => ({
    id: child.id,
    name: child.name,
    initials: child.initials,
    colorCode: child.colorCode,
    kind: 'child',
  }));

  if (!includeSelf || !currentUser?.id) {
    return childOptions;
  }

  return [
    {
      id: currentUser.id,
      name: currentUser.fullName || currentUser.name || 'Me',
      initials: 'ME',
      kind: 'self',
    },
    ...childOptions,
  ];
}

export function resolveProfileSubjectId({
  explicitSubjectId,
  currentUserId,
  profileMode,
  profileSubjectId,
  subjectOptions,
}: {
  explicitSubjectId?: string | null;
  currentUserId?: string | null;
  profileMode: 'self' | 'child';
  profileSubjectId?: string | null;
  subjectOptions: ProfileSubjectOption[];
}): string | null {
  const isValid = (value: string | null | undefined): value is string =>
    Boolean(value) && subjectOptions.some((option) => option.id === value);

  if (isValid(explicitSubjectId)) {
    return explicitSubjectId;
  }
  if (profileMode === 'self' && currentUserId && isValid(currentUserId)) {
    return currentUserId;
  }
  if (isValid(profileSubjectId)) {
    return profileSubjectId;
  }
  return subjectOptions[0]?.id ?? null;
}

export function findProfileSubject(
  subjectId: string | null,
  subjectOptions: ProfileSubjectOption[],
): ProfileSubjectOption | null {
  if (!subjectId) {
    return null;
  }
  return subjectOptions.find((option) => option.id === subjectId) ?? null;
}

export function getNextProfileSubject(
  subjectId: string | null,
  subjectOptions: ProfileSubjectOption[],
): ProfileSubjectOption | null {
  if (!subjectId || subjectOptions.length <= 1) {
    return null;
  }
  const currentIndex = subjectOptions.findIndex((option) => option.id === subjectId);
  if (currentIndex < 0) {
    return subjectOptions[0] ?? null;
  }
  return subjectOptions[(currentIndex + 1) % subjectOptions.length] ?? null;
}

export function buildProfileScopePayload(option: ProfileSubjectOption): { mode: 'self' | 'child'; childId?: string } {
  if (option.kind === 'self') {
    return { mode: 'self' };
  }
  return { mode: 'child', childId: option.id };
}
