// Google Ads / Google tag helpers, shared by both Rooted Together sites.
//
// Nothing here is a secret, but nothing is written into the code either. The tag ID and the
// conversion labels come from Vercel environment variables. While NEXT_PUBLIC_GOOGLE_TAG_ID is
// empty, no Google script loads and every function below quietly does nothing.
//
//   NEXT_PUBLIC_GOOGLE_TAG_ID                 e.g. AW-1234567890 (Google Ads)
//   NEXT_PUBLIC_GA4_ID                        e.g. G-ABC123XYZ4 (Google Analytics 4)
//   NEXT_PUBLIC_GADS_QUIZ_LABEL               conversion label for the "quiz_complete" conversion
//   NEXT_PUBLIC_GADS_PURCHASE_LABEL           conversion label for the "purchase" conversion
//   NEXT_PUBLIC_GADS_SIGNUP_LABEL             conversion label for the "sign_up" conversion
//   NEXT_PUBLIC_GADS_LEAD_LABEL               conversion label for the "generate_lead" conversion (email forms)
//   (optional) NEXT_PUBLIC_GADS_PURCHASE_LABEL_MEMBERSHIP / _PRO / _OFFERING
//             a separate label for one kind of purchase; it wins over the general purchase label.

const RAW_TAG = (process.env.NEXT_PUBLIC_GOOGLE_TAG_ID || '').trim();
// Only accept the shapes Google really uses, so a typo can never put odd text into a script.
export const GOOGLE_TAG_ID = /^(AW|G|GT)-[A-Za-z0-9]{4,}$/.test(RAW_TAG) ? RAW_TAG : '';

// Google Analytics 4 measurement ID, e.g. G-ABC123XYZ4 (NEXT_PUBLIC_GA4_ID). GOOGLE_TAG_ID above is
// the Google Ads tag (AW-...). Either can be set on its own; the Google tag loads once for both.
const RAW_GA4 = (process.env.NEXT_PUBLIC_GA4_ID || '').trim();
export const GA4_ID = /^G-[A-Za-z0-9]{4,}$/.test(RAW_GA4) ? RAW_GA4 : '';
export const GOOGLE_IDS = [...new Set([GA4_ID, GOOGLE_TAG_ID].filter(Boolean))];
export const GOOGLE_ENABLED = GOOGLE_IDS.length > 0;
export const GOOGLE_PRIMARY_ID = GOOGLE_IDS[0] || '';

// The one-line script that configures every Google ID. Shared by the real site and the standalone pages.
export function googleConfigJs(linkedSites = []) {
  const linker = linkedSites.length ? `,{linker:{domains:${JSON.stringify(linkedSites)}}}` : '';
  return `gtag('js',new Date());${GOOGLE_IDS.map((id) => `gtag('config','${id}'${linker});`).join('')}`;
}

const clean = (v) => ((v || '').trim().match(/^[A-Za-z0-9_-]{6,}$/) ? v.trim() : '');
const PURCHASE_LABELS = {
  default: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL),
  membership: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_MEMBERSHIP),
  pro: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_PRO),
  offering: clean(process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL_OFFERING),
};
export const SIGNUP_LABEL = clean(process.env.NEXT_PUBLIC_GADS_SIGNUP_LABEL);
// Conversion label for the "quiz_complete" conversion (NEXT_PUBLIC_GADS_QUIZ_LABEL).
export const QUIZ_LABEL = clean(process.env.NEXT_PUBLIC_GADS_QUIZ_LABEL);
export const LEAD_LABEL = clean(process.env.NEXT_PUBLIC_GADS_LEAD_LABEL);

// Meta (Facebook / Instagram) and TikTok advert pixels. These IDs are public by design.
export const META_PIXEL_ID = '2170035307059187';
export const TIKTOK_PIXEL_ID = 'DBQPKQJC77UFHI4PL5TG';

