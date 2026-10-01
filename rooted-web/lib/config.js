// Same Supabase project the mobile app and join.html use — this is what
// makes "one account for the app and the marketplace" true. Do not point
// this at a different project; every table, RLS policy, and the
// submit-signup Edge Function all live on this one project.
export const SUPABASE_URL = 'https://ethrhogtyebqndeyytqd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aHJob2d0eWVicW5kZXl5dHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjE1MTIsImV4cCI6MjEwMzk5NzUxMn0.5VYHM6swun4gNrsqg7FwLS0dyG44bQtV2EteUt7Y1Bc';
export const SUBMIT_ENDPOINT = `${SUPABASE_URL}/functions/v1/submit-signup`;
