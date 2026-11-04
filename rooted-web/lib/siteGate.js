// The "coming soon" lock. While SITE_LAUNCHED is false in lib/config.js, visitors see only the
// coming-soon page. The owner taps the logo five times, types the secret code, and gets a cookie
// that lets this browser through for 30 days. The code lives in the SITE_ACCESS_CODE environment
// variable on Vercel, never in the page or the repository.

export const GATE_COOKIE = 'rt_access';
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// What goes in the cookie: a fingerprint of the code, so changing the code signs everyone out.
export async function accessToken(code) {
  const data = new TextEncoder().encode(`rt-gate-v1|${code}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compare two strings without stopping at the first difference.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
