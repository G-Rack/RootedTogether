import { PRO_UPGRADE_URL } from '@/lib/config';

// The Creator Pro upgrade link, tagged with the logged-in account so the purchase is credited to
// that exact account (and the email box is pre-filled) even if they pay with a different email.
export function proUpgradeUrlFor(session) {
  if (!PRO_UPGRADE_URL) return '';
  const user = session?.user;
  if (!user?.id) return PRO_UPGRADE_URL;
  const params = new URLSearchParams({ client_reference_id: user.id });
  if (user.email) params.set('prefilled_email', user.email);
  return `${PRO_UPGRADE_URL}?${params.toString()}`;
}
