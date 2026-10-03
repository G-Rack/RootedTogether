'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { avatarUrl } from '@/lib/storage';
import { initialsFor, ROLE_LABELS } from '@/lib/roles';

const PRAYER_TYPES = [
  { id: 'healing', label: 'Healing' },
  { id: 'guidance', label: 'Guidance & Direction' },
  { id: 'gratitude', label: 'Gratitude & Thanksgiving' },
  { id: 'family', label: 'Family & Relationships' },
  { id: 'provision', label: 'Provision & Finances' },
  { id: 'breakthrough', label: 'Breakthrough' },
  { id: 'peace', label: 'Peace & Rest' },
  { id: 'grief', label: 'Grief & Comfort' },
  { id: 'protection', label: 'Protection' },
  { id: 'strength', label: 'Strength & Perseverance' },
];

const PRAYER_PACKAGES = [
  { id: 'single', name: 'Single Prayer', price: '$5', desc: 'One dedicated prayer, prayed over within 24 hours.' },
  { id: 'week', name: '7 Days of Prayer', price: '$25', desc: 'A dedicated prayer lifted up for you, every day for a week.', badge: 'Most chosen' },
  { id: 'month', name: '30 Days of Prayer', price: '$75', desc: 'A full month of committed, daily prayer over what matters most to you.' },
];

const MEDITATION_TYPES = [
  { id: 'peace', label: 'Peace & Calm' },
  { id: 'love', label: 'Love' },
  { id: 'provision', label: 'Provision' },
  { id: 'healing', label: 'Healing' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'anxiety', label: 'Anxiety Relief' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'strength', label: 'Strength' },
  { id: 'breakthrough', label: 'Breakthrough' },
  { id: 'grief', label: 'Grief & Comfort' },
];

const MEDITATION_PACKAGES = [
  { id: 'single', name: 'Single Guided Meditation', price: '$8', desc: 'One personalized guided meditation, recorded just for you.' },
  { id: 'week', name: '7-Day Meditation Series', price: '$30', desc: 'A short guided meditation delivered daily for a week.', badge: 'Most chosen' },
  { id: 'month', name: '30-Day Meditation Journey', price: '$90', desc: 'A full month of daily guided meditations built around what you need most.' },
];

const SERVICE_CONFIG = {
  prayer: {
    title: 'Daily Prayer Request',
    subtitle: (name) => `Share what’s on your heart, and ${name} will hold it in prayer personally — as a one-time request, or over several days.`,
    hasForWhom: true,
    detailsLabel: 'What’s on your heart?',
    detailsPlaceholder: (name) => `Share as much or as little as you'd like… ${name} reads every word before praying.`,
    typesLabel: 'What would you like prayer for?',
    types: PRAYER_TYPES,
    packagesLabel: 'Choose a prayer package',
    packages: PRAYER_PACKAGES,
    submitLabel: 'Send Prayer Request',
    confirm: (name) => `Your prayer request is on its way to ${name}. You'll hear back soon.`,
  },
  meditation: {
    title: 'Request a Guided Meditation',
    subtitle: (name) => `Tell ${name} what you need, and they'll guide you through a meditation built around exactly that — once, or as a series.`,
    hasForWhom: false,
    detailsLabel: 'What would you like this meditation centered on?',
    detailsPlaceholder: () => "Tell them what's weighing on you, or what you're hoping to feel more of…",
    typesLabel: 'What’s this meditation for?',
    types: MEDITATION_TYPES,
    packagesLabel: 'Choose a meditation package',
    packages: MEDITATION_PACKAGES,
    submitLabel: 'Request Meditation',
    confirm: (name) => `Your meditation request is on its way to ${name}. You'll hear back soon.`,
  },
  special: {
    title: 'Send a Special Request',
    badge: 'Private request',
    subtitle: (name) => `Something specific on your heart that doesn't fit Daily Prayers or Meditation? Send ${name} a private request — it will show up directly in their app inbox.`,
    hasForWhom: false,
    detailsLabel: 'What would you like to ask?',
    detailsPlaceholder: () => "Share whatever's on your heart — they'll read this personally and respond in the app.",
    typesLabel: null,
    types: [],
    packagesLabel: null,
    packages: [],
    submitLabel: 'Send Request',
    confirm: (name) => `Your request has been sent to ${name}'s app inbox. You'll hear back soon.`,
  },
};

