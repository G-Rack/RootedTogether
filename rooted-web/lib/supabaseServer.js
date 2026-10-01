import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// A separate client for Server Components (generateMetadata, etc). Same
// project + anon key as lib/supabaseClient.js — the split exists only
// because that file is marked 'use client' and Next.js's App Router keeps
// server-only code (like generateMetadata) out of client module graphs.
// No session persistence here; metadata reads are always anonymous/public.
export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
