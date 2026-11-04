import { supabase } from './supabaseClient';
import { SUBMIT_ENDPOINT, SUPABASE_ANON_KEY } from './config';

// Free buyer accounts. These are ordinary "seeker" accounts: no membership,
// no payment. The submit-signup Edge Function only asks for the $49 membership
// on creator roles, so this goes straight through.

// Only follow same-site paths ("/offering/abc"), never another address.
export function safeNext(raw) {
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}

export async function createBuyerAccount({ name, email, dob, password, referralCode }) {
  let res;
  let body = {};
  try {
    res = await fetch(SUBMIT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        role: 'seeker',
        fields: { Name: name.trim(), Email: email.trim(), 'Date of Birth': dob },
        password,
        referredByCode: (referralCode || '').trim() || undefined,
      }),
    });
    body = await res.json().catch(() => ({}));
  } catch {
    return { ok: false, error: "Couldn't reach the server — please try again." };
  }
  if (!res.ok) return { ok: false, error: body.error || "Couldn't create your account right now." };

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: true, signedIn: false, error: 'Your account is ready — please log in.' };
  return { ok: true, signedIn: true };
}

export async function signInWithEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    return {
      ok: false,
      error: error.message === 'Invalid login credentials'
        ? "That email and password don't match — check them and try again."
        : error.message,
    };
  }
  return { ok: true };
}

// Google / Apple sign-in. The browser leaves for the provider and comes back to
// /finish-account, which completes the free buyer account if it is a new person.
export async function signInWithProvider(provider, { next, referralCode } = {}) {
  const params = new URLSearchParams();
  const safe = safeNext(next);
  if (safe) params.set('next', safe);
  if (referralCode) params.set('ref', referralCode);
  const qs = params.toString();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/finish-account${qs ? `?${qs}` : ''}` },
  });
  return { error: error ? error.message : null };
}
