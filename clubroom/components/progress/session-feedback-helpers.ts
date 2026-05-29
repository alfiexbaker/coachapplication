export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function getPerformanceLabel(rating: number): string {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Great';
    case 3:
      return 'Good';
    case 2:
      return 'Fair';
    default:
      return 'Keep Going';
  }
}
