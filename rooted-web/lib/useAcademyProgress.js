'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Which Academy steps this creator has ticked. Shared by the Academy list and the lesson pages.
export default function useAcademyProgress(session, enabled) {
  const [done, setDone] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session || !enabled) return undefined;
    let active = true;
    async function load() {
      const { data } = await supabase.from('pro_academy_progress').select('lesson_key').eq('user_id', session.user.id);
      if (!active) return;
      setDone(new Set((data || []).map((r) => r.lesson_key)));
      setLoaded(true);
    }
    load();
    return () => { active = false; };
  }, [session, enabled]);

  const toggleDone = useCallback(async (key) => {
    if (!session) return;
    const isDone = done.has(key);
    setError('');
    setDone((prev) => {
      const next = new Set(prev);
      if (isDone) next.delete(key); else next.add(key);
      return next;
    });
    const res = isDone
      ? await supabase.from('pro_academy_progress').delete().eq('user_id', session.user.id).eq('lesson_key', key)
      : await supabase.from('pro_academy_progress').insert({ user_id: session.user.id, lesson_key: key });
    if (res.error) {
      setError('Could not save your progress. Please try again.');
      setDone((prev) => {
        const next = new Set(prev);
        if (isDone) next.add(key); else next.delete(key);
        return next;
      });
    }
  }, [session, done]);

  return { done, loaded, error, setError, toggleDone };
}
