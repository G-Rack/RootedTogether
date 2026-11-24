import Script from 'next/script';
import { GOOGLE_ENABLED, GOOGLE_PRIMARY_ID, CONSENT_INIT, googleConfigJs } from '@/lib/tracking';

// The Google tag, loaded on every page. Consent is set to "denied" first for visitors who must be
// asked (EU/EEA, UK, Switzerland, or anyone sending a Global Privacy Control signal), then the tag
// loads once for both Google Analytics 4 (NEXT_PUBLIC_GA4_ID) and Google Ads (NEXT_PUBLIC_GOOGLE_TAG_ID).
// Renders nothing until at least one of them is set.
const LINKED_SITES = ['rootedtogether.club', 'joinrootedtogether.club'];

export default function GoogleTag() {
  if (!GOOGLE_ENABLED) return null;
  return (
    <>
      <Script id="rt-consent" strategy="beforeInteractive">{CONSENT_INIT}</Script>
      <Script id="rt-gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_PRIMARY_ID}`} strategy="afterInteractive" />
      <Script id="rt-gtag" strategy="afterInteractive">
        {googleConfigJs(LINKED_SITES)}
      </Script>
    </>
  );
}
