// price_cents is always what the buyer pays. original_price_cents is the regular
// price before a discount (null when there is no discount).

export function hasDiscount(offering) {
  return !!offering
    && !offering.is_free_for_family
    && Number(offering.original_price_cents) > Number(offering.price_cents || 0)
    && Number(offering.price_cents || 0) > 0;
}

// Whole-number percent off, e.g. 20 for $30 down to $24. 0 when there is no discount.
export function discountPercent(originalCents, priceCents) {
  const o = Number(originalCents);
  const p = Number(priceCents);
  if (!o || !p || o <= p) return 0;
  return Math.round((1 - p / o) * 100);
}

export function offeringDiscountPercent(offering) {
  return hasDiscount(offering) ? discountPercent(offering.original_price_cents, offering.price_cents) : 0;
}
