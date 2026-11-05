import Script from 'next/script';
import { GOOGLE_TAG_ID, CONSENT_INIT } from '@/lib/tracking';

// The Google tag, loaded on every page. Consent is set to "denied" first for visitors who must be
// asked (EU/EEA, UK, Switzerland, or anyone sending a Global Privacy Control signal), then the tag
// loads. Renders nothing until NEXT_PUBLIC_GOOGLE_TAG_ID is set.
const LINKED_SITES = ['rootedtogether.club', 'joinrootedtogether.club'];

export default function GoogleTag() {
  if (!GOOGLE_TAG_ID) return null;
  return (
    <>
      <Script id="rt-consent" strategy="beforeInteractive">{CONSENT_INIT}</Script>
      <Script id="rt-gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}`} strategy="afterInteractive" />
      <Script id="rt-gtag" strategy="afterInteractive">
        {`gtag('js',new Date());gtag('config','${GOOGLE_TAG_ID}',{linker:{domains:${JSON.stringify(LINKED_SITES)}}});`}
      </Script>
    </>
  );
}
