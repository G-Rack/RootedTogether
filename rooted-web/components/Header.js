'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';
import { initialsFor } from '@/lib/roles';
import { avatarUrl } from '@/lib/storage';

// Purpose-based instead of listing offering types: the homepage already has
// filter pills (All / Course / Ebook / Daily Routine / 1:1 Call) right above
// the offerings grid, so repeating a few of those types up here just
// duplicated that control — and had drifted out of sync with it (missing
// Daily Routines entirely).
const NAV_LINKS = [
  { href: '/', label: 'Marketplace' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '/login?tab=signup', label: 'For Creators' },
];

export default function Header() {
  const { session, profile, isCreator, avatarPath, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const avatar = avatarUrl(avatarPath);
  const [menuOpen, setMenuOpen] = useState(false);
  // Close the mobile menu whenever the route changes (back/forward nav,
  // programmatic redirects, etc) — adjusted during render per React's
  // guidance, rather than in an effect, to avoid an extra render pass.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  };

  return (
    <div style={{ position: 'relative', background: 'var(--white)', borderBottom: '1px solid rgba(107,66,38,0.1)' }}>
      <div
        className="section-x"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '76px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <Link href="/" className="serif" style={{ fontSize: isHome ? 21 : 19, fontWeight: 700, color: 'var(--brown)' }}>
            Rooted Together
          </Link>
          {isHome && (
            <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {NAV_LINKS.map((l) => (
                <Link key={l.label} href={l.href} style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="desktop-auth-actions" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!session && (
            <>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Log In
              </Link>
              {isHome ? (
                <Link href="/login?tab=signup" className="btn btn-outline btn-small">Sign Up</Link>
              ) : null}
              <Link href="/login?tab=signup" className="btn btn-primary btn-small">
                {isHome ? 'Become a Creator' : 'Sign Up'}
              </Link>
            </>
          )}

          {session && (
            <>
              <button
                onClick={handleSignOut}
                style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-soft)' }}
              >
                Log out
              </button>
              {/* Was a plain non-clickable <div> for non-creators (seekers,
                  assistants) — meaning there was no way back to the profile
                  flow after "Skip for now" except typing the URL. Now it
                  always links somewhere useful: creators to their dashboard,
                  everyone else to their read-only profile (which itself
                  links to /complete-profile via "Edit profile"). */}
              <Link
                href={isCreator ? '/dashboard' : '/my-profile'}
                className={avatar ? undefined : 'avatar'}
                style={
                  avatar
                    ? { width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }
                    : { width: 34, height: 34, fontSize: 13 }
                }
                title={isCreator ? 'Go to your creator dashboard' : 'My profile'}
              >
                {!avatar && initialsFor(profile?.full_name || session.user.email)}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: a single hamburger toggles a dropdown with everything
            the desktop row shows split across nav links + auth actions. */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{ display: 'none', background: 'none', border: 'none', padding: 8, marginRight: -8 }}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div
          className="mobile-menu-panel"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 4,
            padding: '8px 16px 20px',
            borderTop: '1px solid rgba(107,66,38,0.1)',
            background: 'var(--white)',
          }}
        >
          {isHome && NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, padding: '12px 4px', borderBottom: '1px solid rgba(107,66,38,0.06)' }}
            >
              {l.label}
            </Link>
          ))}

          {!session ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn btn-outline">Log In</Link>
              <Link href="/login?tab=signup" onClick={() => setMenuOpen(false)} className="btn btn-primary">
                {isHome ? 'Become a Creator' : 'Sign Up'}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                <div
                  className={avatar ? undefined : 'avatar'}
                  style={
                    avatar
                      ? { width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }
                      : { width: 32, height: 32, fontSize: 12 }
                  }
                >
                  {!avatar && initialsFor(profile?.full_name || session.user.email)}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
                  {profile?.full_name || session.user.email}
                </span>
              </div>
              {isCreator ? (
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="btn btn-outline">
                  Creator Dashboard
                </Link>
              ) : (
                <Link href="/my-profile" onClick={() => setMenuOpen(false)} className="btn btn-outline">
                  My Profile
                </Link>
              )}
              <button onClick={handleSignOut} className="btn btn-outline">Log out</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
