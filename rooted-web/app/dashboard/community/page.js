'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import ProBadge from '@/components/ProBadge';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import { AuthorLine, FilePicker } from '@/components/ProCommunityBits';
import { COMMUNITY_CATEGORIES, CATEGORY_LABELS, timeAgo, uploadCommunityFile } from '@/lib/pro';

const FILTERS = [{ value: 'all', label: 'All' }, ...COMMUNITY_CATEGORIES];

function excerpt(text, n = 190) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export default function CommunityPage() {
  const { session, isPro } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState({});
  const [replyCounts, setReplyCounts] = useState({});
  const [helpfulCounts, setHelpfulCounts] = useState({});
  const [fileCounts, setFileCounts] = useState({});
  const [isMod, setIsMod] = useState(false);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loaded, setLoaded] = useState(false);
  const loading = isPro && !loaded;

  // composer
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('questions');
  const [pin, setPin] = useState(false);
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    const [postsRes, dirRes, modRes] = await Promise.all([
      supabase.from('pro_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(60),
      supabase.rpc('pro_member_directory'),
      supabase.from('pro_moderators').select('auth_user_id').eq('auth_user_id', session.user.id).maybeSingle(),
    ]);
    const rows = postsRes.data || [];
    const ids = rows.map((p) => p.id);
    setMembers(Object.fromEntries((dirRes.data || []).map((m) => [m.auth_user_id, m])));
    setIsMod(!!modRes.data);
    setPosts(rows);

    if (ids.length > 0) {
      const [rep, help, att] = await Promise.all([
        supabase.from('pro_replies').select('post_id').in('post_id', ids),
        supabase.from('pro_helpful').select('post_id').in('post_id', ids),
        supabase.from('pro_attachments').select('post_id').in('post_id', ids),
      ]);
      const tally = (list) => (list || []).reduce((acc, r) => { acc[r.post_id] = (acc[r.post_id] || 0) + 1; return acc; }, {});
      setReplyCounts(tally(rep.data));
      setHelpfulCounts(tally(help.data));
      setFileCounts(tally(att.data));
    }

    if (modRes.data) {
      const { data: rep } = await supabase.from('pro_reports').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(30);
      const list = rep || [];
      // A report on a reply needs its post id so the moderator can open the thread.
      const replyIds = list.filter((r) => r.reply_id).map((r) => r.reply_id);
      let replyPost = {};
      if (replyIds.length > 0) {
        const { data: rr } = await supabase.from('pro_replies').select('id, post_id').in('id', replyIds);
        replyPost = Object.fromEntries((rr || []).map((r) => [r.id, r.post_id]));
      }
      setReports(list.map((r) => ({ ...r, thread_id: r.post_id || replyPost[r.reply_id] || null })));
    }
    setLoaded(true);
  }, [session]);

  useEffect(() => {
    if (!session || !isPro) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [session, isPro, load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const t = title.trim();
    const b = body.trim();
    if (t.length < 3) { setError('Add a short title (at least 3 characters).'); return; }
    if (!b) { setError('Write a few words in the message.'); return; }
    setPosting(true);
    const uploaded = [];
    try {
      for (const f of files) uploaded.push(await uploadCommunityFile(f, session.user.id));
      const { data: post, error: postErr } = await supabase
        .from('pro_posts')
        .insert({ author_id: session.user.id, category, title: t, body: b, ...(isMod && pin ? { pinned: true } : {}) })
        .select('id')
        .single();
      if (postErr) {
        if (uploaded.length) await supabase.storage.from('pro-community').remove(uploaded.map((u) => u.storage_path));
        throw new Error(postErr.message || 'Could not post.');
      }
      if (uploaded.length) {
        const { error: attErr } = await supabase.from('pro_attachments').insert(
          uploaded.map((u) => ({ ...u, post_id: post.id, uploader_id: session.user.id })),
        );
        if (attErr) throw new Error('Your post is up, but the files could not be attached. Open the post and try again.');
      }
      setTitle(''); setBody(''); setFiles([]); setPin(false);
      router.push(`/dashboard/community/${post.id}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setPosting(false);
    }
  };

  const resolveReport = async (id) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    await supabase.from('pro_reports').update({ status: 'resolved' }).eq('id', id);
  };

  const visible = useMemo(() => posts.filter((p) => filter === 'all' || p.category === filter), [posts, filter]);
  const pinned = visible.filter((p) => p.pinned);
  const rest = visible.filter((p) => !p.pinned);

  if (!isPro) {
    return (
      <div style={{ maxWidth: 820 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)', marginBottom: 6 }}>Community</div>
        <div className="muted" style={{ fontSize: 13.5, marginBottom: 22, lineHeight: 1.6 }}>
          A private space for Creator Pro members. Ask questions, share what is working and swap the files that help you build your storefront.
        </div>
        <ProUpgradeBanner title="The community is part of Creator Pro" />
      </div>
    );
  }

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  const PostCard = ({ p }) => (
    <Link href={`/dashboard/community/${p.id}`} className="card" style={{ display: 'block', padding: '18px 20px', borderColor: p.pinned ? '#C8923F' : undefined, opacity: p.hidden ? 0.6 : 1 }}>
      <AuthorLine member={members[p.author_id]} when={timeAgo(p.created_at)} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <span className="badge">{(CATEGORY_LABELS[p.category] || p.category).toUpperCase()}</span>
        {p.pinned && <span className="badge" style={{ background: '#C8923F', color: '#2E1B10' }}>PINNED</span>}
        {p.hidden && <span className="badge" style={{ background: '#FBEAEA', color: '#8A2C2C' }}>HIDDEN</span>}
      </div>
      <div className="serif" style={{ fontSize: 17.5, fontWeight: 700, color: 'var(--text)', marginTop: 8, lineHeight: 1.3 }}>{p.title}</div>
      <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 6 }}>{excerpt(p.body)}</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span>{replyCounts[p.id] || 0} {(replyCounts[p.id] || 0) === 1 ? 'reply' : 'replies'}</span>
        <span>{helpfulCounts[p.id] || 0} found this helpful</span>
        {fileCounts[p.id] ? <span>{fileCounts[p.id]} file{fileCounts[p.id] === 1 ? '' : 's'}</span> : null}
      </div>
    </Link>
  );

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Community</div>
        <ProBadge />
      </div>
      <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 22, maxWidth: 640 }}>
        A private space for Creator Pro members. Ask questions, share what is working and swap the files that help you build your storefront.
      </div>

      {isMod && reports.length > 0 && (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 22, borderColor: '#E3B4B4' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Reports to review ({reports.length})</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <span className="muted">{r.reply_id ? 'Reply' : 'Post'} · {timeAgo(r.created_at)}:</span> {r.reason}
                </div>
                {r.thread_id && <Link href={`/dashboard/community/${r.thread_id}`} className="btn btn-outline btn-xs">Open</Link>}
                <button className="btn btn-outline btn-xs" onClick={() => resolveReport(r.id)}>Mark resolved</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="card" style={{ padding: '18px 20px', marginBottom: 24, display: 'grid', gap: 12 }}>
        <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={140} disabled={posting} />
        <textarea
          className="input-field"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share a question, a win or a file. Say what you sell, who it is for, and what you have tried."
          rows={4}
          maxLength={5000}
          disabled={posting}
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: 230, maxWidth: '100%' }}>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} disabled={posting} aria-label="Category">
              {COMMUNITY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {isMod && (
            <label className="check-chip" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} disabled={posting} /> Pin to the top
            </label>
          )}
        </div>
        <FilePicker files={files} onChange={setFiles} disabled={posting} />
        {error && <div className="error-banner">{error}</div>}
        <div>
          <button className="btn btn-primary" type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post'}</button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={filter === f.value ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small'}>{f.label}</button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="card muted" style={{ padding: '28px 22px', textAlign: 'center', fontSize: 14 }}>
          {posts.length === 0 ? 'Nothing here yet. Be the first to ask a question or share a win.' : 'Nothing in this category yet.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {pinned.map((p) => <PostCard key={p.id} p={p} />)}
        {rest.map((p) => <PostCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
