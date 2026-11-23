import { formatPrice } from '@/lib/roles';
import { hasDiscount, offeringDiscountPercent } from '@/lib/discount';

// Shows the crossed-out original price and an "X% off" badge next to a price.
// Only shows when the creator entered a former price. Also shows "Launch price until [date]"
// when the creator set one and that day hasn't passed. Renders nothing otherwise.
function launchLabel(offering) {
  const d = offering?.launch_price_until;
  if (!d || offering.is_free_for_family || !(Number(offering.price_cents) > 0)) return null;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (String(d) < today) return null;
  const date = new Date(`${d}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `Launch price until ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function SaleTag({ offering, size = 13 }) {
  const launch = launchLabel(offering);
  const launchPill = launch ? (
    <span
      style={{
        padding: '2px 9px',
        borderRadius: 999,
        background: '#2E1B10',
        color: '#E8C48A',
        fontSize: Math.max(11, size - 1),
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {launch}
    </span>
  ) : null;
  if (!hasDiscount(offering)) return launchPill;
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
      {launchPill}
    </>
  );
}
