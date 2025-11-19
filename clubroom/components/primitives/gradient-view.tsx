import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { Gradients } from '@/constants/theme';

export interface GradientViewProps extends Omit<LinearGradientProps, 'colors'> {
  variant?: 'hero-warm' | 'hero-dark' | 'card-subtle' | 'shimmer';
  colors?: string[];
}

/**
 * Wrapper around LinearGradient with preset gradient variants from design tokens
 */
export function GradientView({ variant = 'hero-warm', colors, ...props }: GradientViewProps) {
  // Use provided colors or fall back to preset variants
  const gradientColors = colors || getGradientColors(variant);

  return <LinearGradient colors={gradientColors} {...props} />;
}

function getGradientColors(variant: GradientViewProps['variant']): string[] {
  switch (variant) {
    case 'hero-warm':
      return Gradients.hero.warmOverlay;
    case 'hero-dark':
      return Gradients.hero.darkBottom;
    case 'shimmer':
      return Gradients.hero.shimmer;
    case 'card-subtle':
      return Gradients.card.subtle;
    default:
      return Gradients.hero.warmOverlay;
  }
}
