'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { avatarUrl, bannerUrl, uploadAvatar, uploadBanner } from '@/lib/storage';
import { initialsFor } from '@/lib/roles';

export default function BrandingPage() {
  const { session, profile } = useSession();
  const [storefront, setStorefront] = useState(null);
  const [stats, setStats] = useState({ offerings_count: 0, followers_count: 0 });
  const [loading, setLoading] = useState(true);
  // Lifted so the preview panel updates the moment a new photo uploads,
  // without waiting for the form to be saved.
  const [avatarPath, setAvatarPath] = useState(null);

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
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 22 }}>
        This is your public page — profile picture, banner, about section, and links.
      </div>

      <div className="responsive-2col" style={{ '--col-a': '1.4fr', '--col-gap': '24px' }}>
        <BrandingForm
          storefront={storefront}
          setStorefront={setStorefront}
          session={session}
          avatarPath={avatarPath}
          setAvatarPath={setAvatarPath}
        />
        <StorefrontPreview storefront={storefront} profile={profile} stats={stats} avatarPath={avatarPath} />
      </div>
    </div>
  );
}

function StorefrontPreview({ storefront, profile, stats, avatarPath }) {
  const banner = bannerUrl(storefront?.banner_path);
  const avatar = avatarUrl(avatarPath);
  const name = profile?.full_name || 'Your name';

  return (
    <div className="card sticky-panel" style={{ overflow: 'hidden' }}>
      <div
        style={{
          height: 70,
          background: banner ? `center / cover no-repeat url(${banner})` : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
        }}
      />
      <div style={{ padding: '0 18px 18px' }}>
        {avatar ? (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              border: '3px solid var(--white)',
              marginTop: -28,
              marginBottom: 10,
              background: `center / cover no-repeat url(${avatar})`,
            }}
          />
        ) : (
          <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, border: '3px solid var(--white)', marginTop: -28, marginBottom: 10 }}>
            {initialsFor(name)}
          </div>
        )}
        <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{name}</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
          {storefront?.handle ? `@${storefront.handle}` : 'Choose a handle to publish your storefront'}
        </div>
        {storefront?.tagline && <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 10 }}>{storefront.tagline}</div>}

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

function BrandingForm({ storefront, setStorefront, session, avatarPath, setAvatarPath }) {
  const [handle, setHandle] = useState(storefront?.handle || '');
  const [tagline, setTagline] = useState(storefront?.tagline || '');
  const [bio, setBio] = useState(storefront?.bio || '');
  const [instagramUrl, setInstagramUrl] = useState(storefront?.instagram_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(storefront?.website_url || '');
  const [bannerPath, setBannerPath] = useState(storefront?.banner_path || null);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
    try {
      const path = await uploadBanner(file, session.user.id);
      setBannerPath(path);
    } catch {
      setError("Couldn't upload that image.");
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
      instagram_url: instagramUrl || null,
      website_url: websiteUrl || null,
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
    setSaved(true);
  };

  const banner = bannerUrl(bannerPath);
  const avatar = avatarUrl(avatarPath);

  return (
    <div className="card" style={{ padding: 24 }}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-banner">{error}</div>}
        {saved && !error && <div className="success-banner">Saved.</div>}

        <div>
          <label className="field-label">Handle</label>
          <input className="input-field" required value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="zee-robinson" />
          {storefront?.handle && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>/creator/{storefront.handle}</div>}
        </div>

        <div>
          <label className="field-label">Profile picture</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {avatar ? (
              <div style={{ width: 56, height: 56, borderRadius: 999, flexShrink: 0, background: `center / cover no-repeat url(${avatar})` }} />
            ) : (
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, flexShrink: 0 }}>?</div>
            )}
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ maxWidth: '100%' }} />
          </div>
          {uploadingAvatar && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Uploading…</div>}
          <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            Shown on your storefront and on your card in the marketplace.
          </div>
        </div>

        <div>
          <label className="field-label">Banner image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {banner && <div style={{ width: 120, height: 60, borderRadius: 8, flexShrink: 0, background: `center / cover no-repeat url(${banner})` }} />}
            <input type="file" accept="image/*" onChange={handleBannerChange} style={{ maxWidth: '100%' }} />
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

        <div className="responsive-2col" style={{ '--col-gap': '12px' }}>
          <div>
            <label className="field-label">Instagram URL</label>
            <input className="input-field" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" />
          </div>
          <div>
            <label className="field-label">Website URL</label>
            <input className="input-field" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          {busy ? 'Saving…' : 'Save branding'}
        </button>
      </form>
    </div>
  );
}
