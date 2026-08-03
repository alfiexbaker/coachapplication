export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
}

export function formatBookingPrice(amount: number, currency: string): string {
  return `${currency}${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
}
