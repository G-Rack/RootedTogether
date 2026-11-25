import { after } from 'next/server';
import { META_PIXEL_ID } from './tracking';
import { SITE_URL } from './seo';

// Tells Meta about a new lead from our own server (Conversions API), with the SAME event_id the browser
// pixel used, so Meta counts the lead once. Used by the sign-up routes (/api/gift, /api/free-lesson).
// What is sent: the event name, time, the page, the visitor's address and browser (so Meta can match the
// ad click) and Meta's _fbp/_fbc ids. No email and no name. The address and browser are used for this
// one call and never stored.
// Sent only when ALL of these hold: the visitor allowed the Meta pixel (attribution.marketing_consent),
// the page gave an event_id, and META_CAPI_ACCESS_TOKEN is set in Vercel. Otherwise it does nothing.
const cut = (v, max, bad) => String(v ?? '').replace(bad, '').trim().slice(0, max);

export function sendLeadToMeta(request, body, { source = '', contentName = '' } = {}) {
  try {
    const token = (process.env.META_CAPI_ACCESS_TOKEN || '').trim();
    const attr = body?.attribution || {};
    if (!token || attr.marketing_consent !== true) return;
    const eventId = cut(body?.event_id, 64, /[^\w-]/g);
    if (!eventId) return;
    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';
    const userData = {
      ...(ip ? { client_ip_address: ip.slice(0, 64) } : {}),
      ...(ua ? { client_user_agent: ua.slice(0, 300) } : {}),
      ...(cut(attr.fbp, 120, /[^\w.\-]/g) ? { fbp: cut(attr.fbp, 120, /[^\w.\-]/g) } : {}),
      ...(cut(attr.fbc, 200, /[^\w.\-]/g) ? { fbc: cut(attr.fbc, 200, /[^\w.\-]/g) } : {}),
    };
    const sourceUrl = cut(attr.source_url, 300, /[^\x21-\x7e]/g) || SITE_URL;
    const payload = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data: userData,
        custom_data: {
          content_name: cut(contentName, 100, /[^\w .+\-]/g) || cut(source, 60, /[^\w.\-]/g),
          content_category: 'lead',
          lead_source: cut(source, 60, /[^\w.\-]/g),
        },
      }],
      access_token: token,
      ...((process.env.META_TEST_EVENT_CODE || '').trim() ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() } : {}),
    };
    // Runs after the answer has gone back to the visitor, so a slow Meta never slows the sign-up.
    after(async () => {
      try {
        await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });
      } catch { /* a missed server copy never matters to the visitor */ }
    });
  } catch { /* never break a sign-up */ }
}
