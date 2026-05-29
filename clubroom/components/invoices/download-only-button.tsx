import { Invoice } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { DownloadOnlyButtonInner } from './download-button-sections';

interface DownloadOnlyButtonProps {
  invoice: Invoice;
  size?: 'small' | 'medium' | 'large';
}

export function DownloadOnlyButton({ invoice, size = 'medium' }: DownloadOnlyButtonProps) {
  const { colors: palette } = useTheme();
  return <DownloadOnlyButtonInner invoice={invoice} size={size} palette={palette} />;
}
