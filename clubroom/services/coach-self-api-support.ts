import { authService } from '@/services/auth-service';

export async function isSignedInCoachSelf(coachId: string): Promise<boolean> {
  const currentUser = await authService.getCurrentUser();
  return currentUser?.accountType === 'COACH' && currentUser.id === coachId;
}
