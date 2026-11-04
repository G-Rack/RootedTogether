'use client';

import Link from 'next/link';
import OfferingCard from '@/components/OfferingCard';
import TypeIcon from '@/components/TypeIcon';
import { OFFERING_TYPES } from '@/lib/offeringTypes';
import { OFFERING_TYPE_LABELS, initialsFor } from '@/lib/roles';
import { avatarUrl } from '@/lib/storage';
import { ONBOARDING_URL } from '@/lib/config';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
];

const REASSURANCE = [
  { text: 'Free to browse and free to join', icon: <path d="M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z" /> },
  { text: 'Secure card checkout with Stripe', icon: (<><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15h4" /></>) },
  { text: 'Instant access after you buy', icon: <path d="M13 2L4 14h7l-1 8 9-12h-7z" /> },
  { text: 'Everything you get stays in your library', icon: <path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v16l-8-4-8 4z" /> },
];

const STEPS = [
  { title: 'Browse and choose', body: 'Look around as long as you like. No account is needed to see what creators offer.' },
  { title: 'Create a free account', body: 'Just your name, email, date of birth and a password. There is no membership fee to buy.' },
  { title: 'Pay and get it instantly', body: 'Pay by card, or take a free item straight away. It waits for you in your library.' },
];

const AVATAR_TONES = [
  { bg: '#6B4226', ink: '#FBF6EF' },
  { bg: '#2E1B10', ink: '#E8CDA8' },
  { bg: '#C8923F', ink: '#2E1B10' },
  { bg: '#8C6A4A', ink: '#FBF6EF' },
];

const H2 = { margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 'clamp(26px, 3vw, 32px)', letterSpacing: '-0.01em', color: 'var(--text)' };
const EYEBROW = { fontSize: 12.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' };
const WRAP = { maxWidth: 1280, margin: '0 auto', boxSizing: 'border-box', padding: '0 clamp(20px, 4vw, 64px)' };

function Icon({ children, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {children}
    </svg>
  );
}

function goTo(id) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// The home page for someone who is not signed in: a shop window first, with a
// clear free door for buyers and a separate door for creators.
export default function SignedOutHome({
  loading, filter, onFilter, query, setQuery, sort, setSort,
  offerings, allOfferings, creators, profileByAuthId, marketStats, proIds, testimonials,
}) {
  const windowCards = (allOfferings || []).slice(0, 3);

  return (
    <main style={{ background: 'var(--cream)' }}>
      <style>{`
        .so-arch-wrap{flex:1 1 400px;min-width:0;display:flex;justify-content:center}
        @media (max-width: 760px){.so-arch-wrap{display:none}}
        .so-chip:hover{border-color:var(--brown) !important}
        .so-creator:hover .so-creator-name{text-decoration:underline}
      `}</style>

      {/* Hero: search first */}
      <section style={{ ...WRAP, paddingTop: 'clamp(36px, 6vw, 64px)', paddingBottom: 'clamp(40px, 6vw, 72px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 48 }}>
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          <div style={{ ...EYEBROW, color: 'var(--brown)' }}>The Rooted Together marketplace</div>
          <h1 className="serif" style={{ margin: '16px 0 0', fontWeight: 700, fontSize: 'clamp(36px, 5.2vw, 62px)', lineHeight: 1.06, letterSpacing: '-0.02em', textWrap: 'balance' }}>
            Find guidance, teaching and encouragement rooted in faith.
          </h1>
          <p style={{ margin: '20px 0 0', maxWidth: 560, fontSize: 18, lineHeight: 1.6, color: '#6F5846' }}>
            Courses, audiobooks, printables, templates and 1:1 calls from Spiritual Mothers, Pastors and Leaders. Browse freely, and make a free account when you are ready to get something.
          </p>

          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); goTo('offerings'); }}
            style={{ marginTop: 32, maxWidth: 600, display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 999, background: '#fff', border: '1.5px solid #E8CDA8' }}
          >
            <label htmlFor="so-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search offerings or creators</label>
            <span style={{ marginLeft: 16, color: '#6F5846', display: 'flex' }}><Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Icon></span>
            <input
              id="so-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offerings or creators"
              style={{ flex: 1, minWidth: 0, minHeight: 48, border: 0, background: 'transparent', fontSize: 16, color: 'var(--text)', fontFamily: 'inherit', outlineOffset: 4 }}
            />
            <button type="submit" style={{ minHeight: 48, padding: '0 24px', border: 0, borderRadius: 999, background: 'var(--brown)', color: '#FBF6EF', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Search
            </button>
          </form>

          <div role="group" aria-label="Browse by type" style={{ marginTop: 20, maxWidth: 640, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {OFFERING_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                className="so-chip"
                onClick={() => { onFilter(t.key); goTo('offerings'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 16px', borderRadius: 999, border: '1.5px solid #E8CDA8', background: '#fff', fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ color: 'var(--brown)', display: 'flex' }}><TypeIcon name={t.key} size={17} /></span>
                {t.plural}
              </button>
            ))}
          </div>
        </div>

        {windowCards.length > 0 && (
          <div className="so-arch-wrap">
            <div style={{ position: 'relative', width: 'min(100%, 440px)', height: 480, borderRadius: '220px 220px 32px 32px', background: 'linear-gradient(180deg, #F1E4D3, #E8CDA8)' }}>
              {windowCards.map((o, i) => {
                const meta = OFFERING_TYPES.find((t) => t.key === o.type);
                const pos = [
                  { left: '8%', top: 56, width: '58%' },
                  { right: '6%', top: 190, width: '56%' },
                  { left: '14%', bottom: 34, width: '52%' },
                ][i];
                return (
                  <Link
                    key={o.id}
                    href={`/offering/${o.id}`}
                    style={{ position: 'absolute', ...pos, borderRadius: 20, background: '#fff', border: '1px solid #EADBC8', overflow: 'hidden', boxShadow: '0 14px 30px rgba(46,27,16,0.14)' }}
                  >
                    <div style={{ height: 84, background: meta?.tint || '#F1E4D3', color: meta?.ink || '#6B4226', display: 'grid', placeItems: 'center' }}>
                      <TypeIcon name={o.type} size={32} />
                    </div>
                    <div style={{ padding: '10px 14px 13px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 999, background: '#F1E4D3', color: '#6B4226', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {OFFERING_TYPE_LABELS[o.type] || o.type}
                      </span>
                      <div className="serif" style={{ marginTop: 6, fontWeight: 700, fontSize: 15, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.title}</div>
                      <div style={{ fontSize: 12.5, color: '#6F5846', marginTop: 2 }}>{profileByAuthId[o.creator_auth_id]?.name}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Reassurance for first-time buyers */}
      <section aria-label="Why buy here" style={{ background: '#F1E4D3' }}>
        <div style={{ ...WRAP, paddingBlock: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 28px' }}>
          {REASSURANCE.map((r) => (
            <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, flex: 'none', borderRadius: 14, background: '#fff', color: 'var(--brown)' }}>
                <Icon size={22}>{r.icon}</Icon>
              </span>
              <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{r.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Offerings */}
      <section id="offerings" style={{ ...WRAP, paddingTop: 72, scrollMarginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px' }}>
          <h2 style={H2}>Explore the marketplace</h2>
          {(filter !== 'all' || query) && (
            <button type="button" onClick={() => { onFilter('all'); setQuery(''); }} style={{ minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: 'var(--brown)', fontFamily: 'inherit' }}>
              Show everything
            </button>
          )}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div role="group" aria-label="Filter by type" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', ...OFFERING_TYPES.map((t) => t.key)].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onFilter(t)}
                aria-pressed={filter === t}
                className={filter === t ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
              >
                {t === 'all' ? 'All' : OFFERING_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div style={{ width: 200, maxWidth: '100%' }}>
            <label htmlFor="so-sort" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sort offerings</label>
            <select id="so-sort" className="input-field" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        {query && (
          <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            {offerings.length} {offerings.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          {loading && (
            <div className="grid-cards">
              {[0, 1, 2].map((i) => (<div key={i} className="skeleton" style={{ height: 240 }} />))}
            </div>
          )}
          {!loading && offerings.length === 0 && (
            <div className="muted">{query ? 'Nothing matches your search.' : 'Nothing published in this category yet.'}</div>
          )}
          {!loading && offerings.length > 0 && (
            <div className="grid-cards">
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
        </div>
      </section>

      {/* Creators */}
      {!loading && creators.length > 0 && (
        <section style={{ ...WRAP, paddingTop: 64 }}>
          <h2 style={H2}>Mothers, Pastors &amp; Leaders</h2>
          <div style={{ marginTop: 20, display: 'flex', gap: 28, overflowX: 'auto', padding: '4px 4px 10px' }}>
            {creators.map((s, i) => {
              const c = profileByAuthId[s.auth_user_id];
              const avatar = avatarUrl(s.avatar_path);
              const tone = AVATAR_TONES[i % AVATAR_TONES.length];
              return (
                <Link key={s.auth_user_id} href={`/creator/${s.handle}`} className="so-creator" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 104, flex: 'none', textAlign: 'center' }}>
                  {avatar ? (
                    <span style={{ width: 80, height: 80, borderRadius: 999, border: `3px solid ${proIds.has(s.auth_user_id) ? '#C8923F' : '#EADBC8'}`, background: `center / cover no-repeat url(${avatar})` }} />
                  ) : (
                    <span className="serif" style={{ display: 'grid', placeItems: 'center', width: 80, height: 80, borderRadius: 999, background: tone.bg, color: tone.ink, border: `3px solid ${proIds.has(s.auth_user_id) ? '#C8923F' : '#EADBC8'}`, fontWeight: 700, fontSize: 24 }}>
                      {initialsFor(c?.name)}
                    </span>
                  )}
                  <span className="so-creator-name" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{c?.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* How buying works */}
      <section id="how-it-works" style={{ ...WRAP, paddingTop: 72, scrollMarginTop: 16 }}>
        <div style={{ ...EYEBROW, color: 'var(--brown)' }}>How it works</div>
        <h2 className="serif" style={{ margin: '12px 0 0', fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 42px)', letterSpacing: '-0.015em', textWrap: 'balance' }}>
          Three steps from browsing to having it.
        </h2>
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ padding: 28, borderRadius: 24, background: '#fff', border: '1px solid #EADBC8' }}>
              <span className="serif" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 999, background: 'var(--brown)', color: '#FBF6EF', fontWeight: 700, fontSize: 18 }}>{i + 1}</span>
              <h3 className="serif" style={{ margin: '16px 0 0', fontWeight: 600, fontSize: 22 }}>{s.title}</h3>
              <p style={{ margin: '8px 0 0', fontSize: 15.5, lineHeight: 1.6, color: '#6F5846' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials: only real, approved ones */}
      {testimonials.length > 0 && (
        <section style={{ ...WRAP, paddingTop: 72 }}>
          <h2 style={{ ...H2, textAlign: 'center' }}>What people are saying</h2>
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {testimonials.map((t, i) => (
              <figure key={i} className="card" style={{ margin: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <blockquote style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, fontStyle: 'italic' }}>{t.quote}</blockquote>
                <figcaption className="muted" style={{ fontSize: 12.5 }}>— {t.name}{t.who ? `, ${t.who}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Two doors */}
      <section aria-labelledby="so-doors" style={{ marginTop: 80, background: '#2E1B10' }}>
        <div style={{ ...WRAP, paddingBlock: 72 }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
            <div style={{ ...EYEBROW, color: '#C8923F' }}>Two ways to be part of it</div>
            <h2 id="so-doors" className="serif" style={{ margin: '12px 0 0', fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 42px)', letterSpacing: '-0.015em', color: '#FBF6EF', textWrap: 'balance' }}>
              Here to learn, or here to share?
            </h2>
          </div>
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 'clamp(24px, 3vw, 36px)', borderRadius: 28, background: '#F1E4D3', color: '#2E1B10' }}>
              <span style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: '#fff', color: '#6B4226', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>FOR EVERYONE · FREE</span>
              <h3 className="serif" style={{ margin: 0, fontWeight: 700, fontSize: 30, lineHeight: 1.15 }}>I’m here to learn</h3>
              <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: '#4A3322' }}>
                Buy courses, audiobooks, printables and more, and book 1:1 calls with Spiritual Mothers, Pastors and Leaders. Free to join.
              </p>
              <Link href="/login?tab=signup&path=buyer" className="btn btn-primary" style={{ marginTop: 8, alignSelf: 'flex-start', minHeight: 48 }}>
                Create a free account
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 'clamp(24px, 3vw, 36px)', borderRadius: 28, background: '#3B2517', border: '1px solid rgba(232,205,168,0.28)', color: '#FBF6EF' }}>
              <span style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>FOR CREATORS · $49 ONCE</span>
              <h3 className="serif" style={{ margin: 0, fontWeight: 700, fontSize: 30, lineHeight: 1.15 }}>I want to share what I teach</h3>
              <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: '#E8CDA8' }}>
                Open your own storefront, sell eight kinds of offerings and be paid to your bank through Stripe. Churches and ministries too.
              </p>
              <a href={ONBOARDING_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, padding: '0 28px', borderRadius: 999, background: '#C8923F', color: '#2E1B10', fontSize: 15, fontWeight: 700 }}>
                See how creators earn
                <Icon size={17}><path d="M7 17L17 7M9 7h8v8" /></Icon>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
