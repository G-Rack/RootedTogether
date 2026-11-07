'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { INTRO_GUIDES } from '@/lib/academy';

// Free for every creator (Pro or not): the intro video to the creator hub, in two versions.
export default function GettingStartedPage() {
  const { session, isPro } = useSession();
  const [urls, setUrls] = useState(null); // guide key -> signed url, for videos that exist
  const [pick, setPick] = useState('grace');

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    async function load() {
      const found = {};
      await Promise.all(INTRO_GUIDES.map(async (g) => {
        const { data } = await supabase.storage.from('pro-academy').createSignedUrl(g.path, 3600);
        if (data?.signedUrl) found[g.key] = data.signedUrl;
      }));
      if (!active) return;
      setUrls(found);
      setPick((cur) => (found[cur] ? cur : (INTRO_GUIDES.find((g) => found[g.key])?.key || cur)));
    }
    load();
    return () => { active = false; };
  }, [session]);

  const available = urls ? INTRO_GUIDES.filter((g) => urls[g.key]) : [];
  const current = urls?.[pick];

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>Getting started</div>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 640 }}>
        A five-minute tour of your creator hub and how to sell your first product, in a way that feels like serving people instead of pushing them. Free for every creator.
      </div>

      {available.length > 1 && (
        <div role="group" aria-label="Choose your guide" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 22 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>Choose your guide</span>
          {available.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setPick(g.key)}
              aria-pressed={pick === g.key}
              className={pick === g.key ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden', padding: 0, marginTop: 16 }}>
        <div style={{ background: '#2E1B10', aspectRatio: '16 / 9', maxHeight: 540, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {urls === null ? (
            <div className="skeleton" style={{ width: '100%', height: '100%' }} />
          ) : current ? (
            <video key={pick} src={current} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', background: '#000' }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#FBF6EF', padding: 24 }}>
              <div className="serif" style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700 }}>Getting started</div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>The video is coming soon.</div>
            </div>
          )}
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--gold)' }}>INTRO VIDEO · 5 MINUTES</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brown)', marginTop: 4 }}>Sell more from your storefront</div>
          <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6, maxWidth: 680 }}>
            Five simple steps to sell your first product, and your tenth.
          </div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 30 }}>Your next steps</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <Link href="/dashboard/branding" className="btn btn-outline btn-small">Set up your storefront</Link>
        <Link href="/dashboard/upload" className="btn btn-primary btn-small">Upload your first product</Link>
        <Link href="/dashboard/promote/studio" className="btn btn-outline btn-small">Make a post in the Creative hub</Link>
      </div>

      <div className="card" style={{ padding: '18px 22px', marginTop: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{isPro ? 'Go deeper in the Academy' : 'Want the worksheet and action steps?'}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {isPro
              ? 'The Academy lesson adds the Starter Kit template and five small actions to take this week.'
              : 'The Academy lesson adds the Starter Kit template and five small actions. It is part of Creator Pro.'}
          </div>
        </div>
        <Link href="/dashboard/academy" className="btn btn-outline btn-small">{isPro ? 'Open the Academy' : 'See the Academy'}</Link>
      </div>
    </div>
  );
}
