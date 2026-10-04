'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabaseClient';
import { ROLE_LABELS, initialsFor } from '@/lib/roles';
import { ROLE_TABLES, ROLE_PROFILE_FIELDS, resolveSeekerDisplayName } from '@/lib/roleProfileFields';
import { bannerUrl } from '@/lib/storage';

// The read-only counterpart to /complete-profile: a summary of everything
// a Seeker or Assistant has filled in, plus a preview of how that shows up
// to other people. Lives inside app/my-profile/layout.js's account shell,
// which already handles the signed-in/role gate — this page only needs to
// load its own row.

function Avatar({ url, name, size = 52, fontSize = 16, style = {} }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid var(--white)', ...style }}
      />
    );
  }
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize, border: '3px solid var(--white)', ...style }}>
      {initialsFor(name)}
    </div>
  );
}

export default function MyProfilePage() {
  const { session, profile, loading } = useSession();
  const role = profile?.role;
  const table = role ? ROLE_TABLES[role] : null;
  const config = role ? ROLE_PROFILE_FIELDS[role] || [] : [];

  const [row, setRow] = useState(null);
  const [rowLoading, setRowLoading] = useState(true);
  const [pictureUrl, setPictureUrl] = useState(null);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id || !table) return undefined;
    setRowLoading(true);
    supabase
      .from(table)
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setRow(data || null);
          setRowLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, table]);

  useEffect(() => {
    let active = true;
    if (!row?.profile_picture_path) {
      setPictureUrl(null);
      return undefined;
    }
    supabase.storage
      .from('profile-pictures')
      .createSignedUrl(row.profile_picture_path, 3600)
      .then(({ data }) => {
        if (active) setPictureUrl(data?.signedUrl || null);
      });
    return () => {
      active = false;
    };
  }, [row?.profile_picture_path]);

  if (loading || rowLoading) {
    return <div className="skeleton" style={{ height: 240 }} />;
  }

  const filledFields = config.filter((f) => {
    const val = row?.[f.column];
    return f.type === 'checkboxes' ? Array.isArray(val) && val.length > 0 : !!val;
  });
  const hasAnyData = filledFields.length > 0;

  const displayName = resolveSeekerDisplayName(row);
  const storyField = role === 'seeker' ? 'your_story' : 'story_testimony';
  const story = row?.[storyField];
  const tagField = role === 'seeker' ? 'support_needs' : 'spiritual_gifts';
  const tags = Array.isArray(row?.[tagField]) ? row[tagField] : [];
  const banner = bannerUrl(row?.banner_path);

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
          My Profile
        </div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Everything below is private to you. Here&rsquo;s a preview of what others see alongside it.
        </div>
      </div>

      {/* ---- Private summary ---- */}
      <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar url={pictureUrl} name={row?.name} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>{row?.name}</div>
            <span className="badge">{ROLE_LABELS[role]}</span>
          </div>
          <Link href="/complete-profile" className="btn btn-outline btn-small">Edit profile</Link>
        </div>

        {!hasAnyData ? (
          <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, paddingTop: 14, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
            You haven&rsquo;t filled in your profile yet.{' '}
            <Link href="/complete-profile" style={{ fontWeight: 700 }}>Complete your profile</Link> so people on
            Rooted Together can get to know you.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px 18px',
                paddingTop: 14,
                borderTop: '1px solid rgba(107,66,38,0.1)',
              }}
            >
              <Field label="Email" value={row?.email} />
              {row?.date_of_birth && (
                <Field
                  label="Date of birth"
                  value={new Date(row.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                />
              )}
              {role === 'seeker' && row?.religion && <Field label="Religion" value={row.religion} />}
              {filledFields
                .filter((f) => f.type !== 'checkboxes' && f.type !== 'textarea')
                .map((f) => (
                  <Field key={f.column} label={f.label.replace(' (optional)', '')} value={row[f.column]} />
                ))}
            </div>

            {tags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
                <span className="field-label" style={{ marginBottom: 0 }}>
                  {role === 'seeker' ? 'What kind of support you’re looking for' : 'Spiritual gifts & areas of focus'}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {tags.map((t) => (
                    <span key={t} className="badge" style={{ background: 'var(--cream)', border: '1px solid rgba(107,66,38,0.18)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filledFields
              .filter((f) => f.type === 'textarea')
              .map((f) => (
                <div key={f.column} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
                  <span className="field-label" style={{ marginBottom: 0 }}>{f.label.replace(' (optional)', '')}</span>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)' }}>{row[f.column]}</div>
                </div>
              ))}
          </>
        )}
      </div>

      {/* ---- Public preview ---- */}
      {hasAnyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field-label" style={{ marginBottom: 0 }}>
            {role === 'seeker' ? 'How you appear when you send a request' : 'How you appear to others'}
          </div>

          {role === 'seeker' ? (
            // Previously had no banner slot at all, so a Seeker's uploaded
            // banner (Settings) never showed up anywhere — this card is the
            // only public-facing preview they have, so it gets the same
            // banner + overlapping avatar treatment as the Assistant card
            // below, just scaled down to this card's smaller width.
            <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: 420 }}>
              <div
                style={{
                  height: 64,
                  background: banner
                    ? `center 70% / cover no-repeat url(${banner})`
                    : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
                }}
              />
              <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar url={pictureUrl} name={displayName} size={40} fontSize={13} style={{ marginTop: -20 }} />
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{displayName}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>Sent a request</div>
                  </div>
                </div>
                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {tags.slice(0, 3).map((t) => (
                      <span key={t} className="badge" style={{ background: 'var(--cream)', border: '1px solid rgba(107,66,38,0.18)' }}>{t}</span>
                    ))}
                  </div>
                )}
                {story && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {story}
                  </div>
                )}
                <div className="muted" style={{ fontSize: 11, paddingTop: 8, borderTop: '1px solid rgba(107,66,38,0.08)' }}>
                  Your email and date of birth are never shown here — only your display name.
                </div>
              </div>
            </div>
          ) : (
            // Matches components/CreatorCard.js exactly (same banner height,
            // avatar size/overlap, and padding as the Spiritual Mothers'
            // storefront cards) so a Seeker browsing the marketplace sees a
            // consistent card style regardless of who it belongs to.
            <div className="card" style={{ overflow: 'hidden', maxWidth: 320 }}>
              <div
                style={{
                  height: 120,
                  background: banner
                    ? `center 70% / cover no-repeat url(${banner})`
                    : 'linear-gradient(160deg, var(--brown) 0%, var(--brown-light) 100%)',
                }}
              />
              <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Avatar url={pictureUrl} name={row?.name} size={78} fontSize={22} style={{ marginTop: -39 }} />
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{row?.name}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{ROLE_LABELS.assistant}</div>
                </div>
                {story && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: 'var(--text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {story}
                  </div>
                )}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {tags.slice(0, 2).map((t) => (
                      <span key={t} className="badge" style={{ background: 'var(--cream)', border: '1px solid rgba(107,66,38,0.18)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="field-label">{label}</span>
      <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}
