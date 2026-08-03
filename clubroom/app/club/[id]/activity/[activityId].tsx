import { useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import type { ClubActivity } from '@/constants/types';
import { useRequiredParam } from '@/hooks/use-required-param';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { clubScheduleService } from '@/services/club-schedule-service';
import { err, validationError } from '@/types/result';

function getActivityHref(activity: ClubActivity) {
  if (activity.source === 'group_session') {
    return Routes.groupSession(activity.sourceEntityId);
  }
  if (activity.source === 'match') {
    return Routes.match(activity.sourceEntityId);
  }
  return Routes.event(activity.sourceEntityId);
}

export default function ClubActivityRoute() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const clubIdParam = useRequiredParam('id');
  const activityIdParam = useRequiredParam('activityId');
  const clubId = clubIdParam.valid ? clubIdParam.value : '';
  const activityId = activityIdParam.valid ? activityIdParam.value : '';

  const loadActivity = () => {
    if (!clubIdParam.valid || !activityIdParam.valid) {
      return Promise.resolve(err(validationError('Invalid club activity link.')));
    }
    return clubScheduleService.getClubActivity(clubId, activityId);
  };

  const { data: activity, status, error, retry, hasRequestedTruthfulFrame } = useScreen({
    load: loadActivity,
    deps: [clubId, clubIdParam.valid, activityId, activityIdParam.valid, currentUser?.id],
    dataKey: `club-activity:${currentUser?.id ?? 'anonymous'}:${clubId || 'missing'}:${activityId || 'missing'}`,
  });

  useEffect(() => {
    if (!hasRequestedTruthfulFrame || status !== 'success' || !activity) {
      return;
    }

    router.replace(getActivityHref(activity));
  }, [activity, hasRequestedTruthfulFrame, status]);

  const handleBack = () => {
    if (clubIdParam.valid) {
      router.replace(Routes.clubSchedule(clubIdParam.value));
      return;
    }
    router.replace(Routes.MY_CLUBS);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PageHeader title="Opening Activity" showBack onBackPress={handleBack} />
      {status === 'error' ? (
        <ErrorState
          message={
            error?.code === 'NOT_FOUND'
              ? 'This club activity is no longer available.'
              : 'Failed to open this activity.'
          }
          onRetry={retry}
        />
      ) : (
        <LoadingState variant="detail" />
      )}
    </SafeAreaView>
  );
}
