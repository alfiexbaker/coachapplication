export interface TrialFormValues {
  trialPrice: string;
  normalPrice: string;
  durationMinutes: string;
  limitPerFamily: string;
  description: string;
}

export function validateTrialForm(values: TrialFormValues): string | null {
  const parsedTrial = parseFloat(values.trialPrice);
  const parsedNormal = parseFloat(values.normalPrice);
  const parsedDuration = parseInt(values.durationMinutes, 10);
  const parsedLimit = parseInt(values.limitPerFamily, 10);

  if (isNaN(parsedTrial) || parsedTrial < 0) return 'Please enter a valid trial price.';
  if (isNaN(parsedNormal) || parsedNormal <= 0) return 'Please enter a valid normal price.';
  if (parsedTrial >= parsedNormal) return 'Trial price should be less than the normal price.';
  if (isNaN(parsedDuration) || parsedDuration < 15) {
    return 'Session duration must be at least 15 minutes.';
  }
  if (isNaN(parsedLimit) || parsedLimit < 1) return 'Limit per family must be at least 1.';
  return null;
}
