'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatDuration } from '@/lib/lessons';
import MuxVideo from '@/components/MuxVideo';

// Lesson 1 of a course, free to watch for anyone (signed in or not) when the creator
// switched the free preview on. The database only ever returns that one video.
// "Get the full course" runs the page's normal buy flow.
export default function FreePreview({ offeringId, enabled, onGetFull, buying = false }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    supabase.rpc('get_free_preview', { p_offering: offeringId }).then(({ data }) => {
      if (active) setPreview(Array.isArray(data) && data.length > 0 ? data[0] : null);
    });
    return () => { active = false; };
  }, [offeringId, enabled]);

  if (!enabled || !preview?.mux_playback_id) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)' }}>Watch Lesson 1 free</div>
        <span className="badge">FREE PREVIEW</span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
        {preview.title || 'Lesson 1'}
        {preview.duration_seconds ? ` · ${formatDuration(preview.duration_seconds)}` : ''}
        {' '}· No account needed.
      </div>
      <div className="card" style={{ padding: 14 }}>
        <MuxVideo playbackId={preview.mux_playback_id} title={preview.title || 'Lesson 1 free preview'} />
        <button type="button" className="btn btn-primary" onClick={onGetFull} disabled={buying} style={{ width: '100%', marginTop: 14 }}>
          {buying ? 'Please wait…' : 'Get the full course'}
        </button>
      </div>
    </div>
  );
}
