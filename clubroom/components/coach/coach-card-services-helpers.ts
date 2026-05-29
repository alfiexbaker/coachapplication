export function formatPrice(
  pricePerHour?: number,
  priceMin?: number,
  priceMax?: number,
): string | null {
  if (pricePerHour) return `£${pricePerHour}`;
  if (priceMin && priceMax) {
    return priceMin === priceMax ? `£${priceMin}` : `£${priceMin}-£${priceMax}`;
  }
  return null;
}
