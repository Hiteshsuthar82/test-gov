/**
 * Calculate discounted price based on partner discount percentage
 * @param originalPrice - Original price
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Object with discounted price (rounded) and original price
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  discountPercentage?: number
): { discountedPrice: number; originalPrice: number } {
  if (!discountPercentage || discountPercentage <= 0) {
    return {
      discountedPrice: originalPrice,
      originalPrice: originalPrice,
    };
  }

  const discountAmount = (originalPrice * discountPercentage) / 100;
  const discountedPrice = Math.round(originalPrice - discountAmount);

  return {
    discountedPrice,
    originalPrice,
  };
}

/**
 * Format price for display with discount
 * @param originalPrice - Original price
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Formatted price string or object with both prices
 */
export function formatPriceWithDiscount(
  originalPrice: number,
  discountPercentage?: number
): { discountedPrice: number; originalPrice: number; hasDiscount: boolean } {
  const { discountedPrice } = calculateDiscountedPrice(originalPrice, discountPercentage);
  const hasDiscount = discountPercentage !== undefined && discountPercentage > 0 && discountedPrice !== originalPrice;

  return {
    discountedPrice,
    originalPrice,
    hasDiscount,
  };
}

