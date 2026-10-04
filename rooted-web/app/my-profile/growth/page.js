'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabaseClient';

const DAY_MS = 24 * 60 * 60 * 1000;

// Was `d.toISOString().slice(0, 10)` — that reads the date back in UTC, so
// anyone west or east of UTC (basically everyone) could get a dateKey one
// day off from their actual local calendar day. A check saved just after
// local midnight (stored as `now()`, a real UTC instant) would come back
// from the DB keyed to a different day than the optimistic local update
// that showed it as checked — so it looked right until the page reloaded,
// then reset. Using local date parts keeps "today" meaning the same thing
// everywhere it's computed, insert, read-back, and the week-dots render.
function dateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Last `n` calendar days, oldest first, ending today.
function lastNDays(n) {
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() - (n - 1 - i) * DAY_MS));
}

export default function GrowthPage() {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState(null); // { id, leaderName, leaderRole }
  const [practices, setPractices] = useState([]);
  const [checksByPractice, setChecksByPractice] = useState({}); // { [practiceId]: Set<'YYYY-MM-DD'> }
  const [busyPracticeId, setBusyPracticeId] = useState(null);

  const loadChecks = useCallback(async (practiceIds, sibId) => {
    if (practiceIds.length === 0) return {};
    const since = new Date(Date.now() - 59 * DAY_MS);
    const { data } = await supabase
      .from('family_practice_checks')
      .select('practice_id, checked_at')
      .eq('sibling_auth_id', sibId)
      .in('practice_id', practiceIds)
      .gte('checked_at', since.toISOString());
    const byPractice = {};
    for (const id of practiceIds) byPractice[id] = new Set();
    for (const row of data || []) {
      byPractice[row.practice_id]?.add(dateKey(new Date(row.checked_at)));
    }
    return byPractice;
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId) return undefined;

    async function load() {
      setLoading(true);
      const { data: membership } = await supabase
        .from('family_memberships')
        .select('family_id')
        .eq('sibling_auth_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();

      if (!membership) {
        if (active) {
          setFamily(null);
          setPractices([]);
          setLoading(false);
        }
        return;
      }

      const [{ data: fam }, { data: practiceRows }] = await Promise.all([
        supabase.from('spiritual_families').select('id, leader_auth_id, leader_role').eq('id', membership.family_id).maybeSingle(),
        supabase.from('family_practices').select('id, label, sort_order').eq('family_id', membership.family_id).order('sort_order'),
      ]);

      let leaderName = 'Your family leader';
      if (fam?.leader_auth_id) {
        const { data: leaderProfile } = await supabase.from('profiles').select('full_name').eq('id', fam.leader_auth_id).maybeSingle();
        leaderName = leaderProfile?.full_name || leaderName;
      }

      const ids = (practiceRows || []).map((p) => p.id);
      const checks = await loadChecks(ids, userId);

      if (!active) return;
      setFamily(fam ? { id: fam.id, leaderName, leaderRole: fam.leader_role } : null);
      setPractices(practiceRows || []);
      setChecksByPractice(checks);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [userId, loadChecks]);

  const week = useMemo(() => lastNDays(7), []);
  const todayKey = dateKey(startOfDay(new Date()));

  // "Any practice checked" per day, across all practices — drives the week-dots row and streak.
  const anyCheckedDates = useMemo(() => {
    const set = new Set();
    for (const practiceSet of Object.values(checksByPractice)) {
      for (const d of practiceSet) set.add(d);
    }
    return set;
  }, [checksByPractice]);

  const streak = useMemo(() => {
    let count = 0;
    let cursor = startOfDay(new Date());
    // Count consecutive days ending yesterday-or-today; today only counts once it's checked.
    while (anyCheckedDates.has(dateKey(cursor))) {
      count += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }
    return count;
  }, [anyCheckedDates]);

  const toggleToday = async (practiceId) => {
    if (!userId || busyPracticeId) return;
    setBusyPracticeId(practiceId);
    const alreadyChecked = checksByPractice[practiceId]?.has(todayKey);

    if (alreadyChecked) {
      const start = startOfDay(new Date());
      const end = new Date(start.getTime() + DAY_MS);
      await supabase
        .from('family_practice_checks')
        .delete()
        .eq('sibling_auth_id', userId)
        .eq('practice_id', practiceId)
        .gte('checked_at', start.toISOString())
        .lt('checked_at', end.toISOString());
    } else {
      await supabase.from('family_practice_checks').insert({ practice_id: practiceId, sibling_auth_id: userId });
    }

    setChecksByPractice((prev) => {
      const next = { ...prev, [practiceId]: new Set(prev[practiceId]) };
      if (alreadyChecked) next[practiceId].delete(todayKey);
      else next[practiceId].add(todayKey);
      return next;
    });
    setBusyPracticeId(null);
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 240 }} />;
  }

  if (!family) {
    return (
      <div style={{ maxWidth: 780 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 20 }}>Growth</div>
        <div className="card" style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 700, color: 'var(--brown)' }}>Join a Spiritual Family to start tracking</div>
          <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 360 }}>
            Daily practices and streaks are set by the Mother or Pastor of the Spiritual Family you join — that
            happens in the Rooted Together app for now.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Growth</div>

      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--cream-dark)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 700, color: 'var(--brown)' }}>
            🔥 {streak}-day streak
          </span>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {week.filter((d) => anyCheckedDates.has(dateKey(d))).length} of 7 days this week
          </span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {week.map((d) => {
              const done = anyCheckedDates.has(dateKey(d));
              return (
                <div key={dateKey(d)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '1.5px solid var(--brown-pale)',
                      background: done ? 'var(--brown)' : 'transparent',
                      borderColor: done ? 'var(--brown)' : 'var(--brown-pale)',
                    }}
                  />
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-soft)' }}>
                    {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 11.5 }}>
          Practices set by {family.leaderName}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {practices.length === 0 && (
          <div className="muted" style={{ padding: 20, fontSize: 13.5 }}>
            Your family leader hasn&rsquo;t added any daily practices yet.
          </div>
        )}
        {practices.map((p, i) => {
          const checkedDates = checksByPractice[p.id] || new Set();
          const checkedToday = checkedDates.has(todayKey);
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 18px',
                borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => toggleToday(p.id)}
                disabled={busyPracticeId === p.id}
                aria-label={checkedToday ? 'Mark not done today' : 'Mark done today'}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: '1.5px solid var(--brown-pale)',
                  background: checkedToday ? 'var(--brown)' : 'var(--white)',
                  color: 'var(--white)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                {checkedToday ? '✓' : ''}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{p.label}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  {checkedToday ? 'Checked today' : 'Not checked today'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {week.map((d) => (
                  <span
                    key={dateKey(d)}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: checkedDates.has(dateKey(d)) ? 'var(--brown)' : 'var(--cream-dark)',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
