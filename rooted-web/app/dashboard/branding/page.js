'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { avatarUrl, bannerUrl, uploadAvatar, uploadBanner } from '@/lib/storage';
import { initialsFor } from '@/lib/roles';
import { SOCIALS, activeSocials, formValue } from '@/lib/socials';

export default function BrandingPage() {
  const { session, profile } = useSession();
  const [storefront, setStorefront] = useState(null);
  const [stats, setStats] = useState({ offerings_count: 0, followers_count: 0 });
  const [loading, setLoading] = useState(true);
  // Lifted so the preview panel updates the moment a new photo uploads,
  // without waiting for the form to be saved.
  const [avatarPath, setAvatarPath] = useState(null);
  const [bannerPath, setBannerPath] = useState(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    async function load() {
      const [{ data: sf }, statsRes, followRes] = await Promise.all([
        supabase.from('creator_storefronts').select('*').eq('auth_user_id', session.user.id).maybeSingle(),
        supabase.rpc('creator_offering_stats', { creator_id: session.user.id }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('followee_auth_id', session.user.id),
      ]);
      if (!active) return;
      setStorefront(sf || null);
      setAvatarPath(sf?.avatar_path || null);
      setBannerPath(sf?.banner_path || null);
      setStats({
        offerings_count: statsRes.data?.[0]?.offerings_count ?? 0,
        followers_count: followRes.count ?? 0,
      });
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <div style={{ maxWidth: 920 }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        Storefront Branding
      </div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 26 }}>
        This is your public page — profile picture, banner, about section, and links.
      </div>

      <div className="responsive-2col" style={{ '--col-a': '1.4fr', '--col-gap': '24px' }}>
        <BrandingForm
          storefront={storefront}
          setStorefront={setStorefront}
          session={session}
          avatarPath={avatarPath}
          setAvatarPath={setAvatarPath}
          bannerPath={bannerPath}
          setBannerPath={setBannerPath}
        />
        <StorefrontPreview storefront={storefront} profile={profile} stats={stats} avatarPath={avatarPath} bannerPath={bannerPath} />
      </div>
    </div>
  );
}

function StorefrontPreview({ storefront, profile, stats, avatarPath, bannerPath }) {
  const banner = bannerUrl(bannerPath);
  const avatar = avatarUrl(avatarPath);
  const name = profile?.full_name || 'Your name';

  return (
    <div className="sticky-panel">
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--gold)', marginBottom: 8 }}>PREVIEW</div>
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          height: 140,
          background: banner ? `center / cover no-repeat url(${banner})` : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
        }}
      />
      <div style={{ padding: '0 18px 18px' }}>
        {avatar ? (
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              border: '3px solid var(--white)',
              marginTop: -42,
              marginBottom: 10,
              background: `center / cover no-repeat url(${avatar})`,
            }}
          />
        ) : (
          <div className="avatar" style={{ width: 84, height: 84, fontSize: 24, border: '3px solid var(--white)', marginTop: -42, marginBottom: 10 }}>
            {initialsFor(name)}
          </div>
        )}
        <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{name}</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
          {storefront?.handle ? `@${storefront.handle}` : 'Choose a handle to publish your storefront'}
        </div>
        {storefront?.tagline && <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 10 }}>{storefront.tagline}</div>}

        {activeSocials(storefront).length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {activeSocials(storefront).map((so) => (
              <span
                key={so.key}
                title={so.label}
                style={{ width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(107,66,38,0.16)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {so.icon}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, padding: '10px 0', borderTop: '1px solid rgba(107,66,38,0.1)', marginTop: 8 }}>
          <Stat value={stats.offerings_count} label="offerings" />
          <Stat value={stats.followers_count} label="followers" />
        </div>

        {storefront?.handle ? (
          <Link href={`/creator/${storefront.handle}`} target="_blank" className="btn btn-outline btn-small" style={{ width: '100%', marginTop: 8 }}>
            View live storefront
          </Link>
        ) : (
          <div className="muted" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
            Save a handle on the left to get your public link.
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

function UploadIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--brown)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

// Same dashed upload button as "Cover image" on the Upload page.
function DashedUpload({ inputRef, accept, onChange, busy, label }) {
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--white)',
          border: '1px dashed var(--brown-pale)',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 13,
          color: 'var(--text-soft)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <UploadIcon />
        {busy ? 'Uploading…' : label}
      </button>
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--brown)' }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

function BrandingForm({ storefront, setStorefront, session, avatarPath, setAvatarPath, bannerPath, setBannerPath }) {
  const [handle, setHandle] = useState(storefront?.handle || '');
  const [tagline, setTagline] = useState(storefront?.tagline || '');
  const [bio, setBio] = useState(storefront?.bio || '');
  const [links, setLinks] = useState(() =>
    Object.fromEntries(SOCIALS.map((so) => [so.key, formValue(so, storefront?.[so.key])]))
  );
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingAvatar(true);
    try {
      const path = await uploadAvatar(file, session.user.id);
      setAvatarPath(path);
    } catch {
      setError("Couldn't upload that photo.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingBanner(true);
    try {
      const path = await uploadBanner(file, session.user.id);
      setBannerPath(path);
    } catch {
      setError("Couldn't upload that image.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    const row = {
      auth_user_id: session.user.id,
      handle: handle.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      tagline,
      bio,
      ...Object.fromEntries(SOCIALS.map((so) => [so.key, so.toValue(links[so.key])])),
      banner_path: bannerPath,
      avatar_path: avatarPath,
      updated_at: new Date().toISOString(),
    };
    const { data, error: upsertError } = await supabase.from('creator_storefronts').upsert(row).select().single();
    setBusy(false);
    if (upsertError) {
      setError(upsertError.message.includes('duplicate') ? 'That handle is already taken — try another.' : "Couldn't save — please try again.");
      return;
    }
    setStorefront(data);
    setLinks(Object.fromEntries(SOCIALS.map((so) => [so.key, formValue(so, data[so.key])])));
    setSaved(true);
  };

  const banner = bannerUrl(bannerPath);
  const avatar = avatarUrl(avatarPath);

  return (
    <div>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {error && <div className="error-banner">{error}</div>}
        {saved && !error && <div className="success-banner">Saved.</div>}

        <div>
          <label className="field-label">Handle</label>
          <input className="input-field" required value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="zee-robinson" />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {storefront?.handle ? `Your public link: /creator/${storefront.handle}` : 'Letters, numbers and dashes. This becomes your public link.'}
          </div>
        </div>

        <div>
          <label className="field-label">Profile picture</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {avatar ? (
              <div style={{ width: 56, height: 56, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }} />
            ) : (
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, flexShrink: 0 }}>?</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <DashedUpload inputRef={avatarInputRef} accept="image/*" onChange={handleAvatarChange} busy={uploadingAvatar} label={avatar ? 'Change photo' : 'Upload photo'} />
            </div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Shown on your storefront and on your card in the marketplace.
          </div>
        </div>

        <div>
          <label className="field-label">Banner image</label>
          <DashedUpload inputRef={bannerInputRef} accept="image/*" onChange={handleBannerChange} busy={uploadingBanner} label={banner ? 'Change banner' : 'Upload banner'} />
          {banner && (
            <div style={{ marginTop: 10, width: '100%', aspectRatio: '16 / 5', borderRadius: 10, background: `center / cover no-repeat url(${banner})` }} />
          )}
          <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            Best size: 1600 × 500 px (a wide picture). It sits across the top of your storefront.
          </div>
        </div>

        <div>
          <label className="field-label">Tagline</label>
          <input className="input-field" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short line under your name" />
        </div>

        <div>
          <label className="field-label">About</label>
          <textarea
            className="input-field"
            style={{ minHeight: 120, fontFamily: 'var(--sans)' }}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell visitors who you are and how you can help."
          />
        </div>

        <div>
          <label className="field-label">How people can reach you</label>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Add your Instagram and TikTok. Only the ones you fill in appear on your storefront. People can also message you in the Rooted Together app, which is always on.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SOCIALS.map((so) => (
              <div key={so.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  title={so.label}
                  style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0, border: '1px solid rgba(107,66,38,0.16)', color: 'var(--brown)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {so.icon}
                </span>
                <input
                  className="input-field"
                  type="text"
                  aria-label={so.label}
                  value={links[so.key]}
                  onChange={(e) => setLinks((prev) => ({ ...prev, [so.key]: e.target.value }))}
                  placeholder={`${so.label}: ${so.placeholder}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
          <button type="submit" disabled={busy || uploadingAvatar || uploadingBanner} className="btn btn-primary">
            {busy ? 'Saving…' : 'Save branding'}
          </button>
        </div>
      </form>
    </div>
  );
}
