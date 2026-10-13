'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabaseClient';
import { ROLE_LABELS } from '@/lib/roles';
import ProfileField from '@/components/ProfileField';
import FileField from '@/components/FileField';
import {
  ROLE_TABLES,
  ROLE_PRIVATE_TABLES,
  ROLE_PRIVATE_FIELDS,
  ROLE_PROFILE_FIELDS,
  CREDENTIAL_FIELDS,
  CREDENTIALED_ROLES,
  splitTags,
} from '@/lib/roleProfileFields';

// Renders a list of fields, with a small heading above the first field of each
// `section` (churches use this to group organisation / trust / contact fields).
function FieldList({ fields, values, onChange }) {
  let lastSection = null;
  return fields.map((f) => {
    if (f.showIf && !f.showIf(values)) return null;
    const heading = f.section && f.section !== lastSection ? f.section : null;
    if (f.section) lastSection = f.section;
    return (
      <div key={f.column} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {heading && (
          <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--brown)', marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(107,66,38,0.1)' }}>
            {heading}
          </div>
        )}
        <ProfileField field={f} value={values[f.column]} onChange={(v) => onChange(f.column, v)} />
      </div>
    );
  });
}

// Everything role-specific that used to live directly in the signup form —
// spiritual gifts, church/ministry info, credentials, profile picture,
// certification document — gets filled in here instead, once the person is
// signed in. New signups land here straight from app/login/page.js; anyone
// can come back later from Settings to edit or finish it.
export default function CompleteProfilePage() {
  const router = useRouter();
  const { session, profile, loading, refreshProfile } = useSession();

  const role = profile?.role; // 'seeker' | 'assistant' | 'mother' | 'pastor' | 'influencer'
  const table = role ? ROLE_TABLES[role] : null;
  const config = role ? ROLE_PROFILE_FIELDS[role] || [] : [];
  const isCredentialed = role ? CREDENTIALED_ROLES.has(role) : false;
  // Churches keep contact / reference details in a second, owner-only table.
  const privateTable = role ? ROLE_PRIVATE_TABLES[role] || null : null;
  const privateConfig = role ? ROLE_PRIVATE_FIELDS[role] || [] : [];

  const [rowLoading, setRowLoading] = useState(true);
  const [values, setValues] = useState({});
  const [privateValues, setPrivateValues] = useState({});
  const [hasCredentials, setHasCredentials] = useState('');
  const [credentialValues, setCredentialValues] = useState({});
  const [existingPicturePath, setExistingPicturePath] = useState(null);
  const [existingCertificationPath, setExistingCertificationPath] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [certificationFile, setCertificationFile] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session, router]);

  useEffect(() => {
    let active = true;
    if (!session?.user?.id || !table) return undefined;

    setRowLoading(true);
    Promise.all([
      supabase.from(table).select('*').eq('auth_user_id', session.user.id).maybeSingle(),
      privateTable
        ? supabase.from(privateTable).select('*').eq('auth_user_id', session.user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
      .then(([{ data: row }, { data: privateRow }]) => {
        if (!active || !row) {
          if (active) setRowLoading(false);
          return;
        }
        if (privateRow) {
          const nextPrivate = {};
          for (const f of privateConfig) nextPrivate[f.column] = privateRow[f.column] || '';
          setPrivateValues(nextPrivate);
        }
        const nextValues = {};
        for (const f of config) {
          if (f.type === 'checkboxes') nextValues[f.column] = Array.isArray(row[f.column]) ? row[f.column] : [];
          else nextValues[f.column] = row[f.column] || '';
        }
        setValues(nextValues);
        setHasCredentials(row.has_relevant_credentials || '');
        setCredentialValues({
          highest_level_of_education: row.highest_level_of_education || '',
          licenses_certifications: Array.isArray(row.licenses_certifications) ? row.licenses_certifications.join(', ') : '',
          areas_of_specialty: Array.isArray(row.areas_of_specialty) ? row.areas_of_specialty.join(', ') : '',
        });
        setExistingPicturePath(row.profile_picture_path || null);
        setExistingCertificationPath((privateRow ? privateRow.certification_file_path : row.certification_file_path) || null);
        setRowLoading(false);
      });

    return () => {
      active = false;
    };
    // `config` is derived from `role`, which this effect already keys off via `table` — re-running per keystroke isn't a concern since nothing here mutates config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, table]);

  useEffect(() => {
    let active = true;
    if (!existingPicturePath) {
      setPicturePreviewUrl(null);
      return undefined;
    }
    supabase.storage
      .from('profile-pictures')
      .createSignedUrl(existingPicturePath, 3600)
      .then(({ data }) => {
        if (active) setPicturePreviewUrl(data?.signedUrl || null);
      });
    return () => {
      active = false;
    };
  }, [existingPicturePath]);

  const setFieldValue = (column, value) => setValues((prev) => ({ ...prev, [column]: value }));
  const setPrivateFieldValue = (column, value) => setPrivateValues((prev) => ({ ...prev, [column]: value }));

  // Mothers/Pastors/Leaders have a real creator dashboard; Seekers and
  // Assistants don't (and /dashboard would just bounce them straight back
  // out), so they go to their own read-only profile instead.
  const goToProfile = () => router.push(['seeker', 'assistant'].includes(role) ? '/my-profile' : '/dashboard');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!session?.user?.id || !table) return;
    setBusy(true);

    const updates = {};
    for (const f of config) {
      if (f.showIf && !f.showIf(values)) continue;
      const val = values[f.column];
      if (f.type === 'checkboxes') {
        if (Array.isArray(val) && val.length) updates[f.column] = val;
      } else if (f.type === 'number') {
        const n = parseInt(val, 10);
        if (Number.isFinite(n)) updates[f.column] = n;
      } else if (val !== undefined && val !== '') {
        updates[f.column] = val;
      }
    }

    const privateUpdates = {};
    for (const f of privateConfig) {
      const val = privateValues[f.column];
      if (val !== undefined && val !== '') privateUpdates[f.column] = val;
    }

    if (isCredentialed && hasCredentials) {
      updates.has_relevant_credentials = hasCredentials;
      if (hasCredentials === 'Yes, I do') {
        if (credentialValues.highest_level_of_education) {
          updates.highest_level_of_education = credentialValues.highest_level_of_education;
        }
        const licenses = splitTags(credentialValues.licenses_certifications);
        if (licenses.length) updates.licenses_certifications = licenses;
        const specialties = splitTags(credentialValues.areas_of_specialty);
        if (specialties.length) updates.areas_of_specialty = specialties;
      }
    }

    try {
      if (profilePictureFile) {
        const ext = profilePictureFile.name.split('.').pop() || 'jpg';
        const path = `${session.user.id}/profile-picture.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(path, profilePictureFile, { upsert: true });
        if (uploadError) throw uploadError;
        updates.profile_picture_path = path;
      }
      if (privateTable && certificationFile) {
        const ext = certificationFile.name.split('.').pop() || 'pdf';
        const path = `${session.user.id}/certification.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('certification-documents')
          .upload(path, certificationFile, { upsert: true });
        if (uploadError) throw uploadError;
        privateUpdates.certification_file_path = path;
      }
      if (isCredentialed && hasCredentials === 'Yes, I do' && certificationFile) {
        const ext = certificationFile.name.split('.').pop() || 'pdf';
        const path = `${session.user.id}/certification.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('certification-documents')
          .upload(path, certificationFile, { upsert: true });
        if (uploadError) throw uploadError;
        updates.certification_file_path = path;
      }
    } catch {
      setBusy(false);
      setError("Couldn't upload one of your files — please try again.");
      return;
    }

    let { error: updateError } = await supabase.from(table).update(updates).eq('auth_user_id', session.user.id);
    if (!updateError && privateTable && Object.keys(privateUpdates).length) {
      ({ error: updateError } = await supabase.from(privateTable).update(privateUpdates).eq('auth_user_id', session.user.id));
    }
    setBusy(false);
    if (updateError) {
      setError("Couldn't save your profile right now — please try again.");
      return;
    }
    if (updates.profile_picture_path) setExistingPicturePath(updates.profile_picture_path);
    if (updates.certification_file_path) setExistingCertificationPath(updates.certification_file_path);
    if (privateUpdates.certification_file_path) setExistingCertificationPath(privateUpdates.certification_file_path);
    setProfilePictureFile(null);
    setCertificationFile(null);
    refreshProfile();
    setSaved(true);
  };

  if (loading || (session && rowLoading)) {
    return <div style={{ padding: 48, textAlign: 'center' }} className="muted">Loading…</div>;
  }

  if (!role || !table) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
        <div className="error-banner">
          We couldn&rsquo;t find your account type. Please reach out from inside the Rooted Together app.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px' }}>
      <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>
        Complete your profile
      </div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
        You&rsquo;re signed in as a <strong>{ROLE_LABELS[role]}</strong>. Fill in as much as you&rsquo;d like now — you
        can always finish this later from Settings.
        {role === 'church' && ' Your organisation is already live; the more you add, the more people can trust and find you. Contact and reference details stay private.'}
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-banner">{error}</div>}
        {saved && <div className="success-banner">Profile saved.</div>}

        <FieldList fields={config} values={values} onChange={setFieldValue} />

        {privateConfig.length > 0 && (
          <>
            <FieldList fields={privateConfig} values={privateValues} onChange={setPrivateFieldValue} />
            <div>
              <label className="field-label">Verification document (optional)</label>
              <FileField
                kind="document"
                accept="application/pdf,image/*"
                onChange={(e) => setCertificationFile(e.target.files?.[0] || null)}
              />
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                For example a charity or incorporation certificate, or a letter from your denomination. Kept private,
                used only for internal review and never shown publicly.
                {existingCertificationPath && !certificationFile && ' A document is already on file.'}
              </div>
            </div>
          </>
        )}

        {isCredentialed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--cream)', borderRadius: 14, padding: 16 }}>
            <div>
              <label className="field-label">Do you have relevant credentials?</label>
              <select className="input-field" value={hasCredentials} onChange={(e) => setHasCredentials(e.target.value)}>
                <option value="">Select…</option>
                <option value="Yes, I do">Yes, I do</option>
                <option value="No, I don't">No, I don&rsquo;t</option>
              </select>
            </div>
            {hasCredentials === 'Yes, I do' && (
              <>
                {CREDENTIAL_FIELDS.map((f) => (
                  <ProfileField
                    key={f.column}
                    field={f}
                    value={credentialValues[f.column]}
                    onChange={(v) => setCredentialValues((prev) => ({ ...prev, [f.column]: v }))}
                  />
                ))}
                <div>
                  <label className="field-label">Certification document (optional)</label>
                  <FileField
                    kind="document"
                    accept="application/pdf,image/*"
                    onChange={(e) => setCertificationFile(e.target.files?.[0] || null)}
                  />
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                    Kept private — used only for internal review, never shown publicly.
                    {existingCertificationPath && !certificationFile && ' A document is already on file.'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div>
          <label className="field-label">{role === 'church' ? 'Logo or photo (optional)' : 'Profile picture (optional)'}</label>
          {picturePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picturePreviewUrl}
              alt="Current profile"
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%', display: 'block', marginBottom: 8 }}
            />
          )}
          <FileField accept="image/*" onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)} />
        </div>

        {/* Repeated here (not just at the top of the form) because on a long
            form the person is still scrolled down by the Save button when
            the result comes back — a banner shown only up top looked like
            nothing had happened. */}
        {error && <div className="error-banner">{error}</div>}
        {saved && (
          <div className="success-banner">
            Profile saved.{' '}
            {['seeker', 'assistant'].includes(role) && (
              <Link href="/my-profile" style={{ fontWeight: 700 }}>View my profile →</Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            onClick={goToProfile}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