export const CONSENT_KEY = 'rt_consent'; // 'granted' | 'denied', set when the visitor chooses

// Countries where consent is required before ad cookies: the EU/EEA, the UK and Switzerland.
export const CONSENT_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];
export const REGION_COOKIE = 'rt_cr'; // '1' = ask first, '0' = no banner needed (set by proxy.js)

function gtagReady() {
  return typeof window !== 'undefined' && GOOGLE_ENABLED && typeof window.gtag === 'function';
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
// session id, or the purchase row id) so a refresh never counts a sale twice. For a marketplace purchase
// ('offering') the same id is also the Meta event_id, and the Stripe webhook sends the matching server-side
// Purchase with that id, so Meta counts the sale once, not twice.
export function trackPurchase({ value, currency = 'USD', transactionId, kind = 'offering', contentId, contentName }) {
  if (!transactionId) return;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  if (!once(`rt_conv_purchase_${transactionId}`)) return;
  const payload = { value: amount, currency, transaction_id: String(transactionId) };
  if (gtagReady()) {
    window.gtag('event', 'purchase', {
      ...payload,
      items: [{ item_id: contentId || kind, item_name: contentName || kind, price: amount, quantity: 1 }],
    });
    const label = PURCHASE_LABELS[kind] || PURCHASE_LABELS.default;
    if (label && GOOGLE_TAG_ID) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${label}`, ...payload });
  }
  if (kind === 'offering') {
    sendMeta('Purchase', {
      value: amount, currency, content_type: 'product', num_items: 1,
      ...(contentId ? { content_ids: [String(contentId)] } : {}),
      ...(contentName ? { content_name: contentName } : {}),
      ...utmParams(),
    }, String(transactionId));
  }
}

// method: 'creator' | 'buyer' | 'social' | 'waitlist'
export function trackSignUp(method) {
  // Our own site analytics (lib/analytics.js), loaded lazily to avoid a circular import.
  import('./analytics').then((m) => m.track('sign_up', { props: { method } })).catch(() => {});
  sendMeta('CompleteRegistration', { content_name: String(method), status: true });
  if (!gtagReady()) return;
  window.gtag('event', 'sign_up', { method });
  if (SIGNUP_LABEL && GOOGLE_TAG_ID) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${SIGNUP_LABEL}` });
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

// Loads the Meta and TikTok pixels (page view on load) for everyone allowed to be measured: the same
// rule as the Google tag. Visitors in the EU/EEA, UK, Switzerland, with an unknown location, or with a
// Global Privacy Control signal get no pixel until they press Allow. rtTrackSignup() fires the
// sign-up events (Meta: Lead, TikTok: CompleteRegistration) and does nothing if the pixels are not
// loaded. Kept as a string so the standalone coming-soon page can use the very same code.
export const PIXELS_INIT = `
(function(){
  if(window.rtLoadPixels)return;
  var need=/(?:^|; )${REGION_COOKIE}=0/.test(document.cookie)?false:true,
      gpc=navigator.globalPrivacyControl===true,saved=null,loaded=false;
  try{saved=window.localStorage.getItem('${CONSENT_KEY}')}catch(e){}
  window.rtLoadPixels=function(){
    if(loaded)return;loaded=true;
    try{
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      var u={};try{var sp=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function(k){var v=(sp.get(k)||'').trim().slice(0,100);if(v&&/^[A-Za-z0-9 _.+-]+$/.test(v))u[k]=v})}catch(e){}
      fbq('init','${META_PIXEL_ID}');fbq('track','PageView',u);
      var q=window.__rtMetaQ||[];window.__rtMetaQ=[];
      q.forEach(function(x){try{fbq(x.c?'trackCustom':'track',x.n,x.p||{},x.id?{eventID:x.id}:undefined)}catch(e){}});
    }catch(e){}
    try{
      !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
      ttq.load('${TIKTOK_PIXEL_ID}');ttq.page();}(window,document,'ttq');
    }catch(e){}
  };
  window.rtTrackSignup=function(){
    if(!loaded)return;
    try{if(window.fbq)window.fbq('track','Lead')}catch(e){}
    try{if(window.ttq)window.ttq.track('CompleteRegistration')}catch(e){}
  };
  if(saved==='granted'||(saved!=='denied'&&!need&&!gpc))window.rtLoadPixels();
})();`;

// ---- Meta Pixel events (browser side) -------------------------------------------------------------
// True when the Meta pixel will load for this visitor without being asked (same rule as PIXELS_INIT).
function pixelsMayLoad() {
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === 'granted') return true;
    if (saved === 'denied') return false;
    const noBannerNeeded = new RegExp(`(?:^|; )${REGION_COOKIE}=0`).test(document.cookie);
    return noBannerNeeded && navigator.globalPrivacyControl !== true;
  } catch {
    return false;
  }
}

