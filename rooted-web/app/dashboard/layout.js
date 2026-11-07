'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { initialsFor, ROLE_LABELS } from '@/lib/roles';
import { avatarUrl } from '@/lib/storage';

async function handleLogout(signOut, router) {
  await signOut();
  router.push('/');
}

const NAV = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/offerings',
    label: 'My Offerings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/upload',
    label: 'Upload New',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/dashboard/branding',
    label: 'Branding',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 15l-5-5-9 9" />
      </svg>
    ),
  },
  {
    href: '/dashboard/promote/studio',
    label: 'Creative hub',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/family',
    label: 'Spiritual Family',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/payouts',
    label: 'Payouts & Sales',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/referrals',
    label: 'Referrals',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/academy',
    label: 'Academy',
    pro: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/community',
    label: 'Community',
    pro: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.36.22.75.22 1.15" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }) {
  const { session, profile, isCreator, avatarPath, loading, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const avatar = avatarUrl(avatarPath);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Close the mobile drawer whenever the route changes — adjusted during
  // render per React's guidance, rather than in an effect, to avoid an
  // extra render pass.
  const [sidebarPathname, setSidebarPathname] = useState(pathname);
  if (pathname !== sidebarPathname) {
    setSidebarPathname(pathname);
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!isCreator) {
      router.replace('/');
    }
  }, [loading, session, isCreator, router]);

  if (loading || !session || !isCreator) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  const activeLabel = NAV.find((item) => item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')))?.label || 'Dashboard';

  return (
    <div className="dashboard-shell" style={{ display: 'flex', minHeight: 'calc(100vh - 76px)' }}>
      <div className="dashboard-mobile-bar">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open section menu"
          aria-haspopup="true"
          style={{ background: 'none', border: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700, color: 'var(--brown)', width: '100%' }}
        >
          <span>{activeLabel}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      <div
        className={`dashboard-scrim${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{
          width: 240,
          flexShrink: 0,
          background: 'var(--white)',
          borderRight: '1px solid rgba(107,66,38,0.1)',
          borderTop: '4px solid #C8923F',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0 24px',
        }}
      >
        <div
          style={{
            padding: '0 22px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(107,66,38,0.1)',
            marginBottom: 16,
          }}
        >
          <div
            className={avatar ? undefined : 'avatar'}
            style={
              avatar
                ? { width: 38, height: 38, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }
                : { width: 38, height: 38, fontSize: 14 }
            }
          >
            {!avatar && initialsFor(profile?.full_name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || session.user.email}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>{ROLE_LABELS[profile?.role] || 'Creator'}</div>
          </div>
          <button
            className="dashboard-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            style={{ display: 'none', background: 'none', border: 'none', padding: 4, flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
          {NAV.map((item) => {
            const active = item.href === '/dashboard' ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 12px',
                  borderRadius: 10,
                  background: active ? 'var(--cream-dark)' : 'transparent',
                  color: active ? 'var(--brown)' : 'var(--text-soft)',
                  fontSize: 13.5,
                  fontWeight: active ? 700 : 600,
                }}
              >
                {item.icon}
                {item.label}
                {item.pro && (
                  <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, padding: '2px 6px', borderRadius: 999, background: '#C8923F', color: '#2E1B10' }}>PRO</span>
                )}
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 999, border: '1.5px solid var(--brown)', fontSize: 13.5, fontWeight: 700, color: 'var(--brown)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            Switch to the shop
          </Link>
          <button
            onClick={() => handleLogout(signOut, router)}
            style={{ background: 'none', border: 'none', textAlign: 'left', padding: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="dashboard-content" style={{ flex: 1, padding: '32px 40px', minWidth: 0 }}>{children}</div>
    </div>
  );
}
