'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SessionContext = createContext({
  session: null,
  profile: null,
  isCreator: false,
  avatarPath: null,
  loading: true,
  refreshProfile: () => {},
  signOut: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

// Wraps the whole site. Tracks the Supabase auth session, the person's
// `profiles` row (role + name — same table the app uses), and whether
// they're an approved creator (mother/pastor/influencer), via the
// is_valid_creator() RPC — the same check the dashboard routes enforce
// server-side through RLS, used here just to decide what the header/nav
// show.
export default function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  // The creator's website profile picture (creator_storefronts.avatar_path) —
  // loaded here, alongside the profile row, so the header and dashboard
  // sidebar can both show the real photo instead of just initials, without
  // each needing its own Supabase query.
  const [avatarPath, setAvatarPath] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setIsCreator(false);
      setAvatarPath(null);
      return;
    }
    const [{ data: profileRow }, { data: creatorFlag }, { data: storefront }] = await Promise.all([
      supabase.from('profiles').select('id, role, full_name, is_premium').eq('id', userId).maybeSingle(),
      supabase.rpc('is_valid_creator', { check_auth_id: userId }),
      supabase.from('creator_storefronts').select('avatar_path').eq('auth_user_id', userId).maybeSingle(),
    ]);
    setProfile(profileRow || null);
    setIsCreator(!!creatorFlag);
    setAvatarPath(storefront?.avatar_path || null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      await loadProfile(data.session?.user?.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadProfile(newSession?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) loadProfile(session.user.id);
  }, [session, loadProfile]);

  return (
    <SessionContext.Provider value={{ session, profile, isCreator, avatarPath, loading, refreshProfile, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