// Sends one Meta event. eventId is Meta's event_id (used to match a server-side copy of the same event).
// If the pixel script has not started yet, the event waits for it, but only when the pixel is going to
// load for this visitor; visitors who said no, or have not been asked yet, send nothing.
export function sendMeta(name, params = {}, eventId = '', custom = false) {
  if (typeof window === 'undefined') return;
  if (typeof window.fbq === 'function') {
    try { window.fbq(custom ? 'trackCustom' : 'track', name, params, eventId ? { eventID: String(eventId) } : undefined); } catch { /* never break the page */ }
    return;
  }
  if (pixelsMayLoad()) {
    (window.__rtMetaQ = window.__rtMetaQ || []).push({ n: name, p: params, id: eventId ? String(eventId) : '', c: !!custom });
  }
}

// The ad tags of this visit (utm_source, utm_medium, utm_campaign, utm_content), sent with the Meta events
// below as custom parameters so Events Manager can break results down by link. Empty tags are left out.
function utmParams() {
  const a = getAttribution();
  const out = {};
  UTM_KEYS.forEach((k) => { if (a[k]) out[k] = a[k]; });
  return out;
}

// A course (or any offering) page was opened.
export function trackViewContent({ id, title, value, currency = 'USD' }) {
  if (!id) return;
  const amount = Math.max(0, Number(value) || 0);
  sendMeta('ViewContent', { content_ids: [String(id)], content_type: 'product', content_name: title || '', value: amount, currency, ...utmParams() });
  if (gtagReady()) {
    window.gtag('event', 'view_item', { currency, value: amount, items: [{ item_id: String(id), item_name: title || '', price: amount, quantity: 1 }] });
  }
}

// Buy Now was clicked on a paid offering.
export function trackBeginCheckout({ id, title, value, currency = 'USD' }) {
  if (!id) return;
  const amount = Math.max(0, Number(value) || 0);
  sendMeta('InitiateCheckout', { content_ids: [String(id)], content_type: 'product', content_name: title || '', value: amount, currency, num_items: 1, ...utmParams() });
  if (gtagReady()) {
    window.gtag('event', 'begin_checkout', { currency, value: amount, items: [{ item_id: String(id), item_name: title || '', price: amount, quantity: 1 }] });
  }
}

