import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { CONSENT_KEY, REGION_COOKIE } from './tracking';

// Our own website analytics (no outside service). Events go to the site_events table through the
// track_events() database function, in small batches. What is recorded: page views, clicks (the
// button or link text and where it goes), how far down each page people scroll, time on page, and
// key steps (buy click, checkout, purchase, sign-up, advisor steps). Never anything typed into a form.
//
// Visitor id: a random id kept on this device only for visitors who may be measured (the same rule
// as the advert pixels: outside the EU/EEA/UK/Switzerland, no Global Privacy Control signal, or they
// pressed Allow). Everyone else is counted per visit only, with nothing kept after the tab closes.

const VISITOR_KEY = 'rt_vid';
const SESSION_KEY = 'rt_sid';
const SESSION_TOUCH = 'rt_sid_at';
const SESSION_IDLE_MS = 30 * 60 * 1000;

let queue = [];
let timer = null;
let accessToken = null;
let memorySession = null;
let utm = null;

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));

export function setAnalyticsToken(token) {
  accessToken = token || null;
}

function mayMeasure() {
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

function visitorId() {
  if (!mayMeasure()) return null;
  try {
    let v = window.localStorage.getItem(VISITOR_KEY);
    if (!v) { v = uuid(); window.localStorage.setItem(VISITOR_KEY, v); }
    return v;
  } catch {
    return null;
  }
}

function sessionId() {
  try {
    const now = Date.now();
    let s = window.sessionStorage.getItem(SESSION_KEY);
    const last = Number(window.sessionStorage.getItem(SESSION_TOUCH) || 0);
    if (!s || now - last > SESSION_IDLE_MS) { s = uuid(); window.sessionStorage.setItem(SESSION_KEY, s); }
    window.sessionStorage.setItem(SESSION_TOUCH, String(now));
    return s;
  } catch {
    if (!memorySession) memorySession = uuid();
    return memorySession;
  }
}

function device() {
  const w = window.innerWidth || 0;
  return w < 700 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

const tidy = (v) => String(v || '').replace(/[^\w .+-]/g, '').trim().slice(0, 100) || null;

// The ad tags of this visit: from the address on the first page, then kept for the visit.
function utmTags() {
  if (utm) return utm;
  const p = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const fromUrl = {};
  keys.forEach((k) => { fromUrl[k] = tidy(p.get(k)); });
  // A link with tags in the address is a new arrival: its tags replace the whole set from any earlier
  // link in this visit, so a tag from one link (say utm_content) is never mixed into another link's.
  if (keys.some((k) => fromUrl[k])) {
    try { keys.forEach((k) => { if (fromUrl[k]) window.sessionStorage.setItem(`rt_${k}`, fromUrl[k]); else window.sessionStorage.removeItem(`rt_${k}`); }); } catch { /* storage blocked */ }
    utm = fromUrl;
    return utm;
  }
  const read = (k) => {
    try { return tidy(window.sessionStorage.getItem(`rt_${k}`)); } catch { return null; }
  };
  utm = { utm_source: read('utm_source'), utm_medium: read('utm_medium'), utm_campaign: read('utm_campaign'), utm_content: read('utm_content') };
  return utm;
}

function referrerHost() {
  try {
    if (!document.referrer) return null;
    const u = new URL(document.referrer);
    return u.host === window.location.host ? null : u.host.slice(0, 120);
  } catch {
    return null;
  }
}

function flush(useBeacon = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  if (queue.length === 0) return;
  const batch = queue.splice(0, 40);
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
  };
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/track_events`, {
      method: 'POST', headers, body: JSON.stringify({ p_events: batch }), keepalive: useBeacon,
    }).catch(() => {});
  } catch { /* never break the page */ }
  if (queue.length) flush(useBeacon);
}

// Record one event. event: lower_snake_case name. extra: { label, target, scroll_pct, duration_ms, props }.
export function track(event, extra = {}) {
  if (typeof window === 'undefined') return;
  try {
    const tags = utmTags();
    queue.push({
      event,
      session_id: sessionId(),
      visitor_id: visitorId(),
      path: window.location.pathname.slice(0, 300),
      referrer: event === 'page_view' ? referrerHost() : null,
      device: device(),
      ...tags,
      ...extra,
    });
    if (queue.length >= 20) flush();
    else if (!timer) timer = setTimeout(() => flush(), 4000);
  } catch { /* never break the page */ }
}

export function flushNow() {
  flush(true);
}
