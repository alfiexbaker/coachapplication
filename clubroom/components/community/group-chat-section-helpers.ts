import type { GroupMessage } from '@/constants/types';

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function shouldShowDateHeader(
  current: GroupMessage,
  prev: GroupMessage | undefined,
): boolean {
  if (!prev) return true;
  return new Date(current.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
}
