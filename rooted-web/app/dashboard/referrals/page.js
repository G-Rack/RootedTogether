'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { formatPrice } from '@/lib/roles';
import { ONBOARDING_URL } from '@/lib/config';

// Tier lookup against the fetched `referral_tiers` rows. The DB is the source
// of truth, so thresholds and rates can change without a code deploy.
function tierForCount(tiers, count) {
  if (!tiers.length || count < tiers[0].min_referrals) return null;
  return (
    tiers.find((t) => count >= t.min_referrals && (t.max_referrals == null || count <= t.max_referrals)) ||
    tiers[tiers.length - 1]
  );
}

const STEPS = [
  { title: 'Share your link', body: 'Send it to anyone who would love Rooted Together. Your code is built into the link.' },
  { title: 'They sign up', body: 'When they create an account from your link, they are connected to you automatically. Nothing to type.' },
  { title: 'You earn', body: 'Whenever someone you onboarded buys on the marketplace, you earn a cut of the sale.' },
];

export default function ReferralsPage() {
  const { session } = useSession();
  const [tiers, setTiers] = useState([]);
  const [referralCode, setReferralCode] = useState(null);
  const [referredCount, setReferredCount] = useState(0);
  const [earningsCents, setEarningsCents] = useState(0);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  // Referral links are for approved members only: null = never applied, then pending / approved / declined.
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    async function load() {
      const [tiersRes, codeRes, summaryRes, earningsRes, statusRes] = await Promise.all([
        supabase.from('referral_tiers').select('*').order('sort_order', { ascending: true }),
        supabase.rpc('get_my_referral_code'),
        supabase.rpc('get_my_referral_summary'),
        supabase
          .from('referral_earnings')
          .select('*')
          .eq('referrer_auth_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.rpc('get_my_referral_status'),
      ]);
      if (!active) return;
      setStatus(statusRes.data || null);
      setTiers(tiersRes.data || []);
      setReferralCode(codeRes.data || null);
      const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
      setReferredCount(summary?.referred_count || 0);
      setEarningsCents(summary?.earnings_cents || 0);
      setRecent(earningsRes.data || []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [session]);

  // Built from the current origin so it never goes stale if the domain changes.
  const referralLink = referralCode
    ? `${ONBOARDING_URL}/?ref=${encodeURIComponent(referralCode)}`
    : null;
  const currentTier = tierForCount(tiers, referredCount);
  const currentTierIndex = currentTier ? tiers.indexOf(currentTier) : -1;
  const nextTier = currentTierIndex >= 0 ? tiers[currentTierIndex + 1] : tiers[0];

  const shareText = 'Join me on Rooted Together, the home for spiritual mothers, pastors and leaders.';
  const enc = encodeURIComponent;
  const shares = referralLink
    ? [
        { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${shareText} ${referralLink}`)}` },
        { label: 'Email', href: `mailto:?subject=${enc('Join me on Rooted Together')}&body=${enc(`${shareText}\n\n${referralLink}`)}` },
        { label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(referralLink)}` },
        { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(referralLink)}` },
      ]
    : [];

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable. The link is still visible to select by hand.
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  if (status !== 'approved') {
    return <ReferralGate status={status} setStatus={setStatus} tiers={tiers} />;
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        Referrals
      </div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, maxWidth: 640 }}>
        Bring new people onto Rooted Together. When someone you onboarded makes a purchase on the marketplace, you earn a cut.
        The more people you onboard, the higher your rate.
      </div>

      {/* Link card */}
      <div style={{ background: 'var(--brown)', borderRadius: 20, padding: '26px 26px 24px', color: 'var(--white)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
          Your referral link
        </div>
        <div
          style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 14,
            overflowWrap: 'anywhere',
            minHeight: 46,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {referralLink || 'Your link is created automatically. Refresh this page if it is empty right after signing up.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={copyLink}
            disabled={!referralLink}
            className="btn"
            style={{ background: 'var(--white)', color: 'var(--brown)' }}
          >
            {copied ? 'Link copied!' : 'Copy link'}
          </button>
          {shares.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ border: '1px solid rgba(255,255,255,0.45)', color: 'var(--white)' }}
            >
              {s.label}
            </a>
          ))}
        </div>
        {referralCode && (
          <div style={{ marginTop: 16, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
            Your personal code is <strong style={{ color: 'var(--white)', letterSpacing: 0.4 }}>{referralCode}</strong>. It is already inside your link, so people never have to type it.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="responsive-3col" style={{ '--col-gap': '16px', marginBottom: 28 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="muted" style={{ fontSize: 12 }}>Referral earnings</div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
            {formatPrice(earningsCents)}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Test mode. No real charges have occurred.</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="muted" style={{ fontSize: 12 }}>People you&rsquo;ve onboarded</div>
          <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>{referredCount}</div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="muted" style={{ fontSize: 12 }}>Current tier</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)', marginTop: 6 }}>
            {currentTier ? `${currentTier.name} · ${currentTier.rate_percent}%` : 'Not started'}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>How it works</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s.title} className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown-light)' }}>{i + 1}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.body}</div>
          </div>
        ))}
      </div>

      {/* Tiers */}
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Tiers &amp; milestones</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 10 }}>
        {tiers.map((tier) => {
          const isCurrent = tier === currentTier;
          const isReached = currentTier && tiers.indexOf(tier) < currentTierIndex;
          return (
            <div
              key={tier.name}
              className="card"
              style={{
                padding: '14px 16px',
                border: isCurrent ? '1.5px solid var(--brown)' : undefined,
                background: isCurrent ? 'var(--cream-dark)' : undefined,
              }}
            >
              <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--brown)' }}>{tier.name}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{tier.rate_percent}%</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                {tier.max_referrals == null ? `${tier.min_referrals}+ onboarded` : `${tier.min_referrals}–${tier.max_referrals} onboarded`}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: isReached ? 'var(--success-text)' : isCurrent ? 'var(--brown)' : 'var(--text-soft)' }}>
                {isReached ? '✓ Reached' : isCurrent ? 'You are here' : 'Locked'}
              </div>
            </div>
          );
        })}
      </div>
      {nextTier && (
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 32 }}>
          {Math.max(nextTier.min_referrals - referredCount, 0)} more onboarded to reach {nextTier.name} ({nextTier.rate_percent}%).
        </div>
      )}

      {/* Recent earnings */}
      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Recent referral earnings</div>
      {recent.length === 0 ? (
        <div className="card" style={{ padding: 18 }}>
          <div className="muted" style={{ fontSize: 13 }}>No referral earnings yet. Share your link to get started.</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {recent.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid rgba(107,66,38,0.08)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.referred_name} bought {r.offering_title}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>
                  {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {formatPrice(r.sale_cents)} sale · {r.rate_percent}% cut
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brown)', flexShrink: 0, paddingLeft: 10 }}>
                +{formatPrice(r.cut_cents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// What a creator sees until their referral application has been approved. No link is generated
// for them: get_my_referral_code only returns a code once we have approved the application.
function ReferralGate({ status, setStatus, tiers }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('apply_for_referral_program', { p_message: message });
    setBusy(false);
    if (err) {
      setError("We couldn't send your application. Please try again in a moment.");
      return;
    }
    setStatus(data || 'pending');
  };

  return (
    <div style={{ maxWidth: 920 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        Referral program
      </div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, maxWidth: 640 }}>
        Invite people onto Rooted Together and earn a cut when they buy on the marketplace. The program is open to approved members.
        Apply below and, once we approve you, your personal referral link appears here.
      </div>

      <div className="card" style={{ padding: '22px 22px 20px', marginBottom: 28, border: '1px solid var(--success-border)' }}>
        {status === 'pending' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)' }}>Application received</span>
              <span className="badge">Under review</span>
            </div>
            <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>
              Thank you. We review every application by hand. Once you are approved, your referral link is created and shows up on this page.
            </div>
          </>
        )}
        {status === 'declined' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)' }}>Not approved at this time</div>
            <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>
              We are not able to open the referral program to your account right now. Write to admin@rootedtogether.club if you would like to talk it through, or apply again below.
            </div>
          </>
        )}
        {(status === null || status === 'declined') && (
          <form onSubmit={apply} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: status === 'declined' ? 16 : 0 }}>
            {status === null && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)' }}>Apply to the referral program</div>}
            <label htmlFor="ref-msg" className="muted" style={{ fontSize: 13 }}>
              How would you share Rooted Together with your community? (optional)
            </label>
            <textarea
              id="ref-msg"
              className="input-field"
              rows={4}
              maxLength={1000}
              placeholder="For example: I lead a congregation of about 300 and share with them every week."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && <div className="error-banner" style={{ fontSize: 12.5 }}>{error}</div>}
            <div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Apply to the referral program'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>How it works</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { title: 'Apply and get approved', body: 'Tell us how you would share Rooted Together. We review each application.' },
          ...STEPS,
        ].map((st, i) => (
          <div key={st.title} className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown-light)' }}>{i + 1}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{st.title}</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{st.body}</div>
          </div>
        ))}
      </div>

      {tiers.length > 0 && (
        <>
          <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', marginBottom: 12 }}>Tiers &amp; milestones</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {tiers.map((tier) => (
              <div key={tier.name} className="card" style={{ padding: '14px 16px' }}>
                <div className="serif" style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--brown)' }}>{tier.name}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{tier.rate_percent}%</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  {tier.max_referrals == null ? `${tier.min_referrals}+ onboarded` : `${tier.min_referrals}–${tier.max_referrals} onboarded`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
