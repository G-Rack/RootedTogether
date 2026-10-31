'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import { ROLE_LABELS } from '@/lib/roles';

// "Share your story" — signed-in members submit a testimonial. It lands as
// 'pending' and only appears on the home page once approved in Supabase
// (set status = 'approved' on the row in the testimonials table).
export default function TestimonialForm() {
  const { session, profile, loading } = useSession();
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (loading) return null;

  async function submit(e) {
    e.preventDefault();
    setError('');
    const text = quote.trim();
    if (text.length < 10) { setError('Please write at least a sentence or two.'); return; }
    if (text.length > 600) { setError('Please keep it under 600 characters.'); return; }
    setBusy(true);
    const { error: insertError } = await supabase.from('testimonials').insert({
      auth_user_id: session.user.id,
      name: (profile?.full_name || 'Member').slice(0, 80),
      role_label: ROLE_LABELS[profile?.role] || null,
      quote: text,
    });
    setBusy(false);
    if (insertError) { setError('Something went wrong. Please try again.'); return; }
    setDone(true);
    setQuote('');
  }

  return (
    <div style={{ marginTop: 28, textAlign: 'center' }}>
      {done ? (
        <div className="muted" style={{ fontSize: 14 }}>
          Thank you for sharing. Your story will appear here once it has been reviewed.
        </div>
      ) : !session ? (
        <div className="muted" style={{ fontSize: 14 }}>
          Part of the community? <Link href="/login" style={{ color: 'var(--brown)', fontWeight: 600, textDecoration: 'underline' }}>Log in</Link> to share your story.
        </div>
      ) : !open ? (
        <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
          Share your story
        </button>
      ) : (
        <form onSubmit={submit} style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
          <label htmlFor="testimonial-quote" style={{ fontSize: 13, fontWeight: 600, color: 'var(--brown)' }}>
            How has Rooted Together helped you?
          </label>
          <textarea
            id="testimonial-quote"
            className="input-field"
            rows={4}
            maxLength={600}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Share a sentence or two…"
            style={{ resize: 'vertical' }}
          />
          <div className="muted" style={{ fontSize: 12 }}>
            Shown with your name and role after review. {quote.length}/600
          </div>
          {error && <div style={{ color: '#B3261E', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
