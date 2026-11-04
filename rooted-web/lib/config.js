// Same Supabase project the mobile app and join.html use — this is what
// makes "one account for the app and the marketplace" true. Do not point
// this at a different project; every table, RLS policy, and the
// submit-signup Edge Function all live on this one project.
export const SUPABASE_URL = 'https://ethrhogtyebqndeyytqd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aHJob2d0eWVicW5kZXl5dHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjE1MTIsImV4cCI6MjEwMzk5NzUxMn0.5VYHM6swun4gNrsqg7FwLS0dyG44bQtV2EteUt7Y1Bc';
export const SUBMIT_ENDPOINT = `${SUPABASE_URL}/functions/v1/submit-signup`;
// Base URL for every other Edge Function — the Stripe Checkout / Connect
// functions and any future one all hang off this same pattern.
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// App store listings. Leave empty until the app is live — the website's
// download buttons show "Coming soon" while these are blank, and become
// real links the moment you paste the store URLs in.
export const APP_STORE_URL = '';
export const PLAY_STORE_URL = '';

// Set to true once you've dropped the OFFICIAL badge files into
// public/badges/ (app-store.svg and google-play.png). Until then the
// website shows its own styled download buttons instead.
export const USE_OFFICIAL_BADGES = false;

// Creators join (pay the one-time $49) on the onboarding site, then create their account here.
export const ONBOARDING_URL = 'https://joinrootedtogether.club';

// Creator Pro. Paste the Stripe Payment Link URLs here once they exist (see the
// setup steps). While they are empty, the upgrade buttons show "Coming soon".
export const PRO_UPGRADE_URL = 'https://buy.stripe.com/4gMeVeaY8cxzgWTg9c0gw04'; // $39 a year, for existing members
// Stripe's customer portal: paying Creator Pro members log in with their email to see receipts,
// update their card or cancel. Invited creators (free Pro) have no billing, so it finds nothing for them.
export const BILLING_PORTAL_URL = 'https://billing.stripe.com/p/login/00w14o9U45573639KO0gw00';
export const PRO_JOIN_URL = 'https://buy.stripe.com/5kQ00k8Q0fJLayv4qu0gw05'; // $88 first year ($49 once + $39 a year), for new creators (the join site has its own copy)

// "Continue with Google" / "Continue with Apple" on the sign-up and log-in screens.
// Leave both false until the provider is switched on in Supabase (Authentication >
// Sign In / Providers). Flip each one to true once it works there; the buttons then appear.
export const SOCIAL_LOGIN = { google: false, apple: false };

// The coming-soon lock (see lib/siteGate.js and proxy.js). While this is false, visitors only see
// the coming-soon page. On launch day change it to true and run `ship`; the whole site opens.
// You get in before then by tapping the logo five times and typing the secret code, which is
// the SITE_ACCESS_CODE environment variable in Vercel.
export const SITE_LAUNCHED = false;

// Shown on the coming-soon page. Leave a link empty to hide its button.
export const SOCIAL_LINKS = { instagram: '', tiktok: '' };
