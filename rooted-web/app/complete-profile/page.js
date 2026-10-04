'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabaseClient';
import { ROLE_LABELS } from '@/lib/roles';
import ProfileField from '@/components/ProfileField';
import {
  ROLE_TABLES,
  ROLE_PROFILE_FIELDS,
  CREDENTIAL_FIELDS,
  CREDENTIALED_ROLES,
  splitTags,
} from '@/lib/roleProfileFields';

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

  const [rowLoading, setRowLoading] = useState(true);
  const [values, setValues] = useState({});
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
    supabase
      .from(table)
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!active || !row) {
          if (active) setRowLoading(false);
          return;
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
        setExistingCertificationPath(row.certification_file_path || null);
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

  const goToDashboard = () => router.push(role === 'seeker' ? '/' : '/dashboard');

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
      } else if (val !== undefined && val !== '') {
        updates[f.column] = val;
      }
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

    const { error: updateError } = await supabase.from(table).update(updates).eq('auth_user_id', session.user.id);
    setBusy(false);
    if (updateError) {
      setError("Couldn't save your profile right now — please try again.");
      return;
    }
    if (updates.profile_picture_path) setExistingPicturePath(updates.profile_picture_path);
    if (updates.certification_file_path) setExistingCertificationPath(updates.certification_file_path);
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
      </div>

      <form onSubmit={submit} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <div className="error-banner">{error}</div>}
        {saved && <div className="success-banner">Profile saved.</div>}

        {config.map((f) => {
          if (f.showIf && !f.showIf(values)) return null;
          return (
            <ProfileField key={f.column} field={f} value={values[f.column]} onChange={(v) => setFieldValue(f.column, v)} />
          );
        })}

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
                  <input
                    type="file"
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
          <label className="field-label">Profile picture (optional)</label>
          {picturePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picturePreviewUrl}
              alt="Current profile"
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '50%', display: 'block', marginBottom: 8 }}
            />
          )}
          <input type="file" accept="image/*" onChange={(e) => setProfilePictureFile(e.target.files?.[0] || null)} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            onClick={goToDashboard}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
