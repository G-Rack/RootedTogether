import { formatPrice } from '@/lib/roles';
import { hasDiscount, offeringDiscountPercent } from '@/lib/discount';

// Shows the crossed-out original price and an "X% off" badge next to a price.
// Renders nothing when the offering has no discount.
export default function SaleTag({ offering, size = 13 }) {
  if (!hasDiscount(offering)) return null;
  const percent = offeringDiscountPercent(offering);
  return (
    <>
      <span
        className="muted"
        style={{ fontSize: size, fontWeight: 500, textDecoration: 'line-through', whiteSpace: 'nowrap' }}
        aria-label={`Original price ${formatPrice(offering.original_price_cents)}`}
      >
        {formatPrice(offering.original_price_cents)}
      </span>
      <span
        style={{
          padding: '2px 9px',
          borderRadius: 999,
          background: '#F1E4D3',
          color: '#8A5E14',
          fontSize: Math.max(11, size - 1),
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {percent}% off
      </span>
    </>
  );
}
