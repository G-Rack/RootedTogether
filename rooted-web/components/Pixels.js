import Script from 'next/script';
import { PIXELS_INIT } from '@/lib/tracking';

// The Meta and TikTok advert pixels, loaded on every page for visitors who are allowed to be
// measured (see PIXELS_INIT in lib/tracking.js). Visitors who must be asked first get no pixel until
// they press Allow in the cookie bar.
export default function Pixels() {
  return <Script id="rt-pixels" strategy="afterInteractive">{PIXELS_INIT}</Script>;
}
