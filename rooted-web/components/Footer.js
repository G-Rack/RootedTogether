import Link from 'next/link';

export default function Footer() {
  return (
    <div className="section-x" style={{ paddingBlock: '48px 40px', background: 'var(--white)', borderTop: '1px solid rgba(107,66,38,0.1)' }}>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--brown)' }}>Rooted Together</span>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
            A faith-based mentorship community — on the app, and now in the marketplace.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Marketplace</div>
          <Link href="/?type=course" style={{ fontSize: 13.5 }}>Courses</Link>
          <Link href="/?type=ebook" style={{ fontSize: 13.5 }}>Ebooks</Link>
          <Link href="/?type=routine" style={{ fontSize: 13.5 }}>Daily Routines</Link>
          <Link href="/?type=call" style={{ fontSize: 13.5 }}>1:1 Calls</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>For Creators</div>
          <Link href="/login" style={{ fontSize: 13.5 }}>Become a Creator</Link>
          <Link href="/dashboard" style={{ fontSize: 13.5 }}>Creator Dashboard</Link>
          <Link href="/dashboard/payouts" style={{ fontSize: 13.5 }}>Payouts</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Company</div>
          <a href="#" style={{ fontSize: 13.5 }}>Get the App</a>
          <a href="#" style={{ fontSize: 13.5 }}>About</a>
          <a href="#" style={{ fontSize: 13.5 }}>Contact</a>
        </div>
      </div>
      <div
        style={{
          maxWidth: 1280,
          margin: '32px auto 0',
          paddingTop: 20,
          borderTop: '1px solid rgba(107,66,38,0.08)',
          fontSize: 12,
          color: 'var(--text-soft)',
        }}
      >
        © Rooted Together. {new Date().getFullYear()}. All rights reserved.
      </div>
    </div>
  );
}