// A new email was collected on one of our forms (free Lesson 1, the /advisor devotional box, a gift on an
// offering page): Meta Lead and Google generate_lead (plus its Google Ads conversion when a label is set).
// Call it only when the sign-up is brand new, with an eventId made by newEventId() and also sent to the
// server in the same request, so the server-side copy of this Lead (lib/metaServer.js) is counted once.
// source: 'free_lesson' | 'advisor_devotional' | 'offering_gift'.
export function newEventId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
}
export function trackLead({ source, contentName = '', eventId = '' }) {
  const name = contentName || source;
  sendMeta('Lead', { content_name: name, content_category: 'lead', lead_source: source, ...utmParams() }, eventId);
  if (gtagReady()) {
    window.gtag('event', 'generate_lead', { lead_source: source, content_name: name });
    if (LEAD_LABEL && GOOGLE_TAG_ID) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${LEAD_LABEL}` });
  }
}

// The course-advisor quiz was finished. Counted once per person (per device): Meta Lead with the
// recommended course, Google quiz_complete (and its Google Ads conversion when a label is set).
export function trackQuizComplete({ id, title, eventId }) {
  if (!once('rt_conv_quiz_complete')) return;
  sendMeta('Lead', {
    content_name: 'Course advisor quiz', content_category: 'quiz',
    ...(id ? { content_ids: [String(id)] } : {}),
    ...(title ? { recommended_course: title } : {}),
  }, eventId || '');
  if (gtagReady()) {
    window.gtag('event', 'quiz_complete', { recommended_offering_id: id ? String(id) : '', recommended_offering_name: title || '' });
    if (QUIZ_LABEL && GOOGLE_TAG_ID) window.gtag('event', 'conversion', { send_to: `${GOOGLE_TAG_ID}/${QUIZ_LABEL}` });
  }
}

// ---- Ad tags and Meta browser ids, kept through the quiz and checkout ----------------------------
const ATTR_KEY = 'rt_attr';
const ATTR_DAYS = 30;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const tidyTag = (v) => String(v || '').replace(/[^\w .+-]/g, '').trim().slice(0, 100);
const readCookie = (name) => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
};

// On arrival with ad tags in the address: keep them for 30 days on this device, but only for
// visitors who may be measured (the same rule as the pixels). Everyone else keeps them for the visit only.
export function rememberAttribution() {
  if (typeof window === 'undefined') return;
  try {
    const p = new URLSearchParams(window.location.search);
    const found = {};
    UTM_KEYS.forEach((k) => { const v = tidyTag(p.get(k)); if (v) found[k] = v; });
    if (!Object.keys(found).length) return;
    UTM_KEYS.forEach((k) => { if (found[k]) window.sessionStorage.setItem(`rt_${k}`, found[k]); });
    if (pixelsMayLoad()) window.localStorage.setItem(ATTR_KEY, JSON.stringify({ ...found, at: Date.now() }));
  } catch { /* storage blocked */ }
}

// The tags to send with a checkout: utm_source / utm_medium / utm_campaign / utm_content (address, then this visit,
// then the last 30 days), plus Meta's _fbp / _fbc ids and consent flag. Meta ids are sent only when the
// Meta pixel is running for this visitor, so the server never reports a sale for someone who said no.
export function getAttribution() {
  const out = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', fbp: '', fbc: '', marketing_consent: false, source_url: '' };
  if (typeof window === 'undefined') return out;
  try {
    const p = new URLSearchParams(window.location.search);
    let saved = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(ATTR_KEY) || '{}') || {};
      if (Date.now() - Number(saved.at || 0) > ATTR_DAYS * 86400000) saved = {};
    } catch { saved = {}; }
    UTM_KEYS.forEach((k) => {
      let v = tidyTag(p.get(k));
      if (!v) { try { v = tidyTag(window.sessionStorage.getItem(`rt_${k}`)); } catch { /* ignore */ } }
      out[k] = v || tidyTag(saved[k]);
    });
    out.source_url = `${window.location.origin}${window.location.pathname}`.slice(0, 300);
    if (typeof window.fbq === 'function') {
      out.marketing_consent = true;
      out.fbp = readCookie('_fbp').slice(0, 120);
      const clid = (p.get('fbclid') || '').replace(/[^\w-]/g, '').slice(0, 200);
      out.fbc = readCookie('_fbc').slice(0, 200) || (clid ? `fb.1.${Date.now()}.${clid}` : '');
    }
  } catch { /* tracking must never get in the way of a purchase */ }
  return out;
}

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
  if (granted && typeof window.rtLoadPixels === 'function') window.rtLoadPixels();
}

export function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}
