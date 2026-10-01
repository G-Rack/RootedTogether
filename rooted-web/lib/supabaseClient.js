'use client';

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// Browser client — session persists in localStorage automatically, so a
// visitor who logs in on the website stays logged in across page loads.
// This is the SAME project + anon key the Expo app uses, which is what
// makes "same login details" true: an account created in the app (or via
// join.html) logs in here with no extra setup, and vice versa.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // Needed so a password-reset email link (which carries a recovery
    // token in the URL) signs the visitor in automatically when they land
    // on /reset-password.
    detectSessionInUrl: true,
  },
});
