// Google Ads / Google tag helpers, shared by both Rooted Together sites.
//
// Nothing here is a secret, but nothing is written into the code either. The tag ID and the
// conversion labels come from Vercel environment variables. While NEXT_PUBLIC_GOOGLE_TAG_ID is
// empty, no Google script loads and every function below quietly does nothing.
//
//   NEXT_PUBLIC_GOOGLE_TAG_ID                 e.g. AW-1234567890
//   NEXT_PUBLIC_GADS_PURCHASE_LABEL           conversion label for the "purchase" conversion
//   NEXT_PUBLIC_GADS_SIGNUP_LABEL             conversion label for the "sign_up" conversion
//   (optional) NEXT_PUBLIC_GADS_PURCHASE_LABEL_MEMBERSHIP / _PRO / _OFFERING
//             a separate label for one kind of purchase; it wins over the general purchase label.

const RAW_TAG = (process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || '').trim();
// Only accept the shapes Google really uses, so a typo can never put odd text into a script.
export const GOOGLE_TAG_ID = /^(AW|G|GT)-[A-Za-z0-9]{4,}$/.test(RAW_TAG) ? RAW_TAG : '';

const clean = (v) => ((v || '').trim().match(/^[A-Za-z0-9_-]{6,}$/) ? v.trim() : '');
const PURCHASE_LABELS = {
  default: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL),
  membership: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_MEMBERSHIP),
  pro: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_PRO),
  offering: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_OFFERING),
};
export const SIGNUP_LABEL = clean(process.env.NEXT_PUBLIC_GADS_SIGNUP_LABEL);

export const CONSENT_KEY = 'rt_consent'; // 'granted' | 'denied', set when the visitor chooses

// Countries where consent is required before ad cookies: the EU/EEA, the UK and Switzerland.
export const CONSENT_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];
export const REGION_COOKIE = 'rt_cr'; // '1' = ask first, '0' = no banner needed (set by proxy.js)

function gtagReady() {
  return typeof window !== 'undefined' && GOOGLE_TAG_ID && typeof window.gtag === 'function';
}

function once(key) {
  try {
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, '1');
  } catch {
    /* storage blocked: fine, the transaction id still lets Google ignore a repeat */
  }
  return true;
}

// kind: 'membership' | 'pro' | 'offering' | 'service' (prayer and meditation requests). transactionId must be unique per payment (the Stripe
// session id, or the purchase row id) so a refresh never counts a sale twice.
export function trackPurchase({ value, currency = 'USD', transactionId, kind = 'offering' }) {
  if (!gtagReady() || !transactionId) return;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (!once(`rt_conv_purchase_${transactionId}`)) return;
  const payload = { value: amount, currency, transaction_id: String(transactionId) };
  window.gtag('event', 'purchase', { ...payload, items: [{ item_id: kind, item_name: kind }] });
  const label = PURCHASE_LABELS[kind] || PURCHASE_LABELS.default;
  if (label) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${label}`, ...payload });
}

// method: 'creator' | 'buyer' | 'social' | 'waitlist'
export function trackSignUp(method) {
  if (!gtagReady()) return;
  window.gtag('event', 'sign_up', { method });
  if (SIGNUP_LABEL) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${SIGNUP_LABEL}` });
}

// The consent set-up that must run before the Google tag. Kept as a string so the standalone
// coming-soon page can use the very same logic. It sets everything to "denied" first for anyone
// who must be asked (EU/EEA, UK, Switzerland, unknown location) or who sends a Global Privacy
// Control signal, unless they already made a choice on this device.
export const CONSENT_INIT = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
(function(){
  var need=/(?:^|; )${REGION_COOKIE}=0/.test(document.cookie)?false:true,
      gpc=navigator.globalPrivacyControl===true,saved=null;
  try{saved=window.localStorage.getItem('${CONSENT_KEY}')}catch(e){}
  var ok=saved==='granted'?true:saved==='denied'?false:(!need&&!gpc),v=ok?'granted':'denied';
  gtag('consent','default',{ad_storage:v,ad_user_data:v,ad_personalization:v,analytics_storage:v,wait_for_update:500});
  gtag('set','ads_data_redaction',true);
  gtag('set','url_passthrough',true);
  window.__rtAskConsent=(!saved&&need);
})();`;

// Records the visitor's choice and tells Google.
export function setConsent(granted) {
  const v = granted ? 'granted' : 'denied';
  try {
    window.localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* ignore */
  }
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
  }
}

export function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}
