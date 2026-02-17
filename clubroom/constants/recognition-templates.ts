/**
 * Recognition Templates — Quick-tap templates for coach recognition.
 * One per FA Four Corners category × 4 variants.
 */
import type { BadgeCategory } from './types';

export interface RecognitionTemplate {
  id: string;
  category: BadgeCategory;
  label: string;
  message: string;
}

export const RECOGNITION_TEMPLATES: RecognitionTemplate[] = [
  // Technical
  { id: 'tech_1', category: 'technical', label: 'Ball control', message: 'Great improvement in ball control today.' },
  { id: 'tech_2', category: 'technical', label: 'Passing & vision', message: 'Showed excellent passing and vision in build-up play.' },
  { id: 'tech_3', category: 'technical', label: 'Finishing', message: 'Clinical finishing in today\'s session.' },
  { id: 'tech_4', category: 'technical', label: 'Decision-making', message: 'Made smart decisions on and off the ball.' },

  // Physical
  { id: 'phys_1', category: 'physical', label: 'Work rate', message: 'Outstanding work rate throughout the session.' },
  { id: 'phys_2', category: 'physical', label: 'Fitness', message: 'Showed great fitness and stamina today.' },
  { id: 'phys_3', category: 'physical', label: 'Strength', message: 'Held up well physically in competitive drills.' },
  { id: 'phys_4', category: 'physical', label: 'Agility', message: 'Quick feet and sharp movement in tight spaces.' },

  // Psychological
  { id: 'psy_1', category: 'psychological', label: 'Focus', message: 'Maintained excellent concentration throughout.' },
  { id: 'psy_2', category: 'psychological', label: 'Resilience', message: 'Bounced back well after a setback today.' },
  { id: 'psy_3', category: 'psychological', label: 'Confidence', message: 'Showed growing confidence in training.' },
  { id: 'psy_4', category: 'psychological', label: 'Growth mindset', message: 'Embraced the challenge and kept trying.' },

  // Social
  { id: 'soc_1', category: 'social', label: 'Leadership', message: 'Led by example and organised the group well.' },
  { id: 'soc_2', category: 'social', label: 'Teamwork', message: 'Put the team first and supported teammates.' },
  { id: 'soc_3', category: 'social', label: 'Communication', message: 'Communicated well and encouraged others.' },
  { id: 'soc_4', category: 'social', label: 'Mentoring', message: 'Helped younger players improve during the session.' },
];

export function getTemplatesForCategory(category: BadgeCategory): RecognitionTemplate[] {
  return RECOGNITION_TEMPLATES.filter((t) => t.category === category);
}
