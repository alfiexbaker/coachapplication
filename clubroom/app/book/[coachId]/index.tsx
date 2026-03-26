import { Redirect, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

export default function BookCoachEntryScreen() {
  const { coachId, offeringId, source, childId, weeks } = useLocalSearchParams<{
    coachId: string;
    offeringId?: string;
    source?: string;
    childId?: string;
    weeks?: string;
  }>();

  if (!coachId) {
    return <Redirect href={Routes.BOOK_COACH} />;
  }

  return (
    <Redirect
      href={Routes.bookSessionType(coachId, {
        offeringId,
        source,
        childId,
        weeks,
      })}
    />
  );
}
