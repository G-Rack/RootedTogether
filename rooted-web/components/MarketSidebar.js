'use client';

import Link from 'next/link';
import TypeIcon from '@/components/TypeIcon';
import { OFFERING_TYPES } from '@/lib/offeringTypes';
import { initialsFor } from '@/lib/roles';
import { ONBOARDING_URL } from '@/lib/config';

// The signed-in marketplace's left navigation. Desktop: a fixed dark column.
// Phone: the same content as a slide-over drawer (open/onClose come from the page).
export default function MarketSidebar({ filter, onFilter, open, onClose, session, profile, isCreator, avatar, onSignOut }) {
  const name = profile?.full_name || session.user.email;
  const pick = (type) => {
    onFilter(type);
    onClose();
  };

  return (
    <>
      <div className={`home-scrim${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`home-sidebar${open ? ' open' : ''}`} aria-label="Marketplace menu">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Link href="/" onClick={() => pick('all')} className="serif rt-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', fontWeight: 700, fontSize: 21, color: '#FBF6EF' }}>
            <span className="rt-mark">RT</span>
            Rooted Together
          </Link>
          <button type="button" className="home-sidebar-close" onClick={onClose} aria-label="Close menu">
            <TypeIcon name="close" size={20} />
          </button>
        </div>

        <nav aria-label="Marketplace" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button type="button" className={`home-nav-link${filter === 'all' ? ' is-active' : ''}`} aria-current={filter === 'all' ? 'page' : undefined} onClick={() => pick('all')}>
            <TypeIcon name="home" />
            Marketplace
          </button>
          <a href="#creators" className="home-nav-link" onClick={onClose}>
            <TypeIcon name="creators" />
            Creators
          </a>
        </nav>

        <nav aria-label="Offering types" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ padding: '0 12px 8px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C8923F' }}>Offerings</div>
          {OFFERING_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`home-nav-link${filter === t.key ? ' is-active' : ''}`}
              aria-current={filter === t.key ? 'page' : undefined}
              onClick={() => pick(t.key)}
            >
              <TypeIcon name={t.key} />
              {t.plural}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ borderRadius: 20, background: 'rgba(251,246,239,.08)', padding: 16 }}>
          {isCreator ? (
            <>
              <div className="serif" style={{ fontWeight: 700, fontSize: 17, color: '#FBF6EF' }}>Your creator dashboard</div>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>Manage your offerings, payouts and storefront.</p>
              <Link href="/dashboard" className="home-promo-btn">Open dashboard</Link>
            </>
          ) : (
            <>
              <div className="serif" style={{ fontWeight: 700, fontSize: 17, color: '#FBF6EF' }}>Share what God has given you</div>
              <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>Open your own storefront with a one-time $49 membership.</p>
              <a href={ONBOARDING_URL} target="_blank" rel="noopener noreferrer" className="home-promo-btn">Become a Creator</a>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px 0', borderTop: '1px solid rgba(232,205,168,.22)' }}>
          <Link href={isCreator ? '/dashboard' : '/my-profile'} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, minHeight: 44 }}>
            <span
              className={avatar ? undefined : 'avatar'}
              style={
                avatar
                  ? { width: 40, height: 40, borderRadius: 999, flexShrink: 0, border: '1.5px solid #C8923F', background: `center / cover no-repeat url(${avatar})` }
                  : { width: 40, height: 40, fontSize: 15, border: '1.5px solid #C8923F' }
              }
            >
              {!avatar && initialsFor(name)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600, color: '#FBF6EF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#E8CDA8' }}>{isCreator ? 'Creator dashboard' : 'My profile'}</span>
            </span>
          </Link>
          <button type="button" className="home-logout" onClick={onSignOut} aria-label="Log out">
            <TypeIcon name="logout" />
          </button>
        </div>
      </aside>
    </>
  );
}
