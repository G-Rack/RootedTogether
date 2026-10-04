'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { initialsFor, ROLE_LABELS } from '@/lib/roles';

// Mothers/Pastors/Leaders have the full creator dashboard (app/dashboard/layout.js);
// Seekers and Assistants get this smaller account shell instead — same visual
// pattern (sidebar + content, reusing the .dashboard-* classes from
// globals.css), scoped to the two roles that don't sell anything.
const SUPPORTED_ROLES = new Set(['seeker', 'assistant']);

const NAV = [
  {
    href: '/my-profile',
    label: 'Profile',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    ),
  },
  {
    href: '/my-profile/growth',
    label: 'Growth',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
      </svg>
    ),
  },
  {
    href: '/my-profile/purchases',
    label: 'Purchases',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 7h12l1 13H5L6 7z" /><path d="M9 10V6a3 3 0 016 0v4" />
      </svg>
    ),
  },
  {
    href: '/my-profile/settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.36.22.75.22 1.15" />
      </svg>
    ),
  },
];

export default function MyProfileLayout({ children }) {
  const { session, profile, loading, signOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (profile && !SUPPORTED_ROLES.has(profile.role)) {
      // Mothers/Pastors/Leaders belong in the real dashboard, not here.
      router.replace('/dashboard');
    }
  }, [loading, session, profile, router]);

  if (loading || !session || (profile && !SUPPORTED_ROLES.has(profile.role))) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  const activeLabel = NAV.find((item) => item.href === pathname)?.label || 'My Profile';

  return (
    <div className="dashboard-shell" style={{ display: 'flex', minHeight: 'calc(100vh - 76px)' }}>
      <div className="dashboard-mobile-bar">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{ background: 'none', border: 'none', padding: 8, marginLeft: -8, display: 'flex' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--brown)' }}>{activeLabel}</div>
        <div style={{ width: 22 }} />
      </div>

      <div className={`dashboard-scrim${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div
        className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{
          width: 240,
          flexShrink: 0,
          background: 'var(--white)',
          borderRight: '1px solid rgba(107,66,38,0.1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
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
          <div className="avatar" style={{ width: 38, height: 38, fontSize: 14 }}>
            {initialsFor(profile?.full_name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || session.user.email}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>{ROLE_LABELS[profile?.role] || 'Member'}</div>
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
            const active = pathname === item.href;
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
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
            ← Back to marketplace
          </Link>
          <button
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
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
