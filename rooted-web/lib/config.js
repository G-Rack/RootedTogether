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
