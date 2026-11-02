'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import { AuthorLine, AttachmentList, FilePicker } from '@/components/ProCommunityBits';
import { CATEGORY_LABELS, timeAgo, uploadCommunityFile } from '@/lib/pro';

function ReportForm({ onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ marginTop: 12, padding: 14, background: 'var(--cream)', border: '1px solid rgba(107,66,38,0.14)', borderRadius: 12, display: 'grid', gap: 10 }}>
      <label className="field-label" style={{ marginBottom: 0 }}>What is wrong with this?</label>
      <textarea className="input-field" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="A short note for the moderators" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-xs" disabled={busy || reason.trim().length < 3} onClick={async () => { setBusy(true); await onSubmit(reason.trim()); setBusy(false); }}>
          {busy ? 'Sending…' : 'Send report'}
        </button>
        <button className="btn btn-outline btn-xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function CommunityThreadPage() {
  const { id } = useParams();
  const router = useRouter();
  const { session, isPro } = useSession();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [helpful, setHelpful] = useState([]);
  const [members, setMembers] = useState({});
  const [isMod, setIsMod] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reportFor, setReportFor] = useState(null); // 'post' or reply id
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const loading = isPro && !loaded;

  const load = useCallback(async () => {
    if (!session) return;
    const { data: p } = await supabase.from('pro_posts').select('*').eq('id', id).maybeSingle();
    if (!p) { setNotFound(true); setLoaded(true); return; }
    const [rep, dir, mod, help] = await Promise.all([
      supabase.from('pro_replies').select('*').eq('post_id', id).order('created_at', { ascending: true }),
      supabase.rpc('pro_member_directory'),
      supabase.from('pro_moderators').select('auth_user_id').eq('auth_user_id', session.user.id).maybeSingle(),
      supabase.from('pro_helpful').select('post_id, reply_id, user_id').or(`post_id.eq.${id}`),
    ]);
    const replyRows = rep.data || [];
    const replyIds = replyRows.map((r) => r.id);
    const [att, helpR] = await Promise.all([
      supabase.from('pro_attachments').select('*').or(replyIds.length ? `post_id.eq.${id},reply_id.in.(${replyIds.join(',')})` : `post_id.eq.${id}`),
      replyIds.length ? supabase.from('pro_helpful').select('post_id, reply_id, user_id').in('reply_id', replyIds) : Promise.resolve({ data: [] }),
    ]);
    setPost(p);
    setReplies(replyRows);
    setAttachments(att.data || []);
    setHelpful([...(help.data || []), ...(helpR.data || [])]);
    setMembers(Object.fromEntries((dir.data || []).map((m) => [m.auth_user_id, m])));
    setIsMod(!!mod.data);
    setLoaded(true);
  }, [session, id]);

  useEffect(() => {
    if (!session || !isPro) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [session, isPro, load]);

  const me = session?.user?.id;
  const helpfulCount = (kind, key) => helpful.filter((h) => (kind === 'post' ? h.post_id === key : h.reply_id === key)).length;
  const iFoundHelpful = (kind, key) => helpful.some((h) => h.user_id === me && (kind === 'post' ? h.post_id === key : h.reply_id === key));

  const toggleHelpful = async (kind, key) => {
    const col = kind === 'post' ? 'post_id' : 'reply_id';
    if (iFoundHelpful(kind, key)) {
      setHelpful((prev) => prev.filter((h) => !(h.user_id === me && h[col] === key)));
      await supabase.from('pro_helpful').delete().eq('user_id', me).eq(col, key);
    } else {
      setHelpful((prev) => [...prev, { user_id: me, post_id: kind === 'post' ? key : null, reply_id: kind === 'reply' ? key : null }]);
      const { error: e } = await supabase.from('pro_helpful').insert({ user_id: me, [col]: key });
      if (e) setHelpful((prev) => prev.filter((h) => !(h.user_id === me && h[col] === key)));
    }
  };

  const sendReport = async (kind, key, reason) => {
    const { error: e } = await supabase.from('pro_reports').insert({ reporter_id: me, reason, ...(kind === 'post' ? { post_id: key } : { reply_id: key }) });
    setReportFor(null);
    if (e) setError('Could not send the report. Please try again.');
    else setNotice('Thank you. The moderators have been told.');
  };

  const setHidden = async (kind, key, hidden) => {
    const table = kind === 'post' ? 'pro_posts' : 'pro_replies';
    const { error: e } = await supabase.from(table).update({ hidden }).eq('id', key);
    if (e) { setError('Could not update that. Please try again.'); return; }
    if (kind === 'post') setPost((p) => ({ ...p, hidden }));
    else setReplies((prev) => prev.map((r) => (r.id === key ? { ...r, hidden } : r)));
  };

  const setPinned = async (pinned) => {
    const { error: e } = await supabase.from('pro_posts').update({ pinned }).eq('id', id);
    if (e) setError('Could not update that. Please try again.');
    else setPost((p) => ({ ...p, pinned }));
  };

  const remove = async (kind, key) => {
    if (!window.confirm(kind === 'post' ? 'Delete this post and all its replies? This cannot be undone.' : 'Delete this reply? This cannot be undone.')) return;
    const paths = attachments
      .filter((a) => (kind === 'post' ? a.post_id === key || replies.some((r) => r.id === a.reply_id) : a.reply_id === key))
      .map((a) => a.storage_path);
    const { error: e } = await supabase.from(kind === 'post' ? 'pro_posts' : 'pro_replies').delete().eq('id', key);
    if (e) { setError('Could not delete that. Please try again.'); return; }
    if (paths.length) await supabase.storage.from('pro-community').remove(paths);
    if (kind === 'post') router.push('/dashboard/community');
    else load();
  };

  const sendReply = async (e) => {
    e.preventDefault();
    setError('');
    const b = replyBody.trim();
    if (!b) return;
    setSending(true);
    const uploaded = [];
    try {
      for (const f of replyFiles) uploaded.push(await uploadCommunityFile(f, me));
      const { data: r, error: rErr } = await supabase.from('pro_replies').insert({ post_id: id, author_id: me, body: b }).select('id').single();
      if (rErr) {
        if (uploaded.length) await supabase.storage.from('pro-community').remove(uploaded.map((u) => u.storage_path));
        throw new Error(rErr.message || 'Could not send your reply.');
      }
      if (uploaded.length) {
        const { error: aErr } = await supabase.from('pro_attachments').insert(uploaded.map((u) => ({ ...u, reply_id: r.id, uploader_id: me })));
        if (aErr) throw new Error('Your reply is up, but the files could not be attached.');
      }
      setReplyBody(''); setReplyFiles([]);
      await load();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setSending(false);
  };

  const back = (
    <Link href="/dashboard/community" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', display: 'inline-block', marginBottom: 16 }}>← Back to community</Link>
  );

  if (!isPro) {
    return (
      <div style={{ maxWidth: 820 }}>
        {back}
        <ProUpgradeBanner title="The community is part of Creator Pro" />
      </div>
    );
  }
  if (loading) return <div className="skeleton" style={{ height: 300 }} />;
  if (notFound || !post) {
    return (
      <div style={{ maxWidth: 820 }}>
        {back}
        <div className="card muted" style={{ padding: '28px 22px', textAlign: 'center' }}>This post could not be found. It may have been removed.</div>
      </div>
    );
  }

  const postFiles = attachments.filter((a) => a.post_id === post.id);

  const renderActions = (kind, item) => {
    const key = item.id;
    const mine = item.author_id === me;
    const open = reportFor === key;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button
            className={iFoundHelpful(kind, key) ? 'btn btn-primary btn-xs' : 'btn btn-outline btn-xs'}
            onClick={() => toggleHelpful(kind, key)}
          >
            {iFoundHelpful(kind, key) ? 'Marked helpful' : 'Found this helpful'} · {helpfulCount(kind, key)}
          </button>
          {!mine && <button className="btn btn-outline btn-xs" onClick={() => setReportFor(open ? null : key)}>Report</button>}
          {(mine || isMod) && <button className="btn btn-outline btn-xs" onClick={() => remove(kind, key)}>Delete</button>}
          {isMod && (
            <button className="btn btn-outline btn-xs" onClick={() => setHidden(kind, key, !item.hidden)}>{item.hidden ? 'Unhide' : 'Hide'}</button>
          )}
          {isMod && kind === 'post' && (
            <button className="btn btn-outline btn-xs" onClick={() => setPinned(!item.pinned)}>{item.pinned ? 'Unpin' : 'Pin'}</button>
          )}
        </div>
        {open && <ReportForm onSubmit={(reason) => sendReport(kind, key, reason)} onCancel={() => setReportFor(null)} />}
      </>
    );
  };

  return (
    <div style={{ maxWidth: 820 }}>
      {back}
      {notice && <div className="success-banner" style={{ marginBottom: 14 }}>{notice}</div>}
      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card" style={{ padding: '22px 24px', borderColor: post.pinned ? '#C8923F' : undefined }}>
        <AuthorLine member={members[post.author_id]} when={timeAgo(post.created_at)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span className="badge">{(CATEGORY_LABELS[post.category] || post.category).toUpperCase()}</span>
          {post.pinned && <span className="badge" style={{ background: '#C8923F', color: '#2E1B10' }}>PINNED</span>}
          {post.hidden && <span className="badge" style={{ background: '#FBEAEA', color: '#8A2C2C' }}>HIDDEN FROM MEMBERS</span>}
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 10, lineHeight: 1.3 }}>{post.title}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.65, color: 'var(--text)', marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.body}</div>
        <AttachmentList items={postFiles} />
        {renderActions('post', post)}
      </div>

      <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--brown)', margin: '28px 0 12px' }}>
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {replies.map((r) => (
          <div key={r.id} className="card" style={{ padding: '16px 20px', opacity: r.hidden ? 0.6 : 1 }}>
            <AuthorLine member={members[r.author_id]} when={timeAgo(r.created_at)} extra={r.hidden ? 'Hidden from members' : ''} />
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.body}</div>
            <AttachmentList items={attachments.filter((a) => a.reply_id === r.id)} />
            {renderActions('reply', r)}
          </div>
        ))}
      </div>

      <form onSubmit={sendReply} className="card" style={{ padding: '18px 20px', marginTop: 18, display: 'grid', gap: 12 }}>
        <textarea className="input-field" rows={3} maxLength={3000} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply" disabled={sending} style={{ resize: 'vertical' }} />
        <FilePicker files={replyFiles} onChange={setReplyFiles} disabled={sending} />
        <div>
          <button className="btn btn-primary" type="submit" disabled={sending || !replyBody.trim()}>{sending ? 'Sending…' : 'Reply'}</button>
        </div>
      </form>
    </div>
  );
}
