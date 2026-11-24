'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { track, flushNow, setAnalyticsToken } from '@/lib/analytics';

// Records page views, clicks, scroll depth and time on page for the whole site (see lib/analytics.js).
// Shows nothing. To keep a button's text out of the records, give it (or a parent) data-track="off".
// data-track-label="..." replaces the recorded text.

function clickLabel(el) {
  const own = el.getAttribute('data-track-label');
  if (own) return own.slice(0, 100);
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.slice(0, 100);
  const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 100) || el.tagName.toLowerCase();
}

function clickTarget(el) {
  const href = el.getAttribute('href');
  if (!href) return null;
  try {
    const u = new URL(href, window.location.href);
    return (u.host === window.location.host ? u.pathname : `${u.host}${u.pathname}`).slice(0, 300);
  } catch {
    return null;
  }
}

export default function SiteTracker() {
  const pathname = usePathname();

  // Keep the signed-in token so events carry the account (used to tie visits to purchases).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAnalyticsToken(data?.session?.access_token));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAnalyticsToken(s?.access_token));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // One page view per page, then scroll depth and time when the visitor leaves it.
  useEffect(() => {
    const started = Date.now();
    const here = window.location.pathname.slice(0, 300);
    let maxScroll = 0;
    let sent = false;
    const measure = () => {
      const doc = document.documentElement;
      const total = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.round(Math.min(1, window.scrollY / total) * 100);
      if (doc.scrollHeight <= window.innerHeight + 4) maxScroll = 100;
      else if (pct > maxScroll) maxScroll = pct;
    };
    const leave = () => {
      if (sent) return;
      sent = true;
      measure();
      track('page_leave', { path: here, scroll_pct: maxScroll, duration_ms: Date.now() - started });
      flushNow();
    };
    const onHide = () => { if (document.visibilityState === 'hidden') leave(); };

    track('page_view', { props: { title: document.title.slice(0, 120) } });
    const t = setTimeout(measure, 800);
    window.addEventListener('scroll', measure, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', leave);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', measure);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [pathname]);

  // Every click on a link or button (never what is typed in a field).
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target?.closest?.('a, button, [role="button"], summary, input[type="submit"], input[type="checkbox"], input[type="radio"], [data-track-label]');
      if (!el || el.closest('[data-track="off"]')) return;
      const isField = el.tagName === 'INPUT';
      track('click', {
        label: isField ? (el.getAttribute('aria-label') || el.id || el.type) : clickLabel(el),
        target: clickTarget(el),
      });
      if (el.tagName === 'A' && el.getAttribute('target') !== '_blank') flushNow();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
