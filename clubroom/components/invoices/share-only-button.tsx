import { Invoice } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { ShareOnlyButtonInner } from './download-button-sections';

interface ShareOnlyButtonProps {
  invoice: Invoice;
  size?: 'small' | 'medium' | 'large';
}

export function ShareOnlyButton({ invoice, size = 'medium' }: ShareOnlyButtonProps) {
  const { colors: palette } = useTheme();
  return <ShareOnlyButtonInner invoice={invoice} size={size} palette={palette} />;
}
