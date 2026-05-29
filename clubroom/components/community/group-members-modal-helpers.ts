import { withAlpha } from '@/constants/theme';
import type { GroupMemberRole } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

export const ROLE_LABELS: Record<GroupMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

export function getRoleBadgeColor(role: GroupMemberRole, palette: ThemeColors) {
  switch (role) {
    case 'OWNER':
      return { bg: withAlpha(palette.warning, 0.12), text: palette.warning };
    case 'ADMIN':
      return { bg: withAlpha(palette.info, 0.12), text: palette.info };
    case 'MODERATOR':
      return { bg: withAlpha(palette.success, 0.12), text: palette.success };
    default:
      return { bg: withAlpha(palette.muted, 0.09), text: palette.muted };
  }
}
