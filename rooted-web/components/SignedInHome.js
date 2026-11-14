'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import MarketSidebar from '@/components/MarketSidebar';
import OfferingCard from '@/components/OfferingCard';
import TypeIcon from '@/components/TypeIcon';
import ProBadge from '@/components/ProBadge';
import { OFFERING_TYPES, OFFERING_TYPE_BY_KEY, SORT_OPTIONS } from '@/lib/offeringTypes';
import { avatarUrl } from '@/lib/storage';
import { initialsFor } from '@/lib/roles';

// Signed-in marketplace home: left sidebar for the offering types, a one-line
// greeting, a row of creators, then the offerings grid. Data and filter state
// live in app/page.js and arrive as props.
export default function SignedInHome({
  loading,
  filter,
  onFilter,
  query,
  setQuery,
  sort,
  setSort,
  offerings,
  creators,
  profileByAuthId,
  marketStats,
  proIds,
}) {
  const { session, profile, isCreator, avatarPath, pictureUrl, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatar = avatarUrl(avatarPath) || pictureUrl;
  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || 'friend';
  const activeType = OFFERING_TYPE_BY_KEY[filter];

  return (
    <div className="home-shell">
      <div className="home-mobile-bar">
        <Link href="/" onClick={() => onFilter('all')} className="serif" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 19, color: 'var(--brown)' }}>
          <span className="rt-mark rt-mark-small">RT</span>
          Rooted Together
        </Link>
        <button type="button" className="home-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-haspopup="true">
          <TypeIcon name="menu" size={22} />
        </button>
      </div>

      <MarketSidebar
        filter={filter}
        onFilter={onFilter}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        session={session}
        profile={profile}
        isCreator={isCreator}
        avatar={avatar}
        onSignOut={signOut}
      />

      <main className="home-main">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px 32px' }}>
          <div>
            <h1 className="serif" style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(26px, 4vw, 32px)', lineHeight: 1.15, letterSpacing: '-.01em' }}>
              Good to see you, {firstName}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-soft)' }}>
              Find your next course, printable, audio teaching or call.
            </p>
          </div>
          <form role="search" onSubmit={(e) => e.preventDefault()} style={{ flex: '1 1 280px', maxWidth: 420, position: 'relative' }}>
            <label htmlFor="home-search" className="sr-only">Search offerings or creators</label>
            <span style={{ position: 'absolute', left: 18, top: 15, display: 'flex', color: 'var(--text-soft)' }}>
              <TypeIcon name="search" size={18} />
            </span>
            <input
              id="home-search"
              type="search"
              className="home-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offerings or creators"
            />
          </form>
        </div>

        {/* Phone only: the sidebar is a drawer, so keep the type filters one swipe away. */}
        <div className="home-pills" role="tablist" aria-label="Offering type">
          {[{ key: 'all', plural: 'All' }, ...OFFERING_TYPES].map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              className={`home-pill${filter === t.key ? ' is-active' : ''}`}
              onClick={() => onFilter(t.key)}
            >
              {t.plural}
            </button>
          ))}
        </div>

        {/* Creators */}
        <div id="creators" style={{ marginTop: 32, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', scrollMarginTop: 24 }}>
          <h2 className="serif" style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Mothers, Pastors &amp; Leaders</h2>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 96, marginTop: 16 }} />
        ) : creators.length === 0 ? (
          <div className="muted" style={{ marginTop: 16 }}>No storefronts yet. Check back soon.</div>
        ) : (
          <div className="home-creators">
            {[...creators]
              .sort((a, b) => (proIds.has(b.auth_user_id) ? 1 : 0) - (proIds.has(a.auth_user_id) ? 1 : 0))
              .map((s) => {
                const c = profileByAuthId[s.auth_user_id];
                const pic = avatarUrl(s.avatar_path);
                const pro = proIds.has(s.auth_user_id);
                return (
                  <Link key={s.auth_user_id} href={`/creator/${s.handle}`} className="home-creator" title={c?.name}>
                    <span
                      className={pic ? undefined : 'avatar'}
                      style={{
                        width: 72,
                        height: 72,
                        fontSize: 22,
                        borderRadius: 999,
                        border: `3px solid ${pro ? '#C8923F' : '#EADBC8'}`,
                        ...(pic ? { background: `center / cover no-repeat url(${pic})` } : {}),
                      }}
                    >
                      {!pic && initialsFor(c?.name)}
                    </span>
                    <span className="home-creator-name">{c?.name}</span>
                    {pro && <ProBadge small />}
                  </Link>
                );
              })}
          </div>
        )}

        {/* Offerings */}
        <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 24px' }}>
          <h2 className="serif" style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
            {activeType ? activeType.plural : 'Explore offerings'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {query && (
              <span className="muted" style={{ fontSize: 13 }}>
                {offerings.length} {offerings.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
              </span>
            )}
            <label htmlFor="home-sort" style={{ fontSize: 14, color: 'var(--text-soft)' }}>Sort by</label>
            <select id="home-sort" className="home-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="home-grid">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 250, borderRadius: 22 }} />)}
          </div>
        )}

        {!loading && offerings.length === 0 && (
          <div className="muted" style={{ marginTop: 20 }}>
            {query ? 'Nothing matches your search.' : 'Nothing published in this category yet.'}
          </div>
        )}

        {!loading && offerings.length > 0 && (
          <div className="home-grid">
            {offerings.map((o) => (
              <OfferingCard
                key={o.id}
                offering={o}
                creatorName={profileByAuthId[o.creator_auth_id]?.name}
                stats={marketStats[o.id]}
                isPro={proIds.has(o.creator_auth_id)}
              />
            ))}
          </div>
        )}

        <div className="home-legal">
          <span>&copy; {new Date().getFullYear()} Rooted Together, Inc.</span>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <a href="mailto:admin@rootedtogether.club">Contact</a>
        </div>
      </main>
    </div>
  );
}
