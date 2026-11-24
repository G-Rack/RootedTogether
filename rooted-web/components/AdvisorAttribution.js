'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';

// On an offering page: if the visitor came from the course advisor (/advisor) and is signed in,
// tie their account to that advisor visit, so the funnel can count a later purchase.
// Never changes checkout and shows nothing. Runs once per visit and account.
const STORE_KEY = 'rt_advisor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default function AdvisorAttribution() {
  const params = useSearchParams();
  const fromUrl = params.get('src') === 'advisor' ? params.get('as') || '' : '';
  const { session } = useSession();
  const userId = session?.user?.id || '';

  useEffect(() => {
    let id = UUID.test(fromUrl) ? fromUrl : '';
    try {
      if (id) {
        window.localStorage.setItem(STORE_KEY, JSON.stringify({ id, at: Date.now() }));
      } else {
        const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null');
        if (saved && UUID.test(saved.id) && Date.now() - Number(saved.at) < THIRTY_DAYS) id = saved.id;
      }
    } catch { /* storage blocked: use the link only */ }
    if (!id || !userId) return;
    const doneKey = `${STORE_KEY}_linked_${id}_${userId}`;
    try { if (window.localStorage.getItem(doneKey)) return; } catch { /* ignore */ }
    supabase.rpc('advisor_link_buyer', { p_session: id }).then(({ error }) => {
      if (!error) { try { window.localStorage.setItem(doneKey, '1'); } catch { /* ignore */ } }
    });
  }, [fromUrl, userId]);

  return null;
}
