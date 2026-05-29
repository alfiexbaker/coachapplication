export function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatSessionTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTimeUntilDeadline(deadline: string): string {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h left to respond`;
  if (hours > 0) return `${hours}h left to respond`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left to respond`;
}