export default function ServiceRequestForm({ serviceKey }) {
  const { handle } = useParams();
  const [storefront, setStorefront] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [forWhom, setForWhom] = useState('myself');
  const [selectedTypes, setSelectedTypes] = useState({});
  const [selectedPackage, setSelectedPackage] = useState('week');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: sf } = await supabase.from('creator_storefronts').select('*').eq('handle', handle).maybeSingle();
      if (!active) return;
      if (!sf) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStorefront(sf);
      const { data: prof } = await supabase.from('creator_public_profiles').select('*').eq('auth_user_id', sf.auth_user_id).maybeSingle();
      if (!active) return;
      setProfile(prof || null);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [handle]);

  const config = SERVICE_CONFIG[serviceKey];

  const toggleType = (id) => {
    setSelectedTypes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingBlock: '48px' }}>
        <div className="skeleton" style={{ height: 220 }} />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="container" style={{ paddingBlock: '96px', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--brown)' }}>
          We couldn&rsquo;t find that storefront.
        </div>
      </div>
    );
  }

  const avatar = avatarUrl(storefront.avatar_path);
  const firstName = profile.name.split(' ')[0];

  return (
    <div style={{ background: 'var(--cream)' }}>
      <div className="container" style={{ maxWidth: 760, paddingBlock: '32px 110px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, flexWrap: 'wrap', gap: 10 }}>
          <a href={`/creator/${handle}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
            &larr; Back to {profile.name}
          </a>
          <a href="/" className="serif" style={{ fontSize: 15, fontWeight: 700, color: 'var(--brown)' }}>
            Rooted Together
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          {avatar ? (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                flexShrink: 0,
                background: `center / cover no-repeat url(${avatar})`,
              }}
            />
          ) : (
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
              {initialsFor(profile.name)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{profile.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>{ROLE_LABELS[profile.role] || profile.role}</div>
          </div>
        </div>

        {config.badge && <span className="badge" style={{ marginBottom: 14 }}>{config.badge}</span>}

        <div className="serif" style={{ fontSize: 30, fontWeight: 700, color: 'var(--brown)', marginBottom: 8, lineHeight: 1.2 }}>
          {config.title}
        </div>
        <div className="muted" style={{ fontSize: 14, maxWidth: 580, lineHeight: 1.55, marginBottom: 28 }}>
          {config.subtitle(firstName)}
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          {!config.badge && (
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 16 }}>
              Your details
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label className="field-label">Your name</label>
            <input className="input-field" type="text" placeholder="e.g. Maria Chen" />
          </div>

          {config.hasForWhom && (
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Who is this prayer for?</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setForWhom('myself')}
                  className={forWhom === 'myself' ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
                >
                  Myself
                </button>
                <button
                  type="button"
                  onClick={() => setForWhom('someone-else')}
                  className={forWhom === 'someone-else' ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}
                >
                  Someone else
                </button>
              </div>
            </div>
          )}

          {config.hasForWhom && forWhom === 'someone-else' && (
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Their name</label>
              <input className="input-field" type="text" placeholder={`Who should ${firstName} be praying for?`} />
            </div>
          )}

          <div>
            <label className="field-label">{config.detailsLabel}</label>
            <textarea
              className="input-field"
              rows={config.types.length ? 4 : 6}
              placeholder={config.detailsPlaceholder(firstName)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {config.types.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 6 }}>
              {config.typesLabel}
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>Choose as many as apply.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              {config.types.map((t) => {
                const selected = !!selectedTypes[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: selected ? '1px solid var(--brown)' : '1px solid rgba(107,66,38,0.18)',
                      background: selected ? 'var(--brown)' : 'var(--white)',
                      color: selected ? 'var(--white)' : 'var(--text)',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {config.packages.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--brown-light)', marginBottom: 14 }}>
              {config.packagesLabel}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
              {config.packages.map((p) => {
                const selected = selectedPackage === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPackage(p.id)}
                    className="card"
                    style={{
                      padding: 18,
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: selected ? '1.5px solid var(--brown)' : '1px solid rgba(107,66,38,0.12)',
                      background: selected ? 'var(--cream-dark)' : 'var(--white)',
                    }}
                  >
                    {p.badge && <span className="badge" style={{ marginBottom: 10 }}>{p.badge}</span>}
                    <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{p.price}</div>
                    <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button type="button" onClick={() => setSubmitted(true)} disabled={submitted} className="btn btn-primary">
          {submitted ? 'Sent' : config.submitLabel}
        </button>
        <div className="muted" style={{ fontSize: 12, marginTop: 10, maxWidth: 460, lineHeight: 1.5 }}>
          This sends your request straight to {firstName} &mdash; nothing is charged until they accept it.
        </div>

        {submitted && (
          <div className="success-banner" style={{ marginTop: 20, maxWidth: 460 }}>
            {config.confirm(firstName)}
          </div>
        )}
      </div>
    </div>
  );
}
