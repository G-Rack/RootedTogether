export default function FamilyComingSoonPage() {
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 22 }}>
        Spiritual Family
      </div>

      <div className="card" style={{ padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <div style={{ width: 68, height: 68, borderRadius: 999, background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 11.5L12 4.2l8.5 7.3" />
            <path d="M5.8 10v9a1 1 0 001 1h10.4a1 1 0 001-1v-9" />
            <path d="M9.7 20v-6.2h4.6V20" />
            <circle cx="12" cy="6.4" r="1.2" fill="var(--brown)" stroke="none" />
          </svg>
        </div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)' }}>Managed in the app</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.65, maxWidth: 380 }}>
          Accepting requests, posting to your family, and the mind map all live in the Rooted Together app for now.
          What you mark &ldquo;Free for family&rdquo; on an offering here is already tied to the real family you
          manage there.
        </div>
        <div style={{ background: 'var(--cream-dark)', color: 'var(--brown)', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: '6px 14px', borderRadius: 999, marginTop: 4 }}>
          COMING TO THE WEBSITE
        </div>
      </div>
    </div>
  );
}
