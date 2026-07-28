export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

export function formatPriceShort(price: number): string {
  if (price % 1 === 0) {
    return `$${price}`;
  }
  return formatPrice(price);
}
